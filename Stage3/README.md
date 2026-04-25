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
---

## Stage 3 — System Architecture

The Wasl system follows a client-server architecture designed for real-time interaction between users (donors, patient families, and hospitals).

The mobile application (front-end) is developed using React Native and serves as the interface for all users. It communicates with the back-end through RESTful API requests.

The back-end is built using Node.js and Express, which handles business logic such as creating blood requests, matching donors, managing case status, and sending notifications.

A centralized database (MySQL) stores all system data, including users, blood requests, and donations.

Firebase Cloud Messaging (FCM) is used as an external service to deliver real-time notifications to donors when a matching case is created and to update patients on request progress.

Data flows as follows:  
Users interact with the mobile app → requests are sent to the back-end → data is processed and stored in the database → notifications are triggered via Firebase → updates are reflected back in the app in real time.

The architecture ensures scalability, fast response time, and reliable communication between all system components.
---

## Stage 3 — API Specifications

The Wasl system exposes a set of RESTful API endpoints to handle user actions such as creating requests, donating, and managing cases.

---

### 🔐 Auth Endpoints

#### POST /api/auth/register

Registers a new user (donor, patient family, or hospital)

**Request Body:**

```json
{
  "name": "Lamis",
  "email": "Lamis@email.com",
  "password": "123456",
  "role": "donor",
  "blood_type": "A+",
  "city": "Riyadh"
}
```

**Response:**

```json
{
  "message": "User registered successfully"
}
```

---

#### POST /api/auth/login

**Request Body:**

```json
{
  "email": "Lamis@email.com",
  "password": "123456"
}
```

**Response:**

```json
{
  "token": "JWT_TOKEN"
}
```

---

### 🩸 Request Endpoints

#### POST /api/requests

Create a new blood request

**Request Body:**

```json
{
  "patient_name": "Ahmed",
  "blood_type": "O+",
  "bags_needed": 3,
  "city": "Riyadh",
  "urgency": "urgent"
}
```

**Response:**

```json
{
  "message": "Request created",
  "request_id": 101
}
```

---

#### GET /api/requests

Get all active requests

**Response:**

```json
[
  {
    "id": 101,
    "blood_type": "O+",
    "bags_needed": 3,
    "donated_count": 1,
    "status": "active"
  }
]
```

---

### 🤝 Donation Endpoints

#### POST /api/donations

Donor volunteers to donate

**Request Body:**

```json
{
  "request_id": 101
}
```

**Response:**

```json
{
  "message": "Donation registered"
}
```

---

#### PATCH /api/donations/:id/confirm

Hospital confirms donation

**Response:**

```json
{
  "message": "Donation confirmed, case updated"
}
```

## SCM and QA Plans

### Source Control Management (SCM)

The project uses Git and GitHub for version control and collaboration.

- Each team member works on a separate branch to avoid conflicts
- Changes are merged into the main branch using pull requests
- Code is reviewed before merging to ensure quality
- Clear and meaningful commit messages are used to track progress

This approach helps maintain organized development and prevents code conflicts.

---

### Quality Assurance (QA)

To ensure system reliability and correctness, several testing methods are applied:

- Unit Testing: Testing individual functions and components
- Integration Testing: Ensuring the frontend, backend, and database work together correctly
- Manual Testing: Verifying complete user flows such as creating requests and responding as a donor
- Bug Tracking: Identifying and fixing issues during development

Regular testing ensures the system works as expected and improves overall quality.

---

## Technical Justifications

The following technologies were selected based on project requirements:

- React Native: Allows building a cross-platform mobile application efficiently
- Node.js with Express: Provides a fast and scalable backend for handling requests and business logic
- MySQL: Suitable for structured relational data such as users, requests, and donations
- Firebase Cloud Messaging (FCM): Enables real-time push notifications for emergency cases

These technologies were chosen because they are reliable, widely used, and suitable for building scalable real-time applications like Wasl.
