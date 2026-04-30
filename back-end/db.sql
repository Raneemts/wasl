DROP DATABASE IF EXISTS wasl_db;
CREATE DATABASE wasl_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wasl_db;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role ENUM('donor','patient','hospital') NOT NULL,
  blood_type VARCHAR(5),
  city VARCHAR(100),
  points INT DEFAULT 0
);

CREATE TABLE hospitals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  city VARCHAR(100) NOT NULL
);

CREATE TABLE blood_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_name VARCHAR(100) NOT NULL,
  hospital_id INT NOT NULL,
  blood_type VARCHAR(5) NOT NULL,
  bags_needed INT NOT NULL,
  bags_received INT DEFAULT 0,
  urgency ENUM('عاجل','عادي') DEFAULT 'عادي',
  status ENUM('نشط','مكتمل','ملغي') DEFAULT 'نشط',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE TABLE donations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  donor_name VARCHAR(100),
  donor_blood_type VARCHAR(5),
  donated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES blood_requests(id)
);

INSERT INTO hospitals (name, city) VALUES
('مستشفى الملك فهد', 'الرياض'),
('مستشفى سلمان', 'الرياض'),
('مستشفى الرياض', 'الرياض');

INSERT INTO users (name, phone, role, blood_type, city, points) VALUES
('أحمد العتيبي', '0500000000', 'donor', '+O', 'الرياض', 240),
('قريب المريض', '0555555555', 'patient', NULL, 'الرياض', 0),
('مستشفى الملك فهد', '0110000000', 'hospital', NULL, 'الرياض', 0);

INSERT INTO blood_requests
(patient_name, hospital_id, blood_type, bags_needed, bags_received, urgency, status)
VALUES
('محمد العتيبي', 1, '+A', 4, 2, 'عاجل', 'نشط'),
('فهد العتيبي', 2, '+O', 3, 3, 'عادي', 'مكتمل'),
('سارة الزهراني', 3, '-O', 5, 1, 'عادي', 'نشط');