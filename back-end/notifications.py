"""In-app notifications + optional email (SMTP via .env)."""
import os
import re
import smtplib
from email.mime.text import MIMEText

# Donor blood type -> request blood types they can satisfy
BLOOD_COMPATIBLE = {
    "+O": ["+O", "+A", "+B", "+AB"],
    "-O": ["+O", "-O", "+A", "-A", "+B", "-B", "+AB", "-AB"],
    "+A": ["+A", "+AB"],
    "-A": ["+A", "-A", "+AB", "-AB"],
    "+B": ["+B", "+AB"],
    "-B": ["+B", "-B", "+AB", "-AB"],
    "+AB": ["+AB"],
    "-AB": ["+AB", "-AB"],
}


def donor_types_for_request(request_blood):
    """Return donor blood types compatible with a request."""
    if not request_blood:
        return []
    return [
        donor_type
        for donor_type, can_give in BLOOD_COMPATIBLE.items()
        if request_blood in can_give
    ]

_EMOJI_RE = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF"
    "\U0001F1E0-\U0001F1FF"
    "\U00002702-\U000027B0"
    "\U000024C2-\U0001F251"
    "]+",
    flags=re.UNICODE,
)


def strip_emojis(text):
    if not text:
        return text
    cleaned = _EMOJI_RE.sub("", str(text))
    return re.sub(r"\s+", " ", cleaned).strip()


def email_enabled():
    return os.getenv("MAIL_ENABLED", "").strip().lower() in ("1", "true", "yes")


def send_email(to_addr, subject, body):
    if not email_enabled() or not to_addr:
        return False
    host = os.getenv("MAIL_HOST", "")
    port = int(os.getenv("MAIL_PORT", "587"))
    user = os.getenv("MAIL_USER", "")
    password = os.getenv("MAIL_PASS", "")
    sender = os.getenv("MAIL_FROM", user)
    if not host or not user or not password:
        print("Email skipped: set MAIL_HOST, MAIL_USER, MAIL_PASS in .env")
        return False
    try:
        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = sender
        msg["To"] = to_addr
        with smtplib.SMTP(host, port) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(msg)
        return True
    except Exception as exc:
        print("Email failed:", exc)
        return False


def notify_user(cur, user_id, message, subject="إشعار من وصل"):
    """Save notification in DB and send email when MAIL_ENABLED=true."""
    message = strip_emojis(message)
    cur.execute(
        "INSERT INTO notifications (user_id, message) VALUES (%s, %s)",
        (user_id, message),
    )
    cur.execute("SELECT email FROM users WHERE id=%s", (user_id,))
    row = cur.fetchone()
    if not row:
        return
    email = row["email"] if isinstance(row, dict) else row[0]
    if email:
        send_email(email, subject, message)


def _donor_already_notified(cur, user_id, request_id):
    cur.execute(
        "SELECT 1 FROM notifications WHERE user_id=%s AND message LIKE %s LIMIT 1",
        (user_id, f"%#{request_id}%"),
    )
    return cur.fetchone() is not None


def notify_matching_donors(cur, request_id):
    """Notify donors whose blood type and city match an active request."""
    cur.execute(
        """
        SELECT br.blood_type, br.urgency, br.bags_needed, br.bags_received,
               h.name AS hospital_name, h.city
        FROM blood_requests br
        JOIN hospitals h ON br.hospital_id = h.id
        WHERE br.id = %s AND br.status = 'نشط'
        """,
        (request_id,),
    )
    req = cur.fetchone()
    if not req:
        return

    eligible = donor_types_for_request(req["blood_type"])
    if not eligible:
        return

    placeholders = ",".join(["%s"] * len(eligible))
    cur.execute(
        f"""
        SELECT id, name FROM users
        WHERE role = 'donor'
          AND account_status = 'approved'
          AND blood_type IN ({placeholders})
          AND (city IS NULL OR city = '' OR city = %s)
        """,
        (*eligible, req["city"]),
    )
    donors = cur.fetchall()

    urgency = req.get("urgency") or "عادي"
    need = max(0, int(req.get("bags_needed") or 1) - int(req.get("bags_received") or 0))
    hospital = req.get("hospital_name") or "مستشفى"
    city = req.get("city") or ""
    blood = req.get("blood_type") or ""

    if urgency == "عاجل":
        subject = "حالة عاجلة محتاجة متبرع — وصل"
        intro = "حالة عاجلة محتاجة متبرع"
    else:
        subject = "حالة محتاجة متبرع — وصل"
        intro = "حالة جديدة محتاجة متبرع"

    for donor in donors:
        donor_id = donor["id"] if isinstance(donor, dict) else donor[0]
        if _donor_already_notified(cur, donor_id, request_id):
            continue
        message = (
            f"{intro} — فصيلة {blood} في {city} ({hospital}) "
            f"— الاحتياج {need} كيس — طلب #{request_id}. "
            f"سجّل دخولك في وصل لحجز موعد التبرع."
        )
        notify_user(cur, donor_id, message, subject=subject)


def notify_donors_case_closed(cur, request_id, patient_name, skip_user_ids=None):
    """Notify donors who were alerted about this request that it is closed."""
    skip = set(skip_user_ids or [])
    label = (patient_name or "المريض").strip()
    message = f"تم إغلاق حالة {label} — لم يعد الطلب متاحاً للتبرع"
    cur.execute(
        """
        SELECT DISTINCT n.user_id
        FROM notifications n
        JOIN users u ON u.id = n.user_id
        WHERE u.role = 'donor' AND n.message LIKE %s
        """,
        (f"%#{request_id}%",),
    )
    for row in cur.fetchall():
        uid = row["user_id"]
        if uid in skip:
            continue
        notify_user(cur, uid, message, subject="تم إغلاق الحالة — وصل")
