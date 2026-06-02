from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
import mysql.connector
import os
from datetime import timedelta
from pathlib import Path
from notifications import notify_user, notify_matching_donors, notify_donors_case_closed, strip_emojis


def _load_env_file():
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_env_file()

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)
CORS(app, origins=["https://profound-motivation-production-73bc.up.railway.app"])
app.config["JWT_SECRET_KEY"] = "wasl-secret-2026"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

_DB_PASS_PLACEHOLDERS = frozenset({
    "",
    "your-mysql-password-here",
    "changeme",
    "password",
})


def _db_password():
    return (os.getenv("DB_PASS") or "").strip()


def db():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=_db_password(),
        database=os.getenv("DB_NAME", "wasl_db"),
        charset='utf8mb4',
        collation='utf8mb4_unicode_ci',
    )


def _ensure_schema():
    """Add account_status column on existing databases (safe to re-run)."""
    try:
        conn = db()
        cur = conn.cursor()
        cur.execute("""
            ALTER TABLE users
            ADD COLUMN account_status ENUM('pending','approved','rejected')
            DEFAULT 'approved' AFTER points
        """)
        conn.commit()
        cur.close()
        conn.close()
    except mysql.connector.Error:
        pass

    try:
        conn = db()
        cur = conn.cursor()
        cur.execute("""
            ALTER TABLE blood_requests
            MODIFY status ENUM('بانتظار التأكيد','نشط','مكتمل','ملغي')
            DEFAULT 'بانتظار التأكيد'
        """)
        conn.commit()
        cur.close()
        conn.close()
    except mysql.connector.Error:
        pass


def _account_status_message(user):
    status = (user or {}).get("account_status") or "approved"
    if status == "pending":
        return "حسابك بانتظار الموافقة — ستصلك إشعار عند التفعيل"
    if status == "rejected":
        return "تم رفض حسابك — تواصل مع الدعم"
    return None


def _user_payload(user):
    return {
        "id": user["id"],
        "name": user["name"],
        "role": user["role"],
        "blood_type": user.get("blood_type"),
        "city": user.get("city"),
        "region": user.get("region"),
        "points": user.get("points", 0),
        "account_status": user.get("account_status") or "approved",
    }


_ADMIN_SEED_EMAIL = "admin@wasl.com"
_ADMIN_SEED_HASH = "$2b$12$9xkFPVE5nZYpYAd2YO/nxuC7bEwFZtwUGSZ/z1mIQImj6xOXc/7i6"


def _ensure_admin_role():
    """Extend role ENUM and seed default admin (admin@wasl.com / admin123)."""
    try:
        conn = db()
        cur = conn.cursor()
        cur.execute("""
            ALTER TABLE users
            MODIFY role ENUM('donor','patient','hospital','admin') NOT NULL
        """)
        conn.commit()
        cur.close()
        conn.close()
    except mysql.connector.Error:
        pass

    try:
        conn = db()
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE role='admin' LIMIT 1")
        if not cur.fetchone():
            cur.execute("""
                INSERT INTO users (name, email, password_hash, role, account_status)
                VALUES ('مشرف وصل', %s, %s, 'admin', 'approved')
            """, (_ADMIN_SEED_EMAIL, _ADMIN_SEED_HASH))
            conn.commit()
        cur.close()
        conn.close()
    except mysql.connector.Error:
        pass


def _admin_forbidden():
    uid = get_jwt_identity()
    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT role FROM users WHERE id=%s", (uid,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row or row.get("role") != "admin":
        return jsonify({"error": "غير مصرح — للمشرف فقط"}), 403
    return None


# ══════════════════════════════
#  AUTH
# ══════════════════════════════

