DROP DATABASE IF EXISTS wasl_db;
CREATE DATABASE wasl_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wasl_db;

CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  phone         VARCHAR(20) UNIQUE,
  email         VARCHAR(150) UNIQUE,
  password_hash VARCHAR(255),
  role          ENUM('donor','patient','hospital') NOT NULL,
  blood_type    VARCHAR(5),
  city          VARCHAR(100),
  fcm_token     VARCHAR(255),
  points        INT DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hospitals (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(150) NOT NULL,
  city  VARCHAR(100) NOT NULL
);

CREATE TABLE blood_requests (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  patient_name   VARCHAR(100) NOT NULL,
  user_id        INT,
  hospital_id    INT NOT NULL,
  blood_type     VARCHAR(5) NOT NULL,
  bags_needed    INT NOT NULL,
  bags_received  INT DEFAULT 0,
  urgency        ENUM('عاجل','عادي') DEFAULT 'عادي',
  status         ENUM('نشط','مكتمل','ملغي') DEFAULT 'نشط',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE donations (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  request_id       INT NOT NULL,
  donor_id         INT,
  donor_name       VARCHAR(100),
  donor_blood_type VARCHAR(5),
  status           ENUM('معلق','مؤكد','ملغي') DEFAULT 'معلق',
  donated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES blood_requests(id),
  FOREIGN KEY (donor_id) REFERENCES users(id)
);

INSERT INTO hospitals (name, city) VALUES
('مستشفى الملك فهد', 'الرياض'),
('مستشفى سلمان', 'الرياض'),
('مستشفى الرياض', 'الرياض');

INSERT INTO users (name, phone, email, password_hash, role, blood_type, city, points) VALUES
('أحمد العتيبي',     '0500000000', 'ahmed@test.com',  '$2b$12$placeholder', 'donor',    '+O', 'الرياض', 240),
('قريب المريض',      '0555555555', 'family@test.com', '$2b$12$placeholder', 'patient',  NULL, 'الرياض', 0),
('مستشفى الملك فهد', '0110000000', 'hosp@test.com',   '$2b$12$placeholder', 'hospital', NULL, 'الرياض', 0);

INSERT INTO blood_requests (patient_name, user_id, hospital_id, blood_type, bags_needed, bags_received, urgency, status) VALUES
('محمد العتيبي',  2, 1, '+A', 4, 2, 'عاجل', 'نشط'),
('فهد العتيبي',   2, 2, '+O', 3, 3, 'عادي', 'مكتمل'),
('سارة الزهراني', 2, 3, '-O', 5, 1, 'عادي', 'نشط');

INSERT INTO donations (request_id, donor_id, donor_name, donor_blood_type, status) VALUES
(1, 1, 'أحمد العتيبي', '+O', 'مؤكد'),
(2, 1, 'أحمد العتيبي', '+O', 'مؤكد');