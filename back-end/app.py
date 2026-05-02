from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from flask_bcrypt import Bcrypt
from datetime import timedelta
import sqlite3
import os

app = Flask(__name__)
CORS(app)
bcrypt = Bcrypt(app)

app.config["JWT_SECRET_KEY"] = "wasl-secret-2024"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)
jwt = JWTManager(app)

DB_PATH = os.path.join(os.path.dirname(__file__), "wasl.db")

# ── DB connection ──────────────────────────────────────────
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db

@app.teardown_appcontext
def close_db(e=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()

# ── Schema ─────────────────────────────────────────────────
SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    phone         TEXT,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role          TEXT NOT NULL CHECK(role IN ('donor','patient','hospital')),
    blood_type    TEXT,
    city          TEXT,
    points        INTEGER DEFAULT 0,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hospitals (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    name    TEXT NOT NULL,
    city    TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS blood_requests (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_name  TEXT NOT NULL,
    user_id       INTEGER REFERENCES users(id),
    hospital_id   INTEGER NOT NULL REFERENCES hospitals(id),
    blood_type    TEXT NOT NULL,
    bags_needed   INTEGER NOT NULL DEFAULT 1,
    bags_received INTEGER DEFAULT 0,
    urgency       TEXT DEFAULT 'عادي',
    status        TEXT DEFAULT 'بانتظار الموافقة',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS donations (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id       INTEGER NOT NULL REFERENCES blood_requests(id),
    donor_id         INTEGER REFERENCES users(id),
    donor_name       TEXT,
    donor_blood_type TEXT,
    appointment_time TEXT,
    status           TEXT DEFAULT 'مؤكد',
    donated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

def init_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.executescript(SCHEMA)

    if db.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
        pw = bcrypt.generate_password_hash("test1234").decode("utf-8")

        # Hospital users + hospitals table
        db.execute("INSERT INTO users (name,email,password_hash,role,city) VALUES (?,?,?,?,?)",
                   ("مستشفى الملك فهد", "hosp1@test.com", pw, "hospital", "الرياض"))
        h1 = db.execute("SELECT last_insert_rowid()").fetchone()[0]

        db.execute("INSERT INTO users (name,email,password_hash,role,city) VALUES (?,?,?,?,?)",
                   ("مستشفى سلمان", "hosp2@test.com", pw, "hospital", "الرياض"))
        h2 = db.execute("SELECT last_insert_rowid()").fetchone()[0]

        db.execute("INSERT INTO users (name,email,password_hash,role,city) VALUES (?,?,?,?,?)",
                   ("مستشفى الرياض", "hosp3@test.com", pw, "hospital", "جدة"))
        h3 = db.execute("SELECT last_insert_rowid()").fetchone()[0]

        db.execute("INSERT INTO hospitals (name,city,user_id) VALUES (?,?,?)", ("مستشفى الملك فهد", "الرياض", h1))
        db.execute("INSERT INTO hospitals (name,city,user_id) VALUES (?,?,?)", ("مستشفى سلمان",    "الرياض", h2))
        db.execute("INSERT INTO hospitals (name,city,user_id) VALUES (?,?,?)", ("مستشفى الرياض",  "جدة",    h3))

        # Donor
        db.execute("INSERT INTO users (name,email,password_hash,role,blood_type,city,points) VALUES (?,?,?,?,?,?,?)",
                   ("أحمد المتبرع", "donor@test.com", pw, "donor", "+O", "الرياض", 240))
        donor_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]

        # Patient relative
        db.execute("INSERT INTO users (name,email,password_hash,role,city) VALUES (?,?,?,?,?)",
                   ("عائلة المريض", "patient@test.com", pw, "patient", "الرياض"))
        patient_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]

        # Sample requests
        db.execute("INSERT INTO blood_requests (patient_name,user_id,hospital_id,blood_type,bags_needed,bags_received,urgency,status) VALUES (?,?,?,?,?,?,?,?)",
                   ("محمد العتيبي", patient_id, 1, "+A", 4, 2, "عاجل", "نشط"))
        db.execute("INSERT INTO blood_requests (patient_name,user_id,hospital_id,blood_type,bags_needed,bags_received,urgency,status) VALUES (?,?,?,?,?,?,?,?)",
                   ("سارة الزهراني", patient_id, 2, "-O", 5, 1, "عادي", "نشط"))
        db.execute("INSERT INTO blood_requests (patient_name,user_id,hospital_id,blood_type,bags_needed,bags_received,urgency,status) VALUES (?,?,?,?,?,?,?,?)",
                   ("خالد الشمري", patient_id, 1, "+O", 3, 0, "عادي", "بانتظار الموافقة"))

        db.commit()
    db.close()

init_db()

# ── REGISTER ───────────────────────────────────────────────
@app.post("/api/register")
def register():
    data = request.json or {}
    db = get_db()

    if db.execute("SELECT id FROM users WHERE email = ?", (data.get("email"),)).fetchone():
        return jsonify({"error": "البريد الإلكتروني مستخدم بالفعل"}), 400

    pw_hash = bcrypt.generate_password_hash(data.get("password", "")).decode("utf-8")
    db.execute(
        "INSERT INTO users (name,email,password_hash,role,blood_type,city,phone) VALUES (?,?,?,?,?,?,?)",
        (data.get("name"), data.get("email"), pw_hash,
         data.get("role", "donor"), data.get("blood_type"),
         data.get("city", ""), data.get("phone", ""))
    )
    db.commit()
    user_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]

    # إذا مستشفى، أضفه لجدول hospitals
    if data.get("role") == "hospital":
        db.execute("INSERT INTO hospitals (name,city,user_id) VALUES (?,?,?)",
                   (data.get("name"), data.get("city", ""), user_id))
        db.commit()

    row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    user = dict(row)
    user.pop("password_hash", None)

    if user["role"] == "hospital":
        hosp = db.execute("SELECT id FROM hospitals WHERE user_id = ?", (user_id,)).fetchone()
        if hosp:
            user["hospital_id"] = hosp["id"]

    token = create_access_token(identity=str(user_id))
    return jsonify({"token": token, "user": user, "user_id": user_id}), 201

# ── LOGIN ──────────────────────────────────────────────────
@app.post("/api/login")
def login():
    data = request.json or {}
    db = get_db()

    row = db.execute("SELECT * FROM users WHERE email = ?", (data.get("email"),)).fetchone()
    if not row:
        return jsonify({"error": "البريد الإلكتروني غير صحيح"}), 401

    if not bcrypt.check_password_hash(row["password_hash"], data.get("password", "")):
        return jsonify({"error": "كلمة المرور غير صحيحة"}), 401

    user = dict(row)
    user.pop("password_hash", None)

    if user["role"] == "hospital":
        hosp = db.execute("SELECT id FROM hospitals WHERE user_id = ?", (user["id"],)).fetchone()
        if hosp:
            user["hospital_id"] = hosp["id"]

    token = create_access_token(identity=str(user["id"]))
    return jsonify({"token": token, "user": user})

# ── PROFILE ────────────────────────────────────────────────
@app.get("/api/profile")
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        return jsonify({"error": "غير موجود"}), 404
    user = dict(row)
    user.pop("password_hash", None)
    user["donation_count"] = db.execute(
        "SELECT COUNT(*) FROM donations WHERE donor_id = ?", (user_id,)
    ).fetchone()[0]
    return jsonify(user)

# ── HOSPITALS ──────────────────────────────────────────────
@app.get("/api/hospitals")
def get_hospitals():
    db = get_db()
    rows = db.execute("SELECT id, name, city FROM hospitals").fetchall()
    return jsonify([dict(r) for r in rows])

# ── GET REQUESTS ───────────────────────────────────────────
@app.get("/api/requests")
@jwt_required(optional=True)
def get_requests():
    user_id = get_jwt_identity()
    db = get_db()

    user = None
    if user_id:
        row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if row:
            user = dict(row)

    if user and user["role"] == "hospital":
        hosp = db.execute("SELECT id FROM hospitals WHERE user_id = ?", (user_id,)).fetchone()
        if not hosp:
            return jsonify([])
        rows = db.execute("""
            SELECT br.*, h.name as hospital_name, h.city
            FROM blood_requests br
            JOIN hospitals h ON br.hospital_id = h.id
            WHERE br.hospital_id = ?
            ORDER BY
              CASE br.status WHEN 'بانتظار الموافقة' THEN 0 WHEN 'نشط' THEN 1 ELSE 2 END,
              CASE br.urgency WHEN 'عاجل' THEN 0 ELSE 1 END,
              br.created_at DESC
        """, (hosp["id"],)).fetchall()

    elif user and user["role"] == "patient":
        rows = db.execute("""
            SELECT br.*, h.name as hospital_name, h.city
            FROM blood_requests br
            JOIN hospitals h ON br.hospital_id = h.id
            WHERE br.user_id = ?
            ORDER BY br.created_at DESC
        """, (user_id,)).fetchall()

    else:
        blood_type = request.args.get("blood_type")
        query = """
            SELECT br.*, h.name as hospital_name, h.city
            FROM blood_requests br
            JOIN hospitals h ON br.hospital_id = h.id
            WHERE br.status = 'نشط'
        """
        params = []
        if blood_type and blood_type != "الكل":
            query += " AND br.blood_type = ?"
            params.append(blood_type)
        query += " ORDER BY CASE br.urgency WHEN 'عاجل' THEN 0 ELSE 1 END, br.created_at DESC"
        rows = db.execute(query, params).fetchall()

    return jsonify([dict(r) for r in rows])

# ── CREATE REQUEST ─────────────────────────────────────────
@app.post("/api/requests")
@jwt_required()
def create_request():
    user_id = get_jwt_identity()
    data = request.json or {}
    db = get_db()

    db.execute("""
        INSERT INTO blood_requests (patient_name,user_id,hospital_id,blood_type,bags_needed,urgency,status)
        VALUES (?,?,?,?,?,'عادي','بانتظار الموافقة')
    """, (
        data.get("patient_name", "مريض"),
        user_id,
        data.get("hospital_id", 1),
        data.get("blood_type", "+O"),
        data.get("bags_needed", 1),
    ))
    db.commit()
    req_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]
    return jsonify({"message": "تم إرسال الطلب — بانتظار موافقة المستشفى ✅", "id": req_id}), 201