@app.post("/api/register")
def register():
    d = request.json
    for f in ["name","email","password","role"]:
        if not d.get(f):
            return jsonify({"error": f"حقل مطلوب: {f}"}), 400

    if d.get("role") == "admin":
        return jsonify({"error": "لا يمكن التسجيل كمشرف"}), 403

    hashed = bcrypt.generate_password_hash(d["password"]).decode()
    conn = db(); cur = conn.cursor()

    hospital_id = None
    if d["role"] == "hospital":
        cur.execute("""
            INSERT INTO hospitals (name, city, region)
            VALUES (%s, %s, %s)
        """, (d["name"], d.get("city"), d.get("region")))
        hospital_id = cur.lastrowid
        conn.commit()

    account_status = "pending" if d["role"] == "hospital" else "approved"
    try:
        cur.execute("""
            INSERT INTO users (name,email,phone,password_hash,role,blood_type,city,region,hospital_id,account_status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (d["name"], d["email"], d.get("phone"), hashed, d["role"],
              d.get("blood_type"), d.get("city"), d.get("region"), hospital_id, account_status))
        conn.commit()
        uid = cur.lastrowid
    except mysql.connector.IntegrityError:
        return jsonify({"error": "البريد مستخدم مسبقاً"}), 409
    finally:
        cur.close(); conn.close()

    if account_status == "pending":
        return jsonify({
            "message": "تم التسجيل — حساب المستشفى بانتظار الموافقة",
            "account_status": account_status,
        }), 201

    token = create_access_token(identity=str(uid))
    return jsonify({
        "token": token,
        "user": _user_payload({
            "id": uid,
            "name": d["name"],
            "role": d["role"],
            "blood_type": d.get("blood_type"),
            "city": d.get("city"),
            "region": d.get("region"),
            "points": 0,
            "account_status": account_status,
        }),
    }), 201


@app.post("/api/login")
def login():
    d = request.json or {}
    try:
        conn = db()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM users WHERE email=%s", (d.get("email"),))
        user = cur.fetchone()
        cur.close()
        conn.close()
    except mysql.connector.Error:
        return jsonify({"error": "تعذر الاتصال بقاعدة البيانات. تحقق من إعدادات DB في back-end/.env"}), 503

    if not user or not bcrypt.check_password_hash(user["password_hash"], d.get("password", "")):
        return jsonify({"error": "بيانات غير صحيحة"}), 401

    blocked = _account_status_message(user)
    if blocked:
        return jsonify({"error": blocked, "account_status": user.get("account_status")}), 403

    token = create_access_token(identity=str(user["id"]))
    return jsonify({"token": token, "user": _user_payload(user)})

# ══════════════════════════════
#  PROFILE
# ══════════════════════════════

@app.get("/api/profile")
@jwt_required()
def profile():
    uid = get_jwt_identity()
    conn = db(); cur = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT id,name,email,role,blood_type,city,points,account_status FROM users WHERE id=%s",
        (uid,),
    )
    user = cur.fetchone()
    cur.execute("SELECT COUNT(*) AS c FROM donations WHERE donor_id=%s AND status='مؤكد'", (uid,))
    donations = cur.fetchone()["c"]
    cur.close(); conn.close()
    user["donations"] = donations
    return jsonify(user)

# ══════════════════════════════
#  STATS
# ══════════════════════════════

@app.get("/api/stats")
def get_stats():
    conn = db(); cur = conn.cursor(dictionary=True)
    cur.execute("SELECT COUNT(*) AS c FROM users WHERE role='donor'")
    donors = cur.fetchone()["c"]
    cur.execute("SELECT COUNT(*) AS c FROM donations")
    donations = cur.fetchone()["c"]
    cur.execute("SELECT COUNT(*) AS c FROM hospitals")
    hospitals = cur.fetchone()["c"]
    cur.close(); conn.close()
    return jsonify({"donors": donors, "donations": donations, "hospitals": hospitals})

# ══════════════════════════════
#  HOSPITALS
# ══════════════════════════════

def _ensure_user_hospital_row(cur, user_id):
    """Ensure approved hospital user has a hospitals row linked via hospital_id."""
    cur.execute(
        "SELECT id, name, city, region, hospital_id FROM users WHERE id=%s AND role='hospital'",
        (user_id,),
    )
    user = cur.fetchone()
    if not user:
        return None
    if user.get("hospital_id"):
        return user["hospital_id"]
    region = user.get("region") or user.get("city") or ""
    city = user.get("city") or ""
    cur.execute(
        "INSERT INTO hospitals (name, city, region) VALUES (%s, %s, %s)",
        (user["name"], city, region),
    )
    hospital_id = cur.lastrowid
    cur.execute("UPDATE users SET hospital_id=%s WHERE id=%s", (hospital_id, user_id))
    return hospital_id


def _link_approved_hospital_accounts():
    """Backfill hospital_id for older approved hospital accounts."""
    try:
        conn = db()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT id FROM users
            WHERE role='hospital' AND account_status='approved' AND hospital_id IS NULL
        """)
        for row in cur.fetchall():
            _ensure_user_hospital_row(cur, row["id"])
        conn.commit()
        cur.close()
        conn.close()
    except mysql.connector.Error:
        pass


