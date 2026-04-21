# Stage 1 Report

## Team Formation and Idea Development

## 1. Team Formation Overview

At the beginning of the project, our team held a meeting to introduce ourselves and discuss our skills, interests, and preferred roles. After the discussion, we divided responsibilities based on each team member’s strengths and experience.

### Team Members and Roles

| Name                 | Role               | Responsibilities                                                                 |
| -------------------- | ------------------ | -------------------------------------------------------------------------------- |
| Ahmed Khaled Alomani | UI/UX Designer     | Designing the interface layout and ensuring the application is user-friendly     |
| Amjad Khalid Alomani | Database Engineer  | Designing and managing the database structure                                    |
| Lamis Fahad Aljabli  | Frontend Developer | Building the user interface and integrating it with the backend                  |
| Raneem Tarik Alsaqat | Backend Developer  | Implementing application logic and connecting the frontend with the database     |

### Collaboration Strategy

To communicate and organize our work, we use **Discord** as our main platform for discussions, updates, and coordination.

We also divide tasks clearly and hold regular meetings to ensure all team members are aligned and aware of the project progress.

---

# 2. Research and Brainstorming

During the brainstorming stage, we discussed several project ideas. Our goal was to select an idea that solves a real-world problem and is feasible within the project timeline.

### Idea 1: Food Donation Platform

This idea focused on connecting restaurants or individuals with charities to donate leftover food instead of wasting it.

**Strengths**
- Helps reduce food waste  
- Supports people in need  

**Weaknesses**
- Requires coordination with restaurants and charities  
- Logistics such as transportation could be complex  

**Reason for Rejection**

Although impactful, this idea depends heavily on real-world logistics and partnerships, making it difficult to implement within a student project.

---

### Idea 2: Hospital Appointment Booking System

This idea involved creating a system for booking hospital appointments online.

**Strengths**
- Useful for patients  
- Easy to understand  

**Weaknesses**
- Already widely available  
- Lacks innovation  

**Reason for Rejection**

We rejected this idea because similar systems already exist, making it less unique.

---

# 3. Idea Evaluation

We evaluated ideas based on the following criteria:

- **Feasibility** – Can it be completed within the timeline?  
- **Impact** – Does it solve a meaningful problem?  
- **Technical Fit** – Does it match our skills?  
- **Innovation** – Is it unique and creative?  

Based on this evaluation, we selected the most suitable idea.

---

# 4. Selected MVP Concept

## Project Name

**Wasl (وصل)**

### Summary

Wasl is a platform that connects blood donors with patients or hospitals in need of blood donations. It aims to make finding donors faster and more efficient during emergencies.

Users can register as donors and provide their blood type. When a request is created, the system identifies matching donors and notifies them.

### Problem

Hospitals often face delays in finding suitable blood donors, which can affect patients in critical conditions.

### Proposed Solution

Wasl allows donors to register and store their blood type. Patients or hospitals can create requests, and the system matches and notifies suitable donors.

### Target Users

- Blood donors  
- Hospitals  
- Patient families  

---

# 5. Key MVP Features

- Donor registration system  
- Blood type storage  
- Search by blood type  
- Emergency notifications  

---

# 6. Potential Challenges

- Ensuring data accuracy  
- Efficient notification handling  
- Encouraging donor participation  

---

# 7. Opportunities

- Faster access to donors  
- Supporting critical patients  
- Encouraging community engagement  

---

# 8. Reason for Selection

We selected Wasl because it solves a real problem, has strong social impact, and is feasible within our technical capabilities.

---

# Stage 2: Project Charter

## 1. Project Objectives

### Purpose

To develop a mobile application (Wasl) that connects patients, hospitals, and donors efficiently for emergency blood donation.

### SMART Objectives

- Submit a blood request in under 2 minutes  
- Match donors based on blood type  
- Notify relevant donors quickly  

---

## 2. Stakeholders and Roles

