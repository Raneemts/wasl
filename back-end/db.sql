DROP DATABASE IF EXISTS wasl_db;
CREATE DATABASE wasl_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wasl_db;

CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('donor','patient','hospital') NOT NULL,
  blood_type    VARCHAR(5),
  city          VARCHAR(100),
  points        INT DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hospitals (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  city VARCHAR(100) NOT NULL
);

CREATE TABLE blood_requests (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  hospital_id   INT NOT NULL,
  blood_type    VARCHAR(5) NOT NULL,
  patient_name  VARCHAR(100) NOT NULL,
  bags_needed   INT NOT NULL DEFAULT 1,
  bags_received INT DEFAULT 0,
  urgency       ENUM('عاجل','عادي') DEFAULT 'عادي',
  status        ENUM('نشط','مكتمل','ملغي') DEFAULT 'نشط',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE TABLE donations (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  request_id      INT NOT NULL,
  donor_id        INT NOT NULL,
  appointment_date DATE,
  appointment_time VARCHAR(10),
  status          ENUM('معلق','مؤكد','ملغي') DEFAULT 'معلق',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES blood_requests(id),
  FOREIGN KEY (donor_id)   REFERENCES users(id)
);

INSERT INTO hospitals (name, city) VALUES
('مستشفى الملك فهد',   'الرياض'),
('مستشفى سلمان',       'الرياض'),
('مستشفى الملك خالد',  'الرياض'),
('مستشفى المملكة',     'جدة'),
('مستشفى الأمل',       'جدة');