"""In-app notifications + email (Resend API on Railway; SMTP for local dev)."""
import json
import os
import re
import smtplib
import threading
import time
import urllib.error
import urllib.request
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


def _env(name, default=""):
    value = os.getenv(name, default)
    if value is None:
        return default
    return str(value).strip().strip('"').strip("'")


def _on_railway():
    return bool(_env("RAILWAY_ENVIRONMENT") or _env("RAILWAY_SERVICE_NAME"))


def email_enabled():
    if _env("MAIL_ENABLED", "").lower() in ("1", "true", "yes"):
        return True
    return bool(_env("RESEND_API_KEY", ""))


def _smtp_timeout():
    if _on_railway():
        return 3
    try:
        return max(3, int(_env("MAIL_TIMEOUT", "10")))
    except ValueError:
        return 10


def _from_address():
    raw = _env("MAIL_FROM", _env("MAIL_USER", "onboarding@resend.dev"))
    match = re.search(r"<([^>]+)>", raw)
    if match:
        name = raw.split("<")[0].strip().strip('"') or "Wasl"
        return f"{name} <{match.group(1)}>"
    if "@" in raw:
        return f"Wasl <{raw}>"
    return "Wasl <onboarding@resend.dev>"


def _send_via_resend(to_addr, subject, body, retries=3):
    api_key = _env("RESEND_API_KEY", "")
    if not api_key:
        return False
    payload = json.dumps({
        "from": _from_address(),
        "to": [to_addr],
        "subject": subject,
        "text": body,
    }).encode("utf-8")
    for attempt in range(retries):
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "wasl-blood-donation/1.0",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                print(f"Resend sent to {to_addr} (HTTP {resp.status})", flush=True)
                return True
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            if exc.code == 429 and attempt < retries - 1:
                wait = 0.6 * (attempt + 1)
                print(f"Resend rate limit {to_addr}, retry in {wait}s", flush=True)
                time.sleep(wait)
                continue
            print(f"Resend failed {to_addr}: HTTP {exc.code} {detail}", flush=True)
            return False
        except Exception as exc:
            print(f"Resend failed {to_addr}: {exc}", flush=True)
            return False
    return False


def _build_message(to_addr, subject, body):
    sender = _env("MAIL_FROM", _env("MAIL_USER", ""))
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to_addr
    return msg


def _deliver_smtp(msg, host, port, user, password):
    timeout = _smtp_timeout()
    use_ssl = _env("MAIL_USE_SSL", "").lower() in ("1", "true", "yes")
    if use_ssl or port == 465:
        with smtplib.SMTP_SSL(host, port or 465, timeout=timeout) as server:
            server.login(user, password)
            server.send_message(msg)
        return
    with smtplib.SMTP(host, port, timeout=timeout) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(user, password)
        server.send_message(msg)


def _send_via_smtp(to_addr, subject, body):
    host = _env("MAIL_HOST", "")
    port = int(_env("MAIL_PORT", "587") or "587")
    user = _env("MAIL_USER", "")
    password = _env("MAIL_PASS", "").replace(" ", "")
    if not host or not user or not password:
        print("SMTP skipped: set MAIL_HOST, MAIL_USER, MAIL_PASS", flush=True)
        return False
    msg = _build_message(to_addr, subject, body)
    try:
        _deliver_smtp(msg, host, port, user, password)
        print(f"SMTP sent to {to_addr}", flush=True)
        return True
    except Exception as exc:
        print(f"SMTP failed ({port}) {to_addr}: {exc}", flush=True)
        if port == 587:
            try:
                _deliver_smtp(msg, host, 465, user, password)
                print(f"SMTP sent to {to_addr} (465)", flush=True)
                return True
            except Exception as exc2:
                print(f"SMTP failed (465) {to_addr}: {exc2}", flush=True)
        return False


def _send_email_sync(to_addr, subject, body):
    if not email_enabled() or not to_addr:
        return False
    if _env("RESEND_API_KEY", ""):
        return _send_via_resend(to_addr, subject, body)
    if _on_railway():
        print(
            "Email blocked on Railway: SMTP ports are closed. "
            "Add RESEND_API_KEY — https://resend.com/api-keys",
            flush=True,
        )
        return False
    return _send_via_smtp(to_addr, subject, body)