@app.get("/api/hospitals")
def get_hospitals():
    """Legacy catalog — prefer /api/hospitals/approved for patient requests."""
    region = request.args.get("region")
    city = request.args.get("city")
    conn = db(); cur = conn.cursor(dictionary=True)
    if city:
        cur.execute("SELECT * FROM hospitals WHERE city=%s", (city,))
    elif region:
        cur.execute("SELECT * FROM hospitals WHERE region=%s", (region,))
    else:
        cur.execute("SELECT * FROM hospitals")
    rows = cur.fetchall()
    cur.close(); conn.close()
    return jsonify(rows)


@app.get("/api/hospitals/approved")
def get_approved_hospitals():
    """مستشفيات مسجّلة ومعتمدة من المشرف — للقائمة عند قريب المريض."""
    city = request.args.get("city")
    conn = db()
    cur = conn.cursor(dictionary=True)
    _link_approved_hospital_accounts()
    sql = """
        SELECT u.hospital_id AS id, u.name, u.city, u.region
        FROM users u
        WHERE u.role = 'hospital'
          AND u.account_status = 'approved'
          AND u.hospital_id IS NOT NULL
    """
    vals = []
    if city:
        sql += " AND u.city = %s"
        vals.append(city)
    sql += " ORDER BY u.name ASC"
    cur.execute(sql, tuple(vals))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(rows)

# ══════════════════════════════
#  BLOOD REQUESTS
# ══════════════════════════════

@app.get("/api/requests")
def get_requests():
    blood_type = request.args.get("blood_type")
    search = request.args.get("search")
    city = request.args.get("city")
    conn = db(); cur = conn.cursor(dictionary=True)
    sql = """
        SELECT br.*, h.name AS hospital_name, h.city
        FROM blood_requests br
        JOIN hospitals h ON br.hospital_id = h.id
        WHERE br.status = 'نشط'
    """
    vals = []
    if blood_type and blood_type != "الكل":
        sql += " AND br.blood_type = %s"
        vals.append(blood_type)
    if search:
        # لا نبحث باسم المريض — خصوصية
        sql += " AND (h.name LIKE %s OR h.city LIKE %s)"
        q = f"%{search}%"
        vals.extend([q, q])
    if city:
        sql += " AND h.city = %s"
        vals.append(city)
    sql += " ORDER BY br.urgency DESC, br.created_at DESC"
    cur.execute(sql, vals)
    rows = cur.fetchall()
    for r in rows:
        r["created_at"] = str(r["created_at"])
        r.pop("patient_name", None)
    cur.close(); conn.close()
    return jsonify(rows)


@app.get("/api/my/requests")
@jwt_required()
def my_requests():
    uid = get_jwt_identity()
    conn = db(); cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT br.*, h.name AS hospital_name, h.city
        FROM blood_requests br
        JOIN hospitals h ON br.hospital_id = h.id
        WHERE br.user_id = %s AND br.status != 'ملغي'
        ORDER BY br.created_at DESC
    """, (uid,))
    rows = cur.fetchall()
    for r in rows:
        r["created_at"] = str(r["created_at"])
    cur.close(); conn.close()
    return jsonify(rows)


@app.post("/api/requests")
@jwt_required()
def create_request():
    uid = get_jwt_identity()
    d = request.json
    for f in ["patient_name","hospital_id","blood_type"]:
        if not d.get(f):
            return jsonify({"error": f"حقل مطلوب: {f}"}), 400

    hospital_id = int(d["hospital_id"])
    conn = db(); cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT u.id, u.name FROM users u
        WHERE u.role = 'hospital' AND u.account_status = 'approved'
          AND u.hospital_id = %s
    """, (hospital_id,))
    hospital_users = cur.fetchall()
    if not hospital_users:
        cur.close()
        conn.close()
        return jsonify({
            "error": "المستشفى غير متاح — اختر مستشفى معتمد من القائمة",
        }), 400

    cur.execute("""
        INSERT INTO blood_requests
        (user_id,patient_name,hospital_id,blood_type,bags_needed,urgency,status)
        VALUES (%s,%s,%s,%s,1,'عادي','بانتظار التأكيد')
    """, (uid, d["patient_name"], hospital_id, d["blood_type"]))
    rid = cur.lastrowid
    notify_user(
        cur,
        uid,
        "تم إرسال طلبك للمستشفى — بانتظار تأكيد الحالة (عاجل/عادي وعدد الأكياس)",
    )
    for hosp in hospital_users:
        notify_user(
            cur,
            hosp["id"],
            f"طلب تبرع جديد — فصيلة {d['blood_type']} بانتظار تأكيدكم",
        )
    conn.commit()
    cur.close(); conn.close()
    return jsonify({"message": "تم إنشاء الطلب، بانتظار تأكيد المستشفى", "id": rid}), 201

