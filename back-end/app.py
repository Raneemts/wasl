from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from datetime import timedelta

app = Flask(__name__)
CORS(app)

app.config["JWT_SECRET_KEY"] = "wasl-secret-key"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)
jwt = JWTManager(app)

# ── Fake users ──
FAKE_USERS = {
    "donor@test.com":    {"id": "1", "name": "أحمد المتبرع",   "role": "donor",    "blood_type": "+O", "city": "الرياض", "points": 240},
    "patient@test.com":  {"id": "2", "name": "عائلة المريض",   "role": "patient",  "blood_type": None, "city": "الرياض", "points": 0},
    "hospital@test.com": {"id": "3", "name": "مستشفى الملك فهد","role": "hospital", "blood_type": None, "city": "الرياض", "points": 0},
}

# ── Fake requests ──
FAKE_REQUESTS = [
    {"id": 1, "patient_name": "محمد العتيبي",  "blood_type": "+A", "bags_needed": 4, "bags_received": 2, "urgency": "عاجل", "status": "نشط",   "hospital_name": "مستشفى الملك فهد", "city": "الرياض"},
    {"id": 2, "patient_name": "سارة الزهراني", "blood_type": "-O", "bags_needed": 5, "bags_received": 1, "urgency": "عادي", "status": "نشط",   "hospital_name": "مستشفى سلمان",     "city": "الرياض"},
    {"id": 3, "patient_name": "خالد الشمري",   "blood_type": "+B", "bags_needed": 3, "bags_received": 3, "urgency": "عادي", "status": "مكتمل", "hospital_name": "مستشفى الرياض",    "city": "الرياض"},
    {"id": 4, "patient_name": "نورة القحطاني", "blood_type": "+AB","bags_needed": 2, "bags_received": 0, "urgency": "عاجل", "status": "نشط",   "hospital_name": "مستشفى الملك فهد", "city": "جدة"},
]

# ─────────────────────────────
# REGISTER — just return a token, no DB
# ─────────────────────────────
@app.post("/api/register")
def register():
    data = request.json
    name = data.get("name", "مستخدم جديد")
    role = data.get("role", "donor")

    fake_user = {
        "id": "99",
        "name": name,
        "role": role,
        "blood_type": data.get("blood_type"),
        "city": data.get("city", ""),
        "points": 0
    }

    token = create_access_token(identity="99")
    return jsonify({"message": "تم التسجيل", "token": token, "user_id": "99", "user": fake_user}), 201

# ─────────────────────────────
# LOGIN — any email works, no password check
# ─────────────────────────────
@app.post("/api/login")
def login():
    data = request.json
    email = data.get("email", "")

    # check if it's one of our fake users
    user = FAKE_USERS.get(email)

    if not user:
        # create a generic user for any email
        user = {
            "id": "99",
            "name": email.split("@")[0],
            "role": "donor",
            "blood_type": "+O",
            "city": "الرياض",
            "points": 0
        }

    token = create_access_token(identity=str(user["id"]))
    return jsonify({"token": token, "user": user})

# ─────────────────────────────
# DASHBOARD
# ─────────────────────────────
@app.get("/api/dashboard")
@jwt_required()
def dashboard():
    return jsonify({
        "active_requests": 3,
        "completed_requests": 1,
        "donations": 2,
        "points": 240
    })

# ─────────────────────────────
# GET REQUESTS
# ─────────────────────────────
@app.get("/api/requests")
def get_requests():
    blood_type = request.args.get("blood_type")
    results = [r for r in FAKE_REQUESTS if r["status"] == "نشط"]

    if blood_type and blood_type != "الكل":
        results = [r for r in results if r["blood_type"] == blood_type]

    return jsonify(results)

# ─────────────────────────────
# CREATE REQUEST
# ─────────────────────────────
@app.post("/api/requests")
@jwt_required()
def create_request():
    data = request.json
    new_req = {
        "id": len(FAKE_REQUESTS) + 1,
        "patient_name": data.get("patient_name", "مريض جديد"),
        "blood_type": data.get("blood_type", "+O"),
        "bags_needed": data.get("bags_needed", 1),
        "bags_received": 0,
        "urgency": data.get("urgency", "عادي"),
        "status": "نشط",
        "hospital_name": "مستشفى الملك فهد",
        "city": "الرياض"
    }
    FAKE_REQUESTS.append(new_req)
    return jsonify({"message": "تم إنشاء الطلب", "id": new_req["id"]}), 201

# ─────────────────────────────
# DONATE
# ─────────────────────────────
@app.post("/api/requests/<int:req_id>/donate")
@jwt_required()
def donate(req_id):
    for r in FAKE_REQUESTS:
        if r["id"] == req_id and r["status"] == "نشط":
            r["bags_received"] = min(r["bags_received"] + 1, r["bags_needed"])
            if r["bags_received"] >= r["bags_needed"]:
                r["status"] = "مكتمل"
            return jsonify({"message": "تم تسجيل التبرع ✅ +20 نقطة"})
    return jsonify({"error": "الطلب غير متاح"}), 400

# ─────────────────────────────
# COMPLETE / REOPEN
# ─────────────────────────────
@app.post("/api/requests/<int:req_id>/complete")
@jwt_required()
def complete_request(req_id):
    for r in FAKE_REQUESTS:
        if r["id"] == req_id:
            r["status"] = "مكتمل"
    return jsonify({"message": "تم الإغلاق ✅"})

@app.post("/api/requests/<int:req_id>/reopen")
@jwt_required()
def reopen_request(req_id):
    for r in FAKE_REQUESTS:
        if r["id"] == req_id:
            r["status"] = "نشط"
    return jsonify({"message": "تم إعادة الفتح ✅"})

if __name__ == "__main__":
    app.run(debug=True)