def send_email_async(to_addr, subject, body):
    if not email_enabled() or not to_addr:
        return False
    threading.Thread(
        target=_send_email_sync,
        args=(to_addr, subject, body),
        daemon=False,
    ).start()
    return True


def flush_urgent_emails(jobs):
    """Send urgent donor emails after DB commit."""
    if not jobs:
        return
    if not email_enabled():
        print(f"flush_urgent_emails: skipped {len(jobs)} (MAIL_ENABLED=false)", flush=True)
        return
    print(f"flush_urgent_emails: sending {len(jobs)} via Resend/SMTP", flush=True)
    use_resend = bool(_env("RESEND_API_KEY", ""))
    for i, (to_addr, subject, body) in enumerate(jobs):
        if use_resend and i > 0:
            time.sleep(0.6)
        _send_email_sync(to_addr, subject, body)


def notify_user(cur, user_id, message, subject="إشعار من وصل", also_email=False):
    """Save notification in DB; optionally send email when enabled."""
    message = strip_emojis(message)
    cur.execute(
        "INSERT INTO notifications (user_id, message) VALUES (%s, %s)",
        (user_id, message),
    )
    if not also_email:
        return
    cur.execute("SELECT email FROM users WHERE id=%s", (user_id,))
    row = cur.fetchone()
    if not row:
        return
    email = row["email"] if isinstance(row, dict) else row[0]
    if email:
        send_email_async(email, subject, message)


def _donor_already_notified(cur, user_id, request_id):
    cur.execute(
        "SELECT 1 FROM notifications WHERE user_id=%s AND message LIKE %s LIMIT 1",
        (user_id, f"%#{request_id}%"),
    )
    return cur.fetchone() is not None


def notify_matching_donors(cur, request_id):
    """In-app notify + return email jobs for compatible donors (same city) when urgent."""
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
        return []

    urgency = req.get("urgency") or "عادي"
    if urgency != "عاجل":
        return []

    eligible = donor_types_for_request(req["blood_type"])
    if not eligible:
        return []

    city = (req.get("city") or "").strip()
    if not city:
        return []

    placeholders = ",".join(["%s"] * len(eligible))
    cur.execute(
        f"""
        SELECT id, name, email FROM users
        WHERE role = 'donor'
          AND account_status = 'approved'
          AND blood_type IN ({placeholders})
          AND city = %s
          AND email IS NOT NULL AND email != ''
        """,
        (*eligible, city),
    )
    donors = cur.fetchall()
    print(
        f"Urgent request #{request_id}: blood={req.get('blood_type')} city={city} "
        f"donors_to_email={len(donors)} resend={bool(_env('RESEND_API_KEY'))} "
        f"railway={_on_railway()}",
        flush=True,
    )

    pending_emails = []
    need = max(0, int(req.get("bags_needed") or 1) - int(req.get("bags_received") or 0))
    hospital = req.get("hospital_name") or "مستشفى"
    blood = req.get("blood_type") or ""
    subject = "حالة عاجلة محتاجة متبرع — وصل"
    intro = "حالة عاجلة محتاجة متبرع"

    for donor in donors:
        donor_id = donor["id"] if isinstance(donor, dict) else donor[0]
        if _donor_already_notified(cur, donor_id, request_id):
            continue
        donor_name = donor.get("name") or "متبرع"
        message = (
            f"{intro} — فصيلة {blood} في {city} ({hospital}) "
            f"— الاحتياج {need} كيس — طلب #{request_id}. "
            f"سجّل دخولك في وصل لحجز موعد التبرع."
        )
        email_body = (
            f"مرحباً {donor_name},\n\n"
            f"حالة عاجلة تحتاج تبرعاً بفصيلة {blood}.\n"
            f"المستشفى: {hospital}\n"
            f"المدينة: {city}\n"
            f"الاحتياج: {need} كيس\n"
            f"رقم الطلب: #{request_id}\n\n"
            f"سجّل دخولك في منصة وصل في أقرب وقت لحجز موعد التبرع.\n"
        )
        notify_user(cur, donor_id, message, subject=subject, also_email=False)
        email = donor.get("email")
        if email:
            pending_emails.append((email, subject, email_body))

    return pending_emails


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