# ══════════════════════════════
#  HOSPITAL — GET ALL REQUESTS
# ══════════════════════════════

def _resolve_hospital_id(uid):
    """Return hospital_id for logged-in hospital user; backfill if missing."""
    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT id, hospital_id FROM users WHERE id=%s AND role='hospital'",
        (uid,),
    )
    user = cur.fetchone()
    if not user:
        cur.close()
        conn.close()
        return None
    if not user.get("hospital_id"):
        _ensure_user_hospital_row(cur, user["id"])
        conn.commit()
        cur.execute("SELECT hospital_id FROM users WHERE id=%s", (uid,))
        user = cur.fetchone()
    hid = user.get("hospital_id") if user else None
    cur.close()
    conn.close()
    return hid


def _hospital_scope_sql(uid):
    """طلبات ومواعيد هذا المستشفى فقط."""
    hid = _resolve_hospital_id(uid)
    if not hid:
        return None, None
    return "br.hospital_id = %s", [hid]


@app.get("/api/hospital/requests")
@jwt_required()
def hospital_requests():
    uid = get_jwt_identity()
    scope, vals = _hospital_scope_sql(uid)
    if scope is None:
        return jsonify({"error": "غير مصرح"}), 403

    conn = db(); cur = conn.cursor(dictionary=True)
    cur.execute(f"""
        SELECT br.*, h.name AS hospital_name, h.city,
               u.name AS requester_name
        FROM blood_requests br
        JOIN hospitals h ON br.hospital_id = h.id
        JOIN users u ON br.user_id = u.id
        WHERE {scope} AND br.status != 'ملغي'
        ORDER BY
          CASE br.status WHEN 'بانتظار التأكيد' THEN 0 ELSE 1 END,
          br.urgency DESC,
          br.created_at DESC
    """, tuple(vals))
    rows = cur.fetchall()
    for r in rows:
        r["created_at"] = str(r["created_at"])
    cur.close(); conn.close()
    return jsonify(rows)


# ══════════════════════════════
#  HOSPITAL — GET APPOINTMENTS
# ══════════════════════════════

@app.get("/api/hospital/appointments")
@jwt_required()
def hospital_appointments():
    uid = get_jwt_identity()
    scope, vals = _hospital_scope_sql(uid)
    if scope is None:
        return jsonify({"error": "غير مصرح"}), 403

    conn = db(); cur = conn.cursor(dictionary=True)
    cur.execute(f"""
        SELECT d.id, d.appointment_date, d.appointment_time, d.status,
               u.name AS donor_name, u.blood_type,
               br.patient_name, br.blood_type AS request_blood_type,
               br.id AS request_id, h.name AS hospital_name, h.city
        FROM donations d
        JOIN users u ON d.donor_id = u.id
        JOIN blood_requests br ON d.request_id = br.id
        JOIN hospitals h ON br.hospital_id = h.id
        WHERE {scope} AND d.status = 'معلق'
        ORDER BY d.appointment_date ASC, d.appointment_time ASC
    """, tuple(vals))
    rows = cur.fetchall()
    for r in rows:
        if r.get("appointment_date"):
            r["appointment_date"] = str(r["appointment_date"])
    cur.close(); conn.close()
    return jsonify(rows)


# ══════════════════════════════
#  HOSPITAL — CONFIRM DONATION
# ══════════════════════════════