### Stakeholders

**Internal**
- Project Team  

**External**
- Patients  
- Hospitals  
- Donors  
- Instructor  

### Team Roles

| Name | Role | Responsibilities |
|------|------|------------------|
| Ahmed Khaled Alomani | UI/UX Designer | UI/UX design |
| Amjad Khalid Alomani | Database Engineer | Database |
| Lamis Fahad Aljabli | Frontend Developer | Frontend |
| Raneem Tarik Alsaqat | Backend Developer | Backend |

---

## 3. Scope

### In-Scope
- User registration  
- Blood requests  
- Search  
- Notifications  
- Profiles  

### Out-of-Scope
- Payments  
- Real hospital integration  
- Medical records  
- GPS tracking  

---

## 4. Risks and Mitigation

| Risk | Mitigation |
|------|-----------|
| Lack of experience | Learn early |
| Time constraints | Clear deadlines |
| Bugs | Frequent testing |
| Communication issues | Weekly meetings |

---

## 5. High-Level Plan

| Stage | Tasks | Timeline |
|------|------|----------|
| Stage 1 | Idea | Done |
| Stage 2 | Charter | Done |
| Stage 3 | Documentation | Week 3–4 |
| Stage 4 | Development | Week 5–8 |
| Stage 5 | Testing | Week 9–10 |

---

# Stage 3 — User Stories & Mockups

### MoSCoW Priority Key

| Label | Meaning |
|------|--------|
| Must Have | Core |
| Should Have | Important |
| Could Have | Optional |
| Won’t Have | Excluded |

---

## 👤 Patient Family

(unchanged — kept your content)

---

## 🏥 Hospital

(unchanged)

---

## 🩸 Donor

(unchanged)

---

## Mockups

- Donor Home  
- Patient Request Form  
- Hospital Dashboard  

---

# Stage 3 — System Architecture

Client-server architecture using:

- React Native (Frontend)  
- Node.js + Express (Backend)  
- MySQL (Database)  
- Firebase (Notifications)  

---

## System Components

- Authentication Service  
- Request Service  
- Donation Service  
- Notification Service  

---

## Database Design (MySQL)

### Users Table
- id  
- name  
- email  
- password_hash  
- role (donor / patient_family / hospital)  
- blood_type  
- city  
- phone  
- fcm_token  
- points  
- created_at  

### Requests Table
- id  
- user_id  
- patient_name  
- blood_type  
- bags_needed  
- donated_count  
- hospital_name  
- city  
- contact_number  
- urgency  
- status  
- created_at  
- updated_at  

### Donations Table
- id  
- request_id  
- donor_id  
- status  
- created_at  
- confirmed_at  

---

## Relationships

- One patient_family → many requests  
- One request → many donations  
- One donor → many donations  

---

## API Design (Endpoints)

### Authentication

- POST /api/auth/register  
  Body: name, email, password, role, blood_type, city  

- POST /api/auth/login  
  Body: email, password  

---

### Requests

- POST /api/requests  
  Body: patient_name, blood_type, bags_needed, hospital_name, city, contact_number, urgency  

- GET /api/requests  
- GET /api/requests/:id  
- PUT /api/requests/:id  

---

### Donations

- POST /api/donations  
  Body: request_id  

- GET /api/donations/user/:id  

---

### Notifications

- POST /api/notifications/send  

---

## System Workflow

### 1. Request Creation
1. User logs in  
2. Fills request  
3. Stored in DB  
4. Match donors  
5. Send notifications  

### 2. Donor Response
1. Donor logs in  
2. Receives notification  
3. Views request  
4. Clicks donate  
5. System updates  

### 3. Hospital Management
1. View requests  
2. Monitor donors  
3. Confirm completion  
4. Update status  

---

## Conclusion

This document provides a complete overview of the Wasl system, including user requirements, architecture, database design, APIs, and workflows. It serves as a solid foundation for Stage 4 (development).
