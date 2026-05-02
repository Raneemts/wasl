from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
import mysql.connector
from datetime import timedelta

app = Flask(__name__)
CORS(app)
app.config["JWT_SECRET_KEY"] = "wasl-secret-2026"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

def db():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="NewStrongPass123!",      # ← غير هذا لكلمة مرورك
        database="wasl_db"
    )

# ══════════════════════════════
#  AUTH
# ══════════════════════════════

@app.post("/api/register")
def register():
    d = request.json
    for f in ["name","email","password","role"]:
        if not d.get(f):
            return jsonify({"error": f"حقل مطلوب: {f}"}), 400

    hashed = bcrypt.generate_password_hash(d["password"]).decode()
    conn = db(); cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO users (name,email,password_hash,role,blood_type,city)
            VALUES (%s,%s,%s,%s,%s,%s)
        """, (d["name"], d["email"], hashed, d["role"],
              d.get("blood_type"), d.get("city")))
        conn.commit()
        uid = cur.lastrowid
    except mysql.connector.IntegrityError:
        return jsonify({"error": "البريد مستخدم مسبقاً"}), 409
    finally:
        cur.close(); conn.close()

    token = create_access_token(identity=str(uid))
    return jsonify({
        "token": token,
        "user": {"id": uid, "name": d["name"], "role": d["role"],
                 "blood_type": d.get("blood_type"), "city": d.get("city"), "points": 0}
    }), 201


@app.post("/api/login")
def login():
    d = request.json
    conn = db(); cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM users WHERE email=%s", (d.get("email"),))
    user = cur.fetchone()
    cur.close(); conn.close()

    if not user or not bcrypt.check_password_hash(user["password_hash"], d.get("password","")):
        return jsonify({"error": "بيانات غير صحيحة"}), 401

    token = create_access_token(identity=str(user["id"]))
    return jsonify({
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "role": user["role"],
                 "blood_type": user["blood_type"], "city": user["city"], "points": user["points"]}
    })

# ══════════════════════════════
#  PROFILE
# ══════════════════════════════

@app.get("/api/profile")
@jwt_required()
def profile():
    uid = get_jwt_identity()
    conn = db(); cur = conn.cursor(dictionary=True)
    cur.execute("SELECT id,name,email,role,blood_type,city,points FROM users WHERE id=%s", (uid,))
    user = cur.fetchone()
    cur.execute("SELECT COUNT(*) AS c FROM donations WHERE donor_id=%s AND status='مؤكد'", (uid,))
    donations = cur.fetchone()["c"]
    cur.close(); conn.close()
    user["donations"] = donations
    return jsonify(user)

# ══════════════════════════════
#  HOSPITALS
# ══════════════════════════════

@app.get("/api/hospitals")
def get_hospitals():
    conn = db(); cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM hospitals")
    rows = cur.fetchall()
    cur.close(); conn.close()
    return jsonify(rows)

# ══════════════════════════════
#  BLOOD REQUESTS
# ══════════════════════════════

@app.get("/api/requests")
def get_requests():
    blood_type = request.args.get("blood_type")
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
    sql += " ORDER BY br.urgency DESC, br.created_at DESC"
    cur.execute(sql, vals)
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
    for f in ["patient_name","hospital_id","blood_type","bags_needed"]:
        if not d.get(f):
            return jsonify({"error": f"حقل مطلوب: {f}"}), 400

    conn = db(); cur = conn.cursor()
    cur.execute("""
        INSERT INTO blood_requests
        (user_id,patient_name,hospital_id,blood_type,bags_needed,urgency)
        VALUES (%s,%s,%s,%s,%s,%s)
    """, (uid, d["patient_name"], d["hospital_id"],
          d["blood_type"], d["bags_needed"], d.get("urgency","عادي")))
    conn.commit()
    rid = cur.lastrowid
    cur.close(); conn.close()
    return jsonify({"message": "تم إنشاء الطلب", "id": rid}), 201

# ══════════════════════════════
#  HOSPITAL — GET ALL REQUESTS
# ══════════════════════════════

@app.get("/api/hospital/requests")
@jwt_required()
def hospital_requests():
    conn = db(); cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT br.*, h.name AS hospital_name, h.city,
               u.name AS requester_name
        FROM blood_requests br
        JOIN hospitals h ON br.hospital_id = h.id
        JOIN users u ON br.user_id = u.id
        ORDER BY br.urgency DESC, br.created_at DESC
    """)
    rows = cur.fetchall()
    for r in rows:
        r["created_at"] = str(r["created_at"])
    cur.close(); conn.close()
    return jsonify(rows)


@app.post("/api/requests/<int:rid>/confirm")
@jwt_required()
def confirm_request(rid):
    urgency = request.json.get("urgency", "عادي")
    conn = db(); cur = conn.cursor()
    cur.execute("""
        UPDATE blood_requests SET status='نشط', urgency=%s WHERE id=%s
    """, (urgency, rid))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"message": "تم تأكيد الحالة ✅"})


@app.post("/api/requests/<int:rid>/complete")
@jwt_required()
def complete_request(rid):
    conn = db(); cur = conn.cursor()
    cur.execute("UPDATE blood_requests SET status='مكتمل' WHERE id=%s", (rid,))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"message": "تم إغلاق الحالة ✅"})

# ══════════════════════════════
#  DONATIONS (DONOR)
# ══════════════════════════════

@app.post("/api/requests/<int:rid>/donate")
@jwt_required()
def donate(rid):
    uid = get_jwt_identity()
    d = request.json or {}
    conn = db(); cur = conn.cursor()

    # تحقق إن الطلب نشط
    cur.execute("SELECT * FROM blood_requests WHERE id=%s AND status='نشط'", (rid,))
    if not cur.fetchone():
        return jsonify({"error": "الطلب غير متاح"}), 400

    cur.execute("""
        INSERT INTO donations (request_id, donor_id, appointment_date, appointment_time)
        VALUES (%s,%s,%s,%s)
    """, (rid, uid, d.get("date"), d.get("time")))

    cur.execute("UPDATE blood_requests SET bags_received = bags_received+1 WHERE id=%s", (rid,))
    cur.execute("UPDATE users SET points = points+20 WHERE id=%s", (uid,))

    cur.execute("""
        UPDATE blood_requests SET status='مكتمل'
        WHERE id=%s AND bags_received >= bags_needed
    """, (rid,))

    conn.commit(); cur.close(); conn.close()
    return jsonify({"message": "تم حجز موعد التبرع ✅ +20 نقطة"})


if __name__ == "__main__":
    app.run(debug=True)