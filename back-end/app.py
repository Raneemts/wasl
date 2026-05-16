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

app = Flask(__name__)
CORS(app)
app.config["JWT_SECRET_KEY"] = "wasl-secret-2026"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

def db():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASS", ""),
        database=os.getenv("DB_NAME", "wasl_db"),
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

    # ══ إذا المستخدم مستشفى، أضفه لجدول hospitals تلقائياً ══
    if d["role"] == "hospital":
        cur.execute("""
            INSERT INTO hospitals (name, city, region)
            VALUES (%s, %s, %s)
        """, (d["name"], d.get("city"), d.get("region")))
        conn.commit()

    try:
        cur.execute("""
            INSERT INTO users (name,email,phone,password_hash,role,blood_type,city,region)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        """, (d["name"], d["email"], d.get("phone"), hashed, d["role"],
              d.get("blood_type"), d.get("city"), d.get("region")))
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
                 "blood_type": d.get("blood_type"), "city": d.get("city"),
                 "region": d.get("region"), "points": 0}
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
                 "blood_type": user["blood_type"], "city": user["city"],
                 "region": user["region"], "points": user["points"]}
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

@app.get("/api/hospitals")
def get_hospitals():
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
        sql += " AND (h.name LIKE %s OR h.city LIKE %s OR br.patient_name LIKE %s)"
        q = f"%{search}%"
        vals.extend([q, q, q])
    if city:
        sql += " AND h.city = %s"
        vals.append(city)
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
    for f in ["patient_name","hospital_id","blood_type"]:
        if not d.get(f):
            return jsonify({"error": f"حقل مطلوب: {f}"}), 400

    conn = db(); cur = conn.cursor()
    cur.execute("""
        INSERT INTO blood_requests
        (user_id,patient_name,hospital_id,blood_type,bags_needed,urgency,status)
        VALUES (%s,%s,%s,%s,%s,%s,%s)
    """, (uid, d["patient_name"], d["hospital_id"],
          d["blood_type"], 1, "عادي", "معلق"))
    conn.commit()
    rid = cur.lastrowid
    cur.close(); conn.close()
    return jsonify({"message": "تم إنشاء الطلب، بانتظار تأكيد المستشفى", "id": rid}), 201

# ══════════════════════════════
#  HOSPITAL — GET ALL REQUESTS
# ══════════════════════════════

@app.get("/api/hospital/requests")
@jwt_required()
def hospital_requests():
    uid = get_jwt_identity()
    conn = db(); cur = conn.cursor(dictionary=True)
    cur.execute("SELECT city FROM users WHERE id=%s", (uid,))
    user = cur.fetchone()
    city = user.get("city") if user else None

    if city:
        cur.execute("""
            SELECT br.*, h.name AS hospital_name, h.city,
                   u.name AS requester_name
            FROM blood_requests br
            JOIN hospitals h ON br.hospital_id = h.id
            JOIN users u ON br.user_id = u.id
            WHERE h.city = %s
            ORDER BY br.urgency DESC, br.created_at DESC
        """, (city,))
    else:
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


# ══════════════════════════════
#  HOSPITAL — GET APPOINTMENTS
# ══════════════════════════════

