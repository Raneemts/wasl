"""In-app notifications + optional email (SMTP via .env)."""
import os
import smtplib
from email.mime.text import MIMEText


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