@app.post("/api/donations/<int:did>/confirm")
@jwt_required()
def confirm_donation(did):
    uid = get_jwt_identity()
    scope, vals = _hospital_scope_sql(uid)
    if scope is None:
        return jsonify({"error": "غير مصرح"}), 403

    conn = db(); cur = conn.cursor(dictionary=True)
    cur.execute(f"""
        SELECT d.*, br.user_id AS patient_user_id, br.hospital_id
        FROM donations d
        JOIN blood_requests br ON d.request_id = br.id
        JOIN hospitals h ON br.hospital_id = h.id
        WHERE d.id=%s AND d.status='معلق' AND {scope}
    """, (did, *vals))
    donation = cur.fetchone()
    if not donation:
        cur.close(); conn.close()
        return jsonify({"error": "الحجز غير موجود أو تم تأكيده"}), 404

    cur.execute("UPDATE donations SET status='مؤكد' WHERE id=%s", (did,))
    cur.execute("""
        UPDATE blood_requests SET bags_received = bags_received + 1 WHERE id=%s
    """, (donation["request_id"],))

    cur.execute("""
        SELECT bags_received, bags_needed, user_id FROM blood_requests WHERE id=%s
    """, (donation["request_id"],))
    bags = cur.fetchone()
    if bags and bags["bags_received"] >= bags["bags_needed"]:
        cur.execute("UPDATE blood_requests SET status='مكتمل' WHERE id=%s", (donation["request_id"],))
        notify_user(cur, bags["user_id"], "اكتملت أكياس الدم المطلوبة لطلبك")

    notify_user(cur, donation["donor_id"], "تم التبرع — شكراً لك على إنقاذ حياة")

    conn.commit(); cur.close(); conn.close()
    return jsonify({"message": "تم التبرع"})


@app.post("/api/requests/<int:rid>/confirm")
@jwt_required()
def confirm_request(rid):
    uid = get_jwt_identity()
    scope, vals = _hospital_scope_sql(uid)
    if scope is None:
        return jsonify({"error": "غير مصرح"}), 403

    d = request.json or {}
    urgency = d.get("urgency", "عادي")
    if urgency not in ("عاجل", "عادي"):
        urgency = "عادي"
    bags_needed = max(1, min(10, int(d.get("bags_needed") or 1)))

    conn = db(); cur = conn.cursor(dictionary=True)
    cur.execute(f"""
        SELECT br.user_id FROM blood_requests br
        JOIN hospitals h ON br.hospital_id = h.id
        WHERE br.id=%s AND br.status='بانتظار التأكيد' AND {scope}
    """, (rid, *vals))
    req = cur.fetchone()
    if not req:
        cur.close(); conn.close()
        return jsonify({"error": "الطلب غير موجود أو تم تأكيده مسبقاً"}), 404

    cur.execute("""
        UPDATE blood_requests
        SET status='نشط', urgency=%s, bags_needed=%s, bags_received=0
        WHERE id=%s
    """, (urgency, bags_needed, rid))

    if req:
        label = "عاجلة" if urgency == "عاجل" else "عادية"
        notify_user(
            cur,
            req["user_id"],
            f"تم تأكيد طلبك كحالة {label} — بانتظار المتبرعين",
        )

    notify_matching_donors(cur, rid)
    conn.commit(); cur.close(); conn.close()
    return jsonify({"message": "تم تأكيد الحالة"})


@app.post("/api/requests/<int:rid>/close")
@jwt_required()
def close_request(rid):
    uid = get_jwt_identity()
    scope, vals = _hospital_scope_sql(uid)
    if scope is None:
        return jsonify({"error": "غير مصرح"}), 403

    conn = db(); cur = conn.cursor(dictionary=True)
    cur.execute(f"""
        SELECT br.user_id, br.status, br.patient_name
        FROM blood_requests br
        JOIN hospitals h ON br.hospital_id = h.id
        WHERE br.id=%s AND {scope} AND br.status != 'ملغي'
    """, (rid, *vals))
    req = cur.fetchone()
    if not req:
        cur.close(); conn.close()
        return jsonify({"error": "الحالة غير موجودة أو أُغلقت مسبقاً"}), 404
    if req["status"] == "بانتظار التأكيد":
        cur.close(); conn.close()
        return jsonify({"error": "أكّد الحالة أولاً قبل الإغلاق"}), 400

    patient_name = (req.get("patient_name") or "المريض").strip()
    close_msg = f"تم إغلاق حالة {patient_name}"

    cur.execute("""
        SELECT donor_id FROM donations
        WHERE request_id=%s AND status='معلق'
    """, (rid,))
    pending_donors = cur.fetchall()

    cur.execute("UPDATE blood_requests SET status='ملغي' WHERE id=%s", (rid,))
    cur.execute("""
        UPDATE donations SET status='ملغي'
        WHERE request_id=%s AND status='معلق'
    """, (rid,))

    notified_donors = set()
    donor_close_msg = f"{close_msg} — لم يعد الطلب متاحاً للتبرع"
    for row in pending_donors:
        notified_donors.add(row["donor_id"])
        notify_user(cur, row["donor_id"], donor_close_msg, subject="تم إغلاق الحالة — وصل")

    notify_user(cur, req["user_id"], close_msg, subject="تم إغلاق الحالة — وصل")
    notify_donors_case_closed(cur, rid, patient_name, skip_user_ids=notified_donors)

    conn.commit(); cur.close(); conn.close()
    return jsonify({"message": close_msg})