# ── APPROVE ────────────────────────────────────────────────
@app.post("/api/requests/<int:req_id>/approve")
@jwt_required()
def approve_request(req_id):
    user_id = get_jwt_identity()
    db = get_db()
    hosp = db.execute("SELECT id FROM hospitals WHERE user_id = ?", (user_id,)).fetchone()
    if not hosp:
        return jsonify({"error": "غير مصرح"}), 403
    req = db.execute("SELECT * FROM blood_requests WHERE id = ? AND hospital_id = ?",
                     (req_id, hosp["id"])).fetchone()
    if not req:
        return jsonify({"error": "الطلب غير موجود"}), 404
    db.execute("UPDATE blood_requests SET status = 'نشط' WHERE id = ?", (req_id,))
    db.commit()
    return jsonify({"message": "تم قبول الطلب وأصبح مرئياً للمتبرعين ✅"})

# ── MARK URGENT ────────────────────────────────────────────
@app.post("/api/requests/<int:req_id>/mark_urgent")
@jwt_required()
def mark_urgent(req_id):
    user_id = get_jwt_identity()
    data = request.json or {}
    db = get_db()
    hosp = db.execute("SELECT id FROM hospitals WHERE user_id = ?", (user_id,)).fetchone()
    if not hosp:
        return jsonify({"error": "غير مصرح"}), 403
    new_urgency = data.get("urgency", "عاجل")
    db.execute("UPDATE blood_requests SET urgency = ? WHERE id = ? AND hospital_id = ?",
               (new_urgency, req_id, hosp["id"]))
    db.commit()
    return jsonify({"message": f"تم تغيير مستوى الطلب إلى {new_urgency}"})

