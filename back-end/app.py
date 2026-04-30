from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector

app = Flask(__name__)
CORS(app)

def db():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="YOUR_PASSWORD",
        database="wasl_db"
    )

@app.get("/api/dashboard")
def dashboard():
    conn = db()
    cur = conn.cursor(dictionary=True)

    cur.execute("SELECT COUNT(*) AS active FROM blood_requests WHERE status='نشط'")
    active = cur.fetchone()["active"]

    cur.execute("SELECT COUNT(*) AS completed FROM blood_requests WHERE status='مكتمل'")
    completed = cur.fetchone()["completed"]

    cur.execute("SELECT points FROM users WHERE role='donor' LIMIT 1")
    donor = cur.fetchone()
    points = donor["points"] if donor else 0

    cur.execute("SELECT COUNT(*) AS donations FROM donations")
    donations = cur.fetchone()["donations"]

    cur.close()
    conn.close()

    return jsonify({
        "active_requests": active,
        "completed_requests": completed,
        "points": points,
        "donations": donations
    })

@app.get("/api/requests")
def get_requests():
    blood_type = request.args.get("blood_type")

    conn = db()
    cur = conn.cursor(dictionary=True)

    sql = """
        SELECT 
          br.id,
          br.patient_name,
          br.blood_type,
          br.bags_needed,
          br.bags_received,
          br.urgency,
          br.status,
          br.created_at,
          h.name AS hospital_name,
          h.city
        FROM blood_requests br
        JOIN hospitals h ON br.hospital_id = h.id
        WHERE 1=1
    """
    values = []

    if blood_type and blood_type != "الكل":
        sql += " AND br.blood_type = %s"
        values.append(blood_type)

    sql += " ORDER BY br.created_at DESC"

    cur.execute(sql, values)
    rows = cur.fetchall()

    cur.close()
    conn.close()

    return jsonify(rows)

@app.post("/api/requests")
def create_request():
    data = request.json

    conn = db()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO blood_requests 
        (patient_name, hospital_id, blood_type, bags_needed, urgency)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (
            data["patient_name"],
            data["hospital_id"],
            data["blood_type"],
            data["bags_needed"],
            data.get("urgency", "عادي")
        )
    )

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"message": "تم إنشاء الطلب بنجاح"})

@app.post("/api/requests/<int:req_id>/donate")
def donate(req_id):
    data = request.json or {}

    conn = db()
    cur = conn.cursor()

    cur.execute("""
        UPDATE blood_requests
        SET bags_received = bags_received + 1
        WHERE id = %s 
        AND status = 'نشط'
        AND bags_received < bags_needed
    """, (req_id,))

    if cur.rowcount > 0:
        cur.execute("""
            INSERT INTO donations (request_id, donor_name, donor_blood_type)
            VALUES (%s, %s, %s)
        """, (
            req_id,
            data.get("donor_name", "أحمد العتيبي"),
            data.get("donor_blood_type", "+O")
        ))

        cur.execute("""
            UPDATE users
            SET points = points + 20
            WHERE role = 'donor'
            LIMIT 1
        """)

    cur.execute("""
        UPDATE blood_requests
        SET status = 'مكتمل'
        WHERE id = %s AND bags_received >= bags_needed
    """, (req_id,))

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"message": "تم تسجيل التبرع"})

@app.post("/api/requests/<int:req_id>/complete")
def complete_request(req_id):
    conn = db()
    cur = conn.cursor()

    cur.execute("""
        UPDATE blood_requests
        SET status = 'مكتمل', bags_received = bags_needed
        WHERE id = %s
    """, (req_id,))

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"message": "تم تأكيد اكتمال الحالة"})

@app.post("/api/requests/<int:req_id>/reopen")
def reopen_request(req_id):
    conn = db()
    cur = conn.cursor()

    cur.execute("""
        UPDATE blood_requests
        SET status = 'نشط'
        WHERE id = %s
    """, (req_id,))

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"message": "تم إبقاء الحالة نشطة"})

if __name__ == "__main__":
    app.run(debug=True)