# ══════════════════════════════
#  DONATIONS (DONOR)
# ══════════════════════════════

@app.post("/api/requests/<int:rid>/donate")
@jwt_required()
def donate(rid):
    uid = get_jwt_identity()
    d = request.json or {}
    conn = db(); cur = conn.cursor(dictionary=True)

    cur.execute("SELECT * FROM users WHERE id=%s", (uid,))
    donor = cur.fetchone()
    blocked = _account_status_message(donor)
    if blocked:
        cur.close()
        conn.close()
        return jsonify({"error": blocked}), 403

    cur.execute("SELECT * FROM blood_requests WHERE id=%s AND status='نشط'", (rid,))
    req = cur.fetchone()
    if not req:
        cur.close(); conn.close()
        return jsonify({"error": "الطلب غير متاح"}), 400

    COMPATIBLE = {
        "+O":  ["+O", "+A", "+B", "+AB"],
        "-O":  ["+O", "-O", "+A", "-A", "+B", "-B", "+AB", "-AB"],
        "+A":  ["+A", "+AB"],
        "-A":  ["+A", "-A", "+AB", "-AB"],
        "+B":  ["+B", "+AB"],
        "-B":  ["+B", "-B", "+AB", "-AB"],
        "+AB": ["+AB"],
        "-AB": ["+AB", "-AB"],
    }

    donor_blood = donor.get("blood_type")
    request_blood = req.get("blood_type")
    compatible_with = COMPATIBLE.get(donor_blood, [])

    if request_blood not in compatible_with:
        cur.close(); conn.close()
        return jsonify({
            "error": f"فصيلة دمك ({donor_blood}) غير متوافقة مع فصيلة الطلب ({request_blood})"
        }), 400

    cur.execute("""
        SELECT id FROM donations WHERE request_id=%s AND donor_id=%s
    """, (rid, uid))
    if cur.fetchone():
        cur.close(); conn.close()
        return jsonify({
            "error": "يمكنك التبرع مرة واحدة فقط لكل طلب — لقد حجزت لهذا الطلب مسبقاً",
        }), 400

    cur.execute("""
        INSERT INTO donations (request_id, donor_id, appointment_date, appointment_time)
        VALUES (%s,%s,%s,%s)
    """, (rid, uid, d.get("date"), d.get("time")))

    cur.execute("UPDATE users SET points = points+20 WHERE id=%s", (uid,))

    donor_name = donor["name"]
    notify_user(
        cur,
        req["user_id"],
        f"{donor_name} حجز موعد تبرع لطلبك — بانتظار تأكيد المستشفى",
        subject="موعد تبرع جديد — وصل",
    )
    cur.execute("""
        SELECT id FROM users
        WHERE role='hospital' AND hospital_id=%s AND account_status='approved'
    """, (req["hospital_id"],))
    for hosp in cur.fetchall():
        notify_user(
            cur,
            hosp["id"],
            f"متبرع حجز موعد تبرع — فصيلة {req['blood_type']} بانتظار تأكيدكم",
        )
    notify_user(
        cur,
        uid,
        "تم حجز موعد التبرع — بانتظار تأكيد المستشفى",
    )

    conn.commit(); cur.close(); conn.close()
    return jsonify({"message": "تم حجز موعد التبرع — +20 نقطة"})

