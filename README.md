# Stage 1 Report

## Team Formation and Idea Development

## 1. Team Formation Overview

At the beginning of the project, our team held a meeting to introduce ourselves and discuss our skills, interests, and what roles we prefer to take in the project. After the discussion, we decided to divide the responsibilities based on what each team member is most comfortable with.

### Team Members and Roles

| Name                 | Role               | Responsibilities                                                                 |
| -------------------- | ------------------ | -------------------------------------------------------------------------------- |
| Ahmed Khaled Alomani | UI/UX Designer     | Designing the interface layout and making sure the application is easy to use    |
| Amjad Khalid Alomani | Database Engineer  | Designing and managing the database structure                                    |
| Lamis Fahad Aljabli   | Frontend Developer | Building the user interface and connecting it with the backend                   |
| Raneem Tarik Alsaqat | Backend Developer  | Implementing the application logic and connecting the frontend with the database |

### Collaboration Strategy

To communicate and organize our work, we decided to use **Discord** as our main communication platform. We will use it to discuss ideas, share updates, and coordinate tasks.

We also plan to divide tasks clearly between team members and hold regular discussions to make sure everyone is aligned and aware of the project progress.

---

# 2. Research and Brainstorming

During the brainstorming stage, we discussed several possible project ideas. Our goal was to find an idea that solves a real problem and is still possible to implement within the time of the project.

### Idea 1: Food Donation Platform

This idea was about creating a platform that connects restaurants or individuals with charities so they can donate leftover food instead of wasting it.

**Strengths**

* Helps reduce food waste
* Supports people who need food

**Weaknesses**

* Requires coordination with restaurants and charities
* Logistics such as transportation could make it complicated

**Reason for Rejection**

Even though the idea is useful, it requires real-world logistics and partnerships, which might be difficult to manage in a student project.

---

### Idea 2: Hospital Appointment Booking System

Another idea was creating a system where users can book hospital appointments online.

**Strengths**

* Useful for patients
* Easy to understand concept

**Weaknesses**

* Already exists in many healthcare applications
* Not very innovative

**Reason for Rejection**

We decided not to choose this idea because similar systems already exist, so it would not be very unique.

---

# 3. Idea Evaluation

To choose the best idea, we evaluated each option based on several criteria:

* **Feasibility** – whether the project can be completed within the available time
* **Impact** – how helpful the solution is for users
* **Technical Fit** – how well it matches our current technical skills
* **Innovation** – whether the idea is creative and unique

After discussing these points, we selected the idea that seemed both impactful and realistic for our team to implement.

---

# 4. Selected MVP Concept

## Project Name

**Wasl (وصل)**

### Summary

Wasl is a platform that connects blood donors with patients or hospitals that need blood donations. The goal of the platform is to make it easier to find donors when a specific blood type is needed urgently.

Users can register as donors and add their blood type. When there is a request for a certain blood type, the system can identify suitable donors and send them notifications.

### Problem

Hospitals sometimes urgently need a specific blood type, but it can be difficult to quickly find available donors. This delay may affect patients who need blood transfusions.

### Proposed Solution

The Wasl platform helps solve this problem by creating a system where donors can register and store their blood type information. Hospitals or patients can search for donors with matching blood types, and in emergency cases, the platform can notify donors who match the request.

### Target Users

The platform is mainly intended for:

* Blood donors
* Hospitals
* Patients who need blood donations

---

# 5. Key MVP Features

For the first version of the project (MVP), we plan to include the following features:

* Donor registration system
* Storing blood type information
* Searching donors by blood type
* Sending emergency notifications to matching donors

These features represent the core functionality needed to demonstrate the main idea of the project.

---

# 6. Potential Challenges

Some challenges we identified include:

* Making sure donor information is accurate
* Handling emergency notifications efficiently
* Encouraging people to register as donors

---

# 7. Opportunities

This platform could have several positive impacts:

* Helping hospitals find blood donors faster
* Supporting patients who need urgent blood donations
* Encouraging community participation in blood donation

---

# 8. Reason for Selecting This Idea

We selected the Wasl platform because it solves a real problem and has a meaningful social impact. It is also technically possible to build within the timeframe of the project and fits well with the skills of our team members.

# Stage 2: Project Charter

## 1. Project Objectives

### Purpose
The purpose of this project is to develop a mobile application (Wasl) that connects patients, hospitals, and blood donors efficiently to support emergency blood donation and help save lives.

### SMART Objectives
- Enable patients or hospitals to submit a blood request.
- Allow donors to find and respond to matching blood donation cases based on blood type.
- Notify donors about emergency requests

---

## 2. Stakeholders and Roles

### Stakeholders
- Patients (request blood)
- Hospitals (manage and monitor requests)
- Donors (respond to donation requests)
- Project Team (developers & designer)
- Instructor (evaluation and guidance)

### Team Roles

| Name | Role | Responsibilities |
|----------------------|--------------------|------------------|
| Ahmed Khaled Alomani | UI/UX Designer | Design user interface and improve user experience |
| Amjad Khalid Alomani | Database Engineer | Design and manage database |
| Lamis Fahad Aljabli | Frontend Developer | Build UI and connect to backend |
| Raneem Tarik Alsaqat | Backend Developer | Implement logic and APIs |

---

## 3. Scope

### In-Scope
- User registration (Donor / Patient / Hospital)
- Blood request creation
- Search by blood type
- Emergency notifications
- Basic user profiles
- Real-time GPS tracking
### Out-of-Scope
- Payment systems
- Integration with real hospital systems
- Advanced medical records