@app.get("/api/hospital/appointments")
@jwt_required()
def hospital_appointments():
    uid = get_jwt_identity()
    conn = db(); cur = conn.cursor(dictionary=True)
    cur.execute("SELECT city FROM users WHERE id=%s", (uid,))
    user = cur.fetchone()
    city = user.get("city") if user else None

    if city:
        cur.execute("""
            SELECT d.id, d.appointment_date, d.appointment_time, d.status,
                   u.name AS donor_name, u.blood_type,
                   br.patient_name, br.id AS request_id,
                   h.name AS hospital_name
            FROM donations d
            JOIN users u ON d.donor_id = u.id
            JOIN blood_requests br ON d.request_id = br.id
            JOIN hospitals h ON br.hospital_id = h.id
            WHERE h.city = %s
            ORDER BY d.appointment_date ASC, d.appointment_time ASC
        """, (city,))
    else:
        cur.execute("""
            SELECT d.id, d.appointment_date, d.appointment_time, d.status,
                   u.name AS donor_name, u.blood_type,
                   br.patient_name, br.id AS request_id,
                   h.name AS hospital_name
            FROM donations d
            JOIN users u ON d.donor_id = u.id
            JOIN blood_requests br ON d.request_id = br.id
            JOIN hospitals h ON br.hospital_id = h.id
            ORDER BY d.appointment_date ASC, d.appointment_time ASC
        """)
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
    conn = db(); cur = conn.cursor(dictionary=True)

    cur.execute("SELECT * FROM donations WHERE id=%s", (did,))
    donation = cur.fetchone()
    if not donation:
        cur.close(); conn.close()
        return jsonify({"error": "الحجز غير موجود"}), 404

    cur.execute("UPDATE donations SET status='مؤكد' WHERE id=%s", (did,))

    cur.execute("SELECT * FROM blood_requests WHERE id=%s", (donation["request_id"],))
    req = cur.fetchone()

    cur.execute("""
        SELECT bags_received, bags_needed FROM blood_requests WHERE id=%s
    """, (donation["request_id"],))
    bags = cur.fetchone()
    if bags and bags["bags_received"] >= bags["bags_needed"]:
        cur.execute("UPDATE blood_requests SET status='مكتمل' WHERE id=%s", (donation["request_id"],))
        if req:
            cur.execute("""
                INSERT INTO notifications (user_id, message)
                VALUES (%s, %s)
            """, (req["user_id"], "🎉 اكتملت أكياس الدم المطلوبة لطلبك!"))

    cur.execute("""
        INSERT INTO notifications (user_id, message)
        VALUES (%s, %s)
    """, (donation["donor_id"], "✅ تم تأكيد تبرعك من قبل المستشفى — شكراً لك!"))

    conn.commit(); cur.close(); conn.close()
    return jsonify({"message": "تم تأكيد التبرع ✅"})


@app.post("/api/requests/<int:rid>/confirm")
@jwt_required()
def confirm_request(rid):
    d = request.json
    urgency = d.get("urgency", "عادي")
    bags_needed = int(d.get("bags_needed", 1))
    conn = db(); cur = conn.cursor(dictionary=True)
    cur.execute("SELECT user_id FROM blood_requests WHERE id=%s", (rid,))
    req = cur.fetchone()

    cur.execute("""
        UPDATE blood_requests SET status='نشط', urgency=%s, bags_needed=%s WHERE id=%s
    """, (urgency, bags_needed, rid))

    if req:
        label = "عاجل 🚨" if urgency == "عاجل" else "عادي"
        cur.execute("""
            INSERT INTO notifications (user_id, message)
            VALUES (%s, %s)
        """, (req["user_id"], f"✅ تم تأكيد طلبك كحالة {label} — بانتظار المتبرعين"))

    conn.commit(); cur.close(); conn.close()
    return jsonify({"message": "تم تأكيد الحالة ✅"})


@app.post("/api/requests/<int:rid>/complete")
@jwt_required()
def complete_request(rid):
    conn = db(); cur = conn.cursor(dictionary=True)
    cur.execute("SELECT user_id FROM blood_requests WHERE id=%s", (rid,))
    req = cur.fetchone()
    cur.execute("UPDATE blood_requests SET status='مكتمل' WHERE id=%s", (rid,))
    if req:
        cur.execute("""
            INSERT INTO notifications (user_id, message)
            VALUES (%s, %s)
        """, (req["user_id"], "🎉 تم اكتمال طلبك — شكراً لثقتك بوصل"))
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
    conn = db(); cur = conn.cursor(dictionary=True)

    cur.execute("SELECT * FROM users WHERE id=%s", (uid,))
    donor = cur.fetchone()

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
        return jsonify({"error": "لقد حجزت موعداً لهذا الطلب مسبقاً"}), 400

    cur.execute("""
        INSERT INTO donations (request_id, donor_id, appointment_date, appointment_time)
        VALUES (%s,%s,%s,%s)
    """, (rid, uid, d.get("date"), d.get("time")))

    cur.execute("UPDATE blood_requests SET bags_received = bags_received+1 WHERE id=%s", (rid,))
    cur.execute("UPDATE users SET points = points+20 WHERE id=%s", (uid,))

    donor_name = donor["name"]
    cur.execute("""
        INSERT INTO notifications (user_id, message)
        VALUES (%s, %s)
    """, (req["user_id"], f"🩸 {donor_name} حجز موعد تبرع لطلبك — بانتظار تأكيد المستشفى"))

    conn.commit(); cur.close(); conn.close()
    return jsonify({"message": "تم حجز موعد التبرع ✅ +20 نقطة"})

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
               d.created_at, br.blood_type, br.patient_name,
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


if __name__ == "__main__":
    app.run(debug=True)