# ══════════════════════════════
#  DONOR HISTORY
# ══════════════════════════════

@app.get("/api/donations/history")
@jwt_required()
def donation_history():
    uid = get_jwt_identity()
    conn = db(); cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT d.id, d.appointment_date, d.appointment_time, d.status,
               d.created_at, br.blood_type,
               h.name AS hospital_name, h.city
        FROM donations d
        JOIN blood_requests br ON d.request_id = br.id
        JOIN hospitals h ON br.hospital_id = h.id
        WHERE d.donor_id = %s
        ORDER BY d.created_at DESC
    """, (uid,))
    rows = cur.fetchall()
    for r in rows:
        r["created_at"] = str(r["created_at"])
        if r.get("appointment_date"):
            r["appointment_date"] = str(r["appointment_date"])
    cur.close(); conn.close()
    return jsonify(rows)

# ══════════════════════════════
#  NOTIFICATIONS
# ══════════════════════════════

@app.get("/api/notifications")
@jwt_required()
def get_notifications():
    uid = get_jwt_identity()
    conn = db(); cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT * FROM notifications WHERE user_id=%s
        ORDER BY created_at DESC LIMIT 20
    """, (uid,))
    rows = cur.fetchall()
    for r in rows:
        r["created_at"] = str(r["created_at"])
        if r.get("message"):
            r["message"] = strip_emojis(r["message"])
    cur.close(); conn.close()
    return jsonify(rows)


@app.post("/api/notifications/read")
@jwt_required()
def mark_notifications_read():
    uid = get_jwt_identity()
    conn = db(); cur = conn.cursor()
    cur.execute("UPDATE notifications SET is_read=TRUE WHERE user_id=%s", (uid,))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"message": "تم"})


@app.get("/api/users/pending")
@jwt_required()
def pending_hospital_users():
    """قائمة حسابات المستشفيات بانتظار الاعتماد (للمشرف)."""
    denied = _admin_forbidden()
    if denied:
        return denied
    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT id, name, email, city, created_at
        FROM users
        WHERE role='hospital' AND account_status='pending'
        ORDER BY created_at DESC
    """)
    rows = cur.fetchall()
    for r in rows:
        r["created_at"] = str(r["created_at"])
    cur.close()
    conn.close()
    return jsonify(rows)


@app.post("/api/users/<int:uid>/approve")
@jwt_required()
def approve_user(uid):
    """Admin: approve pending hospital account."""
    denied = _admin_forbidden()
    if denied:
        return denied
    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT id, email, account_status, role FROM users WHERE id=%s AND role='hospital'",
        (uid,),
    )
    target = cur.fetchone()
    if not target:
        cur.close()
        conn.close()
        return jsonify({"error": "المستخدم غير موجود"}), 404
    _ensure_user_hospital_row(cur, uid)
    cur.execute(
        "UPDATE users SET account_status='approved' WHERE id=%s AND role='hospital'",
        (uid,),
    )
    if cur.rowcount == 0:
        cur.close()
        conn.close()
        return jsonify({"error": "المستخدم غير موجود"}), 404
    notify_user(cur, uid, "تم اعتماد حسابك — يمكنك تسجيل الدخول الآن", subject="تم اعتماد حسابك — وصل")
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"message": "تم التاكيد"})


@app.post("/api/users/<int:uid>/reject")
@jwt_required()
def reject_user(uid):
    denied = _admin_forbidden()
    if denied:
        return denied
    conn = db()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT id FROM users WHERE id=%s AND role='hospital'", (uid,))
    if not cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({"error": "المستخدم غير موجود"}), 404
    cur.execute("UPDATE users SET account_status='rejected' WHERE id=%s", (uid,))
    notify_user(cur, uid, "تم رفض طلب تسجيل المستشفى — تواصل مع الدعم", subject="حالة الحساب — وصل")
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"message": "تم الإلغاء"})


if __name__ == "__main__":
    _ensure_schema()
    _ensure_admin_role()
    _link_approved_hospital_accounts()
    try:
        _conn = db()
        _conn.close()
        print("Database: connected to", os.getenv("DB_NAME", "wasl_db"))
    except mysql.connector.Error as e:
        print("Database: FAILED —", e)
        print("Fix DB_PASS in back-end/.env (see .env.example)")
    app.run(debug=True)