# ── DONATE ─────────────────────────────────────────────────
@app.post("/api/requests/<int:req_id>/donate")
@jwt_required()
def donate(req_id):
    user_id = get_jwt_identity()
    data = request.json or {}
    db = get_db()

    req = db.execute("SELECT * FROM blood_requests WHERE id = ? AND status = 'نشط'",
                     (req_id,)).fetchone()
    if not req:
        return jsonify({"error": "الطلب غير متاح"}), 400

    donor = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    appointment_time = data.get("appointment_time")

    db.execute("""
        INSERT INTO donations (request_id,donor_id,donor_name,donor_blood_type,appointment_time,status)
        VALUES (?,?,?,?,?,'مؤكد')
    """, (req_id, user_id,
          donor["name"] if donor else "",
          donor["blood_type"] if donor else "",
          appointment_time))

    new_received = min(req["bags_received"] + 1, req["bags_needed"])
    new_status = "مكتمل" if new_received >= req["bags_needed"] else "نشط"
    db.execute("UPDATE blood_requests SET bags_received = ?, status = ? WHERE id = ?",
               (new_received, new_status, req_id))
    db.execute("UPDATE users SET points = points + 20 WHERE id = ?", (user_id,))
    db.commit()
    return jsonify({"message": "جُزيت خيراً! تم تسجيل تبرعك ✅ (+20 نقطة)"})

