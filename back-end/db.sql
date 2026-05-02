-- wasl — SQLite schema
-- يتم إنشاء قاعدة البيانات تلقائياً من app.py (wasl.db)
-- هذا الملف للمرجعية فقط

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

-- status: 'بانتظار الموافقة' → يرسله قريب المريض، لا يظهر للمتبرعين بعد
--         'نشط'               → وافقت عليه المستشفى، يظهر للمتبرعين
--         'مكتمل'             → أغلقته المستشفى
--         'ملغي'              → ملغي
CREATE TABLE IF NOT EXISTS blood_requests (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_name  TEXT NOT NULL,
    user_id       INTEGER REFERENCES users(id),
    hospital_id   INTEGER NOT NULL REFERENCES hospitals(id),
    blood_type    TEXT NOT NULL,
    bags_needed   INTEGER NOT NULL DEFAULT 1,
    bags_received INTEGER DEFAULT 0,
    urgency       TEXT DEFAULT 'عادي',  -- 'عادي' | 'عاجل'
    status        TEXT DEFAULT 'بانتظار الموافقة',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS donations (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id       INTEGER NOT NULL REFERENCES blood_requests(id),
    donor_id         INTEGER REFERENCES users(id),
    donor_name       TEXT,
    donor_blood_type TEXT,
    appointment_time TEXT,   -- datetime-local يختاره المتبرع
    status           TEXT DEFAULT 'مؤكد',
    donated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- حسابات تجريبية (كلمة المرور لكلها: test1234)
-- donor@test.com    → متبرع  (+O، الرياض، 240 نقطة)
-- patient@test.com  → قريب مريض
-- hosp1@test.com    → مستشفى الملك فهد (الرياض)
-- hosp2@test.com    → مستشفى سلمان (الرياض)
-- hosp3@test.com    → مستشفى الرياض (جدة)