---

## 4. Risks and Mitigation

| Risk | Mitigation |
|------|-----------|
| Lack of experience with tools | Learn early + use tutorials |
| Time constraints | Divide tasks and set deadlines |
| Technical bugs | Test frequently |
| Poor communication | Weekly meetings + Discord |

---

## 5. High-Level Plan

| Stage | Description | Timeline |
|------|------------|----------|
| Stage 1 | Idea Development | Completed |
| Stage 2 | Project Charter | Current |
| Stage 3 | Technical Documentation | Week 3–4 |
| Stage 4 | MVP Development | Week 5–8 |
| Stage 5 | Testing & Final Delivery | Week 9–10 |

## Stage 3 — User Stories & Mockups
 
### MoSCoW Priority Key
 
| Label | Meaning |
|-------|---------|
| `Must Have` | Core — MVP cannot ship without this |
| `Should Have` | Important but can be deferred |
| `Could Have` | Nice-to-have, raises project quality |
| `Won't Have` | Out of scope for MVP |
 
---
 
### 👤 User 1 — Patient Family (Blood Requester)
 
| Priority | User Story |
|----------|------------|
| `Must Have` | As a patient family member, I want to create a blood donation request with blood type, bag count, hospital, and urgency level, so that I can reach matching donors quickly. |
| `Must Have` | As a patient family member, I want to set the urgency level (normal / urgent), so that critical cases are handled with priority. |
| `Must Have` | As a patient family member, I want to track my request status in real time, so that I know how many donors have responded and how many bags are still needed. |
| `Must Have` | As a patient family member, I want to receive a notification when a donor accepts or the request is fulfilled, so that I am immediately informed. |
| `Should Have` | As a patient family member, I want to edit or cancel an active request, so that I can update the information if the situation changes. |
| `Could Have` | As a patient family member, I want to share the request via WhatsApp, so that I can reach donors outside the app. |
| `Could Have` | As a patient family member, I want to view my past requests, so that I can track the patient's donation history. |
 
---
 
### 🏥 User 2 — Hospital
 
| Priority | User Story |
|----------|------------|
| `Must Have` | As a hospital, I want to register an official account with name, location, and contact info, so that I can manage blood donation cases reliably. |
| `Must Have` | As a hospital, I want to view all active blood requests with blood type, status, and donor count, so that I can monitor and coordinate responses. |
| `Must Have` | As a hospital, I want to confirm a donation was completed, so that the case status updates automatically for all users. |
| `Must Have` | As a hospital, I want to accept, close, or update cases, so that I have full control over each request's lifecycle. |
| `Should Have` | As a hospital, I want to view full case details including patient name and donor list, so that I can manage the medical file accurately. |
| `Could Have` | As a hospital, I want a statistics dashboard showing donation counts and most-requested blood types, so that I can plan proactively. |
 
---
 
### 🩸 User 3 — Donor
 
| Priority | User Story |
|----------|------------|
| `Must Have` | As a donor, I want to register with my blood type and city, so that the system can match me to nearby relevant cases. |
| `Must Have` | As a donor, I want to browse available blood cases with blood type, hospital, and distance, so that I can choose the most suitable case. |
| `Must Have` | As a donor, I want to press "I want to donate" on a case, so that the hospital is notified of my intent. |
| `Must Have` | As a donor, I want to receive an instant notification when a case matching my blood type is posted, so that I can respond quickly. |
| `Should Have` | As a donor, I want to filter cases by blood type or city, so that I only see relevant cases. |
| `Should Have` | As a donor, I want to view my donation history, so that I can track my contributions over time. |
| `Could Have` | As a donor, I want to earn points for every donation, so that I feel appreciated and stay motivated. |
| `Won't Have` | As a donor, I want to receive payment for donating — *out of scope (fully voluntary platform)*. |
 
---
 
### Priority Summary
 
| Priority | Feature | User |
|----------|---------|------|
| `Must Have` | Create blood request + set urgency | Patient Family |
| `Must Have` | Track request progress in real time | Patient Family |
| `Must Have` | Notifications (donor accepted / case complete) | Patient Family + Donor |
| `Must Have` | Hospital account registration | Hospital |
| `Must Have` | View & manage cases + confirm donation | Hospital |
| `Must Have` | Donor registration with blood type | Donor |
| `Must Have` | Browse cases + donate button | Donor |
| `Must Have` | Real-time notifications for matching cases | Donor |
| `Should Have` | Edit / cancel request | Patient Family |
| `Should Have` | Full case details | Hospital |
| `Should Have` | Filter cases + donation history | Donor |
| `Could Have` | Share request via WhatsApp | Patient Family |
| `Could Have` | Statistics dashboard | Hospital |
| `Could Have` | Points system | Donor |
| `Won't Have` | Payment for donation | All |
 
---
 
### Mockups
 
Three main screens were designed for the MVP:
 
- **Donor Home** — Case cards with blood type badge, progress bar, urgency tag, distance, and donate button
- **Patient Family — New Request Form** — Blood type grid selector, bag count, hospital name, contact number, urgency toggle
- **Hospital Dashboard** — Stats grid (active cases, monthly donations, most-requested type, completion rate) + case list with confirm button
> Interactive prototype available in `/prototype/wasal_app.html`
 
---
 
*Wasl — Connecting donors with those who need them most.*