# ── COMPLETE / REOPEN ──────────────────────────────────────
@app.post("/api/requests/<int:req_id>/complete")
@jwt_required()
def complete_request(req_id):
    db = get_db()
    db.execute("UPDATE blood_requests SET status = 'مكتمل' WHERE id = ?", (req_id,))
    db.commit()
    return jsonify({"message": "تم إغلاق الطلب ✅"})

@app.post("/api/requests/<int:req_id>/reopen")
@jwt_required()
def reopen_request(req_id):
    db = get_db()
    db.execute("UPDATE blood_requests SET status = 'نشط' WHERE id = ?", (req_id,))
    db.commit()
    return jsonify({"message": "تم إعادة فتح الطلب ✅"})

# ── DASHBOARD ──────────────────────────────────────────────
@app.get("/api/dashboard")
@jwt_required()
def dashboard():
    user_id = get_jwt_identity()
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        return jsonify({}), 404
    user = dict(row)
    role = user["role"]

    if role == "donor":
        donations = db.execute("SELECT COUNT(*) FROM donations WHERE donor_id = ?", (user_id,)).fetchone()[0]
        active = db.execute("SELECT COUNT(*) FROM blood_requests WHERE status = 'نشط'").fetchone()[0]
        return jsonify({"donations": donations, "points": user["points"], "active_requests": active})

    elif role == "hospital":
        hosp = db.execute("SELECT id FROM hospitals WHERE user_id = ?", (user_id,)).fetchone()
        if not hosp:
            return jsonify({"active_requests": 0, "pending_requests": 0, "completed_requests": 0, "donations": 0})
        hid = hosp["id"]
        active   = db.execute("SELECT COUNT(*) FROM blood_requests WHERE hospital_id=? AND status='نشط'", (hid,)).fetchone()[0]
        pending  = db.execute("SELECT COUNT(*) FROM blood_requests WHERE hospital_id=? AND status='بانتظار الموافقة'", (hid,)).fetchone()[0]
        completed= db.execute("SELECT COUNT(*) FROM blood_requests WHERE hospital_id=? AND status='مكتمل'", (hid,)).fetchone()[0]
        donations= db.execute("""
            SELECT COUNT(*) FROM donations d
            JOIN blood_requests br ON d.request_id = br.id
            WHERE br.hospital_id = ?
        """, (hid,)).fetchone()[0]
        return jsonify({"active_requests": active, "pending_requests": pending,
                        "completed_requests": completed, "donations": donations})

    else:  # patient
        total   = db.execute("SELECT COUNT(*) FROM blood_requests WHERE user_id=?", (user_id,)).fetchone()[0]
        pending = db.execute("SELECT COUNT(*) FROM blood_requests WHERE user_id=? AND status='بانتظار الموافقة'", (user_id,)).fetchone()[0]
        active  = db.execute("SELECT COUNT(*) FROM blood_requests WHERE user_id=? AND status='نشط'", (user_id,)).fetchone()[0]
        return jsonify({"total_requests": total, "pending_requests": pending, "active_requests": active})

# ── EMERGENCY ALERTS ───────────────────────────────────────
@app.get("/api/emergency_alerts")
@jwt_required()
def emergency_alerts():
    user_id = get_jwt_identity()
    db = get_db()
    row = db.execute("SELECT blood_type FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row or not row["blood_type"]:
        return jsonify([])
    rows = db.execute("""
        SELECT br.id, br.blood_type, br.bags_needed, br.bags_received, h.name as hospital_name, h.city
        FROM blood_requests br
        JOIN hospitals h ON br.hospital_id = h.id
        WHERE br.status = 'نشط' AND br.urgency = 'عاجل' AND br.blood_type = ?
        ORDER BY br.created_at DESC
        LIMIT 3
    """, (row["blood_type"],)).fetchall()
    return jsonify([dict(r) for r in rows])

if __name__ == "__main__":
    app.run(debug=True)
