# Stage 1 Report

## Team Formation and Idea Development

## 1. Team Formation Overview

At the beginning of the project, our team held a meeting to introduce ourselves and discuss our skills, interests, and preferred roles. After the discussion, we divided responsibilities based on each member’s strengths.

### Team Members and Roles

| Name                 | Role               | Responsibilities                                                                 |
|----------------------|--------------------|----------------------------------------------------------------------------------|
| Ahmed Khaled Alomani | UI/UX Designer     | Designing the interface and ensuring usability                                  |
| Amjad Khalid Alomani | Database Engineer  | Designing and managing the database structure                                   |
| Lamis Fahad Aljabli  | Frontend Developer | Building the UI and integrating it with the backend                             |
| Raneem Tarik Alsaqat | Backend Developer  | Implementing logic and connecting frontend with the database                    |

### Collaboration Strategy

We use **Discord** for communication, sharing updates, and coordination. Tasks are clearly divided, and we hold regular discussions to ensure alignment.

---

## 2. Research and Brainstorming

### Idea 1: Food Donation Platform

**Strengths**
- Reduces food waste
- Helps people in need

**Weaknesses**
- Requires logistics and coordination
- Difficult to implement as a student project

**Reason for Rejection**
Too dependent on real-world partnerships and logistics.

---

### Idea 2: Hospital Appointment System

**Strengths**
- Useful and clear concept

**Weaknesses**
- Already widely available
- Not innovative

**Reason for Rejection**
Lacks uniqueness.

---

## 3. Idea Evaluation

Criteria used:
- Feasibility
- Impact
- Technical Fit
- Innovation

We selected the idea that best balances impact and feasibility.

---

## 4. Selected MVP Concept

### Project Name
**Wasl (وصل)**

### Summary
Wasl connects blood donors with patients and hospitals to enable fast response in emergencies.

### Problem
Hospitals struggle to quickly find donors for specific blood types.

### Solution
A platform where donors register their blood type and receive notifications when needed.

### Target Users
- Donors
- Hospitals
- Patient families

---

## 5. Key MVP Features

- Donor registration
- Blood type storage
- Search by blood type
- Emergency notifications

---

## 6. Challenges

- Data accuracy
- Notification efficiency
- User adoption

---

## 7. Opportunities

- Faster donor matching
- Community engagement
- Life-saving impact

---

## 8. Reason for Selection

The idea solves a real problem, has strong social impact, and is feasible within the project scope.

---

# Stage 2: Project Charter

## 1. Objectives

### Purpose
Develop a mobile app connecting donors, hospitals, and patients.

### SMART Objectives
- Submit blood request in < 2 minutes
- Match donors by blood type
- Send fast emergency notifications

---

## 2. Stakeholders

### Internal
- Development team

### External
- Patients
- Hospitals
- Donors
- Instructor

---

## 3. Scope

### In-Scope
- User registration
- Blood requests
- Notifications
- Profiles

### Out-of-Scope
- Payments
- Real hospital integration
- Advanced medical data
- GPS tracking

---

## 4. Risks

| Risk | Mitigation |
|------|-----------|
| Lack of experience | Learn early |
| Time issues | Clear planning |
| Bugs | Frequent testing |
| Communication | Weekly meetings |

---

## 5. Plan

| Stage | Description |
|------|------------|
| 1 | Completed |
| 2 | Completed |
| 3 | Documentation |
| 4 | Development |
| 5 | Testing |

---

# Stage 3 — User Stories & Mockups

## MoSCoW

| Label | Meaning |
|------|--------|
| Must | Required |
| Should | Important |
| Could | Optional |
| Won’t | Out of scope |

---

## Users

### Patient Family
- Create request
- Set urgency
- Track progress
- Receive notifications

### Hospital
- Register account
- Manage requests
- Confirm donations

### Donor
- Register blood type
- Browse cases
- Donate
- Get notifications

---

## Mockups

- Donor Home
- Request Form
- Hospital Dashboard

---

# System Architecture

- Frontend: React Native  
- Backend: Node.js + Express  
- Database: MySQL  
- Notifications: Firebase (FCM)

---

## Components

- Authentication Service
- Request Service
- Donation Service
- Notification Service

---

## Database Design

### Users
- id, name, email, password_hash
- role (donor / patient_family / hospital)
- blood_type, city, phone
- fcm_token, points, created_at

### Requests
- id, user_id
- patient_name, blood_type
- bags_needed, donated_count
- hospital_name, city, contact_number
- urgency, status
- created_at, updated_at

### Donations
- id, request_id, donor_id
- status, created_at, confirmed_at

---

## Relationships

- One patient_family → many requests
- One request → many donations
- One donor → many donations

---

# API Design

## Authentication

POST /api/auth/register  
Body: name, email, password, role, blood_type, city  

POST /api/auth/login  
Body: email, password  

---

## Requests

POST /api/requests  
Body: patient_name, blood_type, bags_needed, hospital_name, city, contact_number, urgency  

GET /api/requests  

GET /api/requests/:id  

PUT /api/requests/:id  

---

## Donations

POST /api/donations  
Body: request_id  

GET /api/donations/user/:id  

---

## Notifications

POST /api/notifications/send  

---

# System Workflow

## 1. Create Request
1. User logs in  
2. Submits request  
3. Stored in DB  
4. Donors matched  
5. Notifications sent  

## 2. Donor Action
1. Receives notification  
2. Views case  
3. Clicks donate  
4. System records donation  

## 3. Hospital
1. Views requests  
2. Monitors donors  
3. Marks complete  
4. System updates all users  

---

## Conclusion

This document provides a complete overview of the Wasl system, including user requirements, architecture, database design, APIs, and workflows. It serves as a strong foundation for Stage 4 (development).
