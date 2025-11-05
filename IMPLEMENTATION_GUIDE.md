# HealBridge Implementation Guide

## Complete Healthcare Platform - Implementation Workflow

This document provides a comprehensive guide to the HealBridge platform implementation, covering all 13 requirements plus additional features.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Feature Implementation](#feature-implementation)
3. [API Workflow](#api-workflow)
4. [Database Design](#database-design)
5. [Deployment Guide](#deployment-guide)
6. [Testing Strategy](#testing-strategy)

---

## System Overview

### Architecture
```
┌─────────────────┐         ┌─────────────────┐
│   Patient App   │         │   Doctor App    │
│   (React Native)│         │  (React Native) │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └───────────┬───────────────┘
                     │
              ┌──────▼──────┐
              │   Express   │
              │   Backend   │
              └──────┬──────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────▼───┐  ┌────▼────┐  ┌───▼────┐
   │ Postgres│  │  Redis  │  │  AWS   │
   │         │  │  Queue  │  │   S3   │
   └─────────┘  └─────────┘  └────────┘
```

### Tech Stack

**Backend:**
- Node.js + Express
- PostgreSQL + Prisma ORM
- Redis + Bull (queue)
- AWS S3 (storage)
- OpenAI API (RAG)
- Tesseract.js (OCR)

**Frontend (Future):**
- React Native (Expo)
- React Native Paper (UI)
- Redux Toolkit (state)
- React Navigation

---

## Feature Implementation

### 1. Notifications + Mail for Prescription ✅

**Implementation:**
- `NotificationService` with multi-channel support (Email, SMS, Push)
- Bull queue for async delivery
- Email templates for booking, reminders, prescriptions
- Deep links for navigation

**Files:**
- `services/notification.service.js`
- `controllers/patient.controller.js` (getPrescriptions)

**API Endpoints:**
- Automatic notifications on prescription creation
- T-24h and T-1h appointment reminders
- Medication reminders

---

### 2. Two Interfaces - Doctor & Patient ✅

**Implementation:**
- Separate route handlers: `/api/patient` and `/api/doctor`
- Role-based authentication middleware
- Profile-specific controllers

**Files:**
- `routes/patient.routes.js`
- `routes/doctor.routes.js`
- `controllers/patient.controller.js`
- `controllers/doctor.controller.js`
- `middleware/auth.middleware.js`

**Patient Interface:**
- Symptom triage
- Doctor search & booking
- Appointments & prescriptions
- Medication tracking

**Doctor Interface:**
- Schedule management
- Patient consultations
- Prescription creation
- Analytics dashboard

---

### 3. Patient History + Prescription Sharing ✅

**Implementation:**
- RAG-powered patient summary generation
- Automatic summary available to doctor when appointment is scheduled
- Query interface for doctors to ask questions about patient history

**Files:**
- `services/rag.service.js`
- `controllers/doctor.controller.js` (getPatientContext, queryPatientHistory)

**API Endpoints:**
- `GET /api/patient/summary` - Patient's own summary
- `GET /api/doctor/appointments/:id/patient-context` - Doctor views patient context
- `POST /api/doctor/patients/:id/query` - RAG query interface

---

### 4. Real-time Navigation ✅

**Implementation:**
- Deep links for Google Maps, Apple Maps, Waze
- Generated with clinic lat/lon
- Sent in T-1h reminder notification

**Files:**
- `services/notification.service.js` (generateNavigationLinks)

**Deep Link Formats:**
```javascript
{
  google: "geo:0,0?q=lat,lon(ClinicName)",
  apple: "http://maps.apple.com/?q=ClinicName&ll=lat,lon",
  waze: "https://waze.com/ul?ll=lat,lon&navigate=yes"
}
```

---

### 5. Category-Based Discovery ✅

**Implementation:**
- Three urgency buckets: IMMEDIATE, SCHEDULED, HOUSE_VISIT
- AI triage suggests category based on symptoms
- Filters in doctor search

**Files:**
- `services/triage.service.js`
- `controllers/patient.controller.js` (getCategories)

**API Endpoints:**
- `POST /api/patient/triage/analyze` - Analyze symptoms
- `GET /api/patient/triage/categories` - Get categories

**Categories:**
1. **Immediate Requirement** - Urgent care, chest pain, breathing issues
2. **Appointment Schedule** - Routine checkups, non-urgent care
3. **House Visit Available** - Home consultations, elderly care

---

### 6. Multilanguage Support & Voice Assistance ✅

**Implementation:**
- User language preference stored in database
- Voice input support for symptom entry (frontend)
- Prescription generation in user's preferred language

**Files:**
- `services/auth.service.js` (updateLanguage)
- `controllers/auth.controller.js`

**API Endpoints:**
- `PUT /api/auth/language` - Update language preference

**Supported Languages:**
- English, Hindi, Telugu, Tamil, Bengali, Marathi, etc.

---

### 7. Testing Partners + Reports on App ✅

**Implementation:**
- Document upload with OCR
- Structured data extraction from lab reports
- Integration-ready for lab partners

**Files:**
- `services/ocr.service.js`
- `controllers/patient.controller.js` (uploadDocument)

**API Endpoints:**
- `POST /api/patient/documents/upload` - Upload report/prescription

**Future Prospect:**
- Partner picker for lab test booking
- Direct report integration from lab APIs

---

### 8. Patient Summary from History ✅

**Implementation:**
- Comprehensive summary generation
- Includes: demographics, visit history, current medications, past prescriptions, insights
- Automatic generation on doctor access

**Files:**
- `services/rag.service.js` (generatePatientSummary)

**Summary Contents:**
- Patient demographics (age, gender, allergies, chronic conditions)
- Visit history (last 10 visits)
- Current medications
- Medication timeline
- Uploaded documents
- AI-generated insights (polypharmacy check, allergy warnings)

---

### 9. Average Waiting Time (Real-time) ✅

**Implementation:**
- Real-time queue position tracking
- Historical overrun factor calculation
- Per-doctor, per-time-slot learning
- Updated every event (check-in, start, end consultation)

**Files:**
- `services/waittime.service.js`
- `controllers/patient.controller.js` (getWaitTime)

**API Endpoints:**
- `GET /api/patient/appointments/:id/waittime` - Get wait estimate

**Calculation:**
```
ETT = max(0, scheduled_start - now) + 
      (patients_ahead × avg_consult_time × overrun_factor)
```

---

### 10. Upload External Prescriptions (OCR) ✅

**Implementation:**
- Tesseract.js for image OCR
- PDF-Parse for PDF extraction
- NER for medication extraction (drug, strength, form, frequency, route, duration)
- Confidence scoring
- User confirmation flow for low-confidence extractions

**Files:**
- `services/ocr.service.js`
- `controllers/patient.controller.js` (uploadDocument)

**Extracted Fields:**
- Medicine name (normalized to common catalog)
- Strength & form (e.g., 500mg tablet)
- Frequency (e.g., 2x daily)
- Route (oral, IV, topical)
- Duration (7 days, 2 weeks)
- Doctor info, date, license number (metadata)

---

### 11. RAG for Patient History ✅

**Implementation:**
- OpenAI embeddings (text-embedding-ada-002)
- Per-patient vector store
- Semantic chunking with overlap
- Cosine similarity for retrieval
- GPT-4 for answer generation
- Citation tracking

**Files:**
- `services/rag.service.js`

**API Endpoints:**
- `POST /api/doctor/patients/:id/query` - Ask questions about patient

**Example Queries:**
- "Show last HbA1c and statin history"
- "Has this patient had any cardiac issues?"
- "What was prescribed for their diabetes in the last 6 months?"

**RAG Pipeline:**
1. Query → Embedding
2. Retrieve top-K chunks by similarity
3. Rerank by date + relevance
4. Generate answer with citations
5. Return with source references

---

### 12. Medication Reminders ✅

**Implementation:**
- Cron-based scheduler (hourly + 15-min intervals)
- Frequency parsing (1x daily, BD, TDS, etc.)
- Custom time slots
- Refill reminders (3 days before end)
- Adherence tracking

**Files:**
- `services/medication.service.js`
- `controllers/patient.controller.js`

**API Endpoints:**
- `GET /api/patient/medications/reminders` - Get today's reminders
- `POST /api/patient/medications/:id/reminders/enable` - Enable reminders
- `POST /api/patient/medications/:id/taken` - Mark as taken
- `GET /api/patient/medications/refills` - Get refill reminders

**Reminder Schedule:**
- 1x daily → 9 AM
- 2x daily (BD) → 9 AM, 9 PM
- 3x daily (TDS) → 8 AM, 2 PM, 8 PM
- 4x daily (QDS) → 8 AM, 12 PM, 4 PM, 8 PM
- Before meals → 7 AM, 12 PM, 6 PM
- After meals → 9 AM, 2 PM, 9 PM
- Bedtime → 10 PM

---

### 13. AI Triage with Symptom Analysis ✅

**Implementation:**
- Keyword-based matching (production-ready)
- OpenAI integration ready (optional)
- Specialty + urgency suggestion
- Confidence scoring

**Files:**
- `services/triage.service.js`
- `controllers/patient.controller.js` (analyzeSyptoms)

**API Endpoints:**
- `POST /api/patient/triage/analyze` - Analyze symptoms

**Workflow:**
```
User enters: "chest pain and shortness of breath"
    ↓
Triage analyzes keywords
    ↓
Suggests: Cardiology, IMMEDIATE urgency
    ↓
Recommendations: Seek immediate care, book earliest slot
```

---

## Additional Features Implemented

### A. License Verification ✅

**Implementation:**
- Async verification queue
- Format validation
- Medical registry check (integration-ready)
- Disciplinary status check
- Manual review fallback

**Files:**
- `services/license.service.js`
- `controllers/doctor.controller.js`

**API Endpoints:**
- `POST /api/doctor/verification/request`
- `GET /api/doctor/verification/status`

---

### B. Emergency Reschedule ✅

**Implementation:**
- Find alternative doctors (same specialty, nearby)
- Patient notification with options
- One-tap reschedule/switch/cancel
- Automatic slot hold for alternatives

**Files:**
- `services/emergency.service.js`
- `controllers/doctor.controller.js` (handleEmergencyLeave)

**API Endpoints:**
- `POST /api/doctor/emergency/leave`

**Patient Options:**
1. Switch to nearby doctor (top 3 alternatives shown)
2. Reschedule to later date
3. Cancel with refund

---

### C. Conflict-Free Booking ✅

**Implementation:**
- 2-minute slot hold with TTL
- Redis-based hold tracking
- Transaction-based confirmation
- Unique constraint: (doctor_id, start_ts, end_ts, status)

**Files:**
- `services/booking.service.js`
- `controllers/patient.controller.js`

**Workflow:**
```
User taps slot → SlotHold created (TTL=120s)
    ↓
User confirms → Transaction starts
    ↓
Check conflicts → Create Appointment
    ↓
Commit transaction → Send notifications
```

---

## API Workflow

### Patient Journey (Complete Flow)

#### 1. Onboarding
```bash
# Send OTP
POST /api/auth/otp/send
{ "phone": "9876543210" }

# Verify OTP
POST /api/auth/otp/verify
{ "phone": "9876543210", "otp": "123456" }
→ Returns JWT token

# Create profile
POST /api/auth/patient/profile
Headers: Authorization: Bearer <token>
{
  "name": "John Doe",
  "dob": "1990-01-01",
  "gender": "Male",
  "allergies": "Penicillin",
  "emergencyContact": "9876543211"
}

# Set language
PUT /api/auth/language
{ "language": "hi" }
```

#### 2. Triage & Discovery
```bash
# Analyze symptoms
POST /api/patient/triage/analyze
{ "symptoms": "fever and headache for 2 days" }
→ Returns: Specialty, Urgency, Recommendations

# Get categories
GET /api/patient/triage/categories
→ Returns: IMMEDIATE, SCHEDULED, HOUSE_VISIT

# Search doctors
GET /api/patient/doctors/search?specialty=Cardiology&lat=28.6139&lon=77.2090&sortBy=distance
→ Returns: List of doctors with next available slots
```

#### 3. Booking
```bash
# Get availability
GET /api/patient/doctors/{doctorId}/clinics/{clinicId}/availability?date=2025-11-10
→ Returns: Available time slots

# Create slot hold
POST /api/patient/bookings/hold
{
  "doctorId": "...",
  "clinicId": "...",
  "startTs": "2025-11-10T10:00:00Z",
  "endTs": "2025-11-10T10:15:00Z"
}
→ Returns: holdId, expiresAt

# Confirm appointment (within 2 minutes)
POST /api/patient/bookings/confirm
{
  "holdId": "...",
  "visitType": "CLINIC"
}
→ Returns: Appointment details
→ Triggers: Email + SMS + Push notifications
```

#### 4. Pre-Visit
```bash
# Upload old prescription
POST /api/patient/documents/upload
FormData: file (image/PDF), docType: "PRESCRIPTION"
→ Returns: OCR extracted medications

# Get patient summary
GET /api/patient/summary
→ Returns: Complete medical history

# Get wait time (1 hour before)
GET /api/patient/appointments/{appointmentId}/waittime
→ Returns: Estimated wait time, queue position
```

#### 5. Visit
```bash
# Check-in at clinic
POST /api/patient/appointments/{appointmentId}/checkin
→ Updates queue

# Monitor wait time
GET /api/patient/appointments/{appointmentId}/waittime
→ Real-time updates
```

#### 6. Post-Visit
```bash
# Get prescriptions
GET /api/patient/prescriptions
→ Returns: All prescriptions with medications

# Enable medication reminders
POST /api/patient/medications/{medicationId}/reminders/enable
{ "customSchedule": [9, 21] }  // 9 AM, 9 PM

# Get today's reminders
GET /api/patient/medications/reminders
→ Returns: Reminder schedule

# Mark medication taken
POST /api/patient/medications/{medicationId}/taken
{ "takenAt": "2025-11-10T09:05:00Z" }
```

---

### Doctor Journey (Complete Flow)

#### 1. Onboarding
```bash
# Register (same as patient)
POST /api/auth/otp/send
POST /api/auth/otp/verify

# Create doctor profile
POST /api/auth/doctor/profile
{
  "specialties": ["Cardiology", "Internal Medicine"],
  "licenseNo": "MH12345"
}

# Add clinic
POST /api/doctor/clinics
{
  "name": "City Heart Clinic",
  "lat": 28.6139,
  "lon": 77.2090,
  "address": "123 Main St, Delhi",
  "houseVisitRadiusKm": 5
}

# Request verification
POST /api/doctor/verification/request
→ Triggers async verification job
```

#### 2. Schedule Setup
```bash
# Create recurring schedule
POST /api/doctor/schedule/recurring
{
  "clinicId": "...",
  "weekPattern": [
    { "day": 1, "startTime": "09:00", "endTime": "17:00" },  // Monday
    { "day": 2, "startTime": "09:00", "endTime": "17:00" },  // Tuesday
    // ...
  ],
  "startDate": "2025-11-01",
  "endDate": "2025-12-31",
  "slotMinutes": 15,
  "bufferMinutes": 5
}

# Mark break
POST /api/doctor/schedule/unavailable
{
  "startTs": "2025-11-10T13:00:00Z",
  "endTs": "2025-11-10T14:00:00Z",
  "type": "break"
}

# Get schedule
GET /api/doctor/schedule?startDate=2025-11-10&endDate=2025-11-10
```

#### 3. Daily Workflow
```bash
# Get today's appointments
GET /api/doctor/appointments?date=2025-11-10
→ Returns: List with patient check-in status

# Get current status
GET /api/doctor/status
→ Returns: In consultation, waiting count, completed count

# Start consultation
POST /api/doctor/appointments/{appointmentId}/start
→ Starts timer

# Get patient context
GET /api/doctor/appointments/{appointmentId}/patient-context
→ Returns: Full patient summary

# Query patient history (RAG)
POST /api/doctor/patients/{patientId}/query
{ "query": "Show recent blood pressure readings" }
→ Returns: AI-generated answer with citations

# Create prescription
POST /api/doctor/prescriptions
{
  "appointmentId": "...",
  "medications": [
    {
      "name": "Metformin",
      "strength": "500mg",
      "form": "tablet",
      "freq": "2x daily",
      "route": "oral",
      "durationDays": 30
    }
  ],
  "diagnosis": "Type 2 Diabetes Mellitus",
  "notes": "Follow up in 1 month",
  "followUpDays": 30,
  "labTests": ["HbA1c", "Lipid Profile"]
}
→ Generates PDF, sends email, creates medication records

# End consultation
POST /api/doctor/appointments/{appointmentId}/end
→ Stops timer, updates average consult time
```

#### 4. Analytics
```bash
# Get statistics
GET /api/doctor/statistics?startDate=2025-11-01&endDate=2025-11-30
→ Returns: Total appointments, completed, no-shows, revenue, avg consult time
```

#### 5. Emergency
```bash
# Handle emergency
POST /api/doctor/emergency/leave
{
  "startTime": "2025-11-10T14:00:00Z",
  "endTime": "2025-11-10T18:00:00Z",
  "reason": "Medical emergency"
}
→ Finds alternatives, notifies all affected patients
```

---

## Database Design

### Core Models

#### User
```prisma
model User {
  id         String   @id @default(cuid())
  role       UserRole // PATIENT | DOCTOR | STAFF
  phone      String   @unique
  email      String?  @unique
  language   String   @default("en")
  verified   Boolean  @default(false)
  patient    Patient?
  doctor     Doctor?
}
```

#### Patient
```prisma
model Patient {
  id                String   @id
  user_id           String   @unique
  name              String
  dob               DateTime
  gender            String
  allergies         String
  chronicConditions String
  emergencyContact  String
  appointments      Appointment[]
  documents         Document[]
  medications       Medication[]
}
```

#### Doctor
```prisma
model Doctor {
  id             String        @id
  user_id        String        @unique
  specialties    String[]
  licenseNo      String        @unique
  verifiedStatus LicenseStatus // PENDING | VERIFIED | REJECTED
  rating         Float         @default(0)
  avgConsultMin  Int           @default(15)
  clinics        Clinic[]
  appointments   Appointment[]
}
```

### Key Relationships

```
User 1───1 Patient
User 1───1 Doctor

Doctor 1───* Clinic
Doctor 1───* ScheduleBlock
Doctor 1───* Appointment

Patient 1───* Appointment
Patient 1───* Document
Patient 1───* Medication
Patient 1───* RagChunk

Appointment 1───1 Prescription
Prescription 1───* Medication
Document 1───* RagChunk
```

---

## Deployment Guide

### Prerequisites
```bash
# Install dependencies
cd backend
npm install

# Setup PostgreSQL
createdb healbridge

# Setup Redis
redis-server
```

### Environment Setup
```bash
# Copy example environment
cp env.example.txt .env

# Update .env with:
- DATABASE_URL (PostgreSQL connection string)
- REDIS_URL
- JWT_SECRET (use strong random key)
- AWS credentials (for S3)
- SMTP credentials (for email)
- OPENAI_API_KEY (for RAG)
```

### Database Migration
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Or push schema (development)
npm run prisma:push
```

### Start Server
```bash
# Development
npm run dev

# Production
NODE_ENV=production npm start
```

### Verify Deployment
```bash
# Health check
curl http://localhost:3000/health

# Test OTP
curl -X POST http://localhost:3000/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210"}'
```

---

## Testing Strategy

### Unit Tests
- Service layer functions
- Utility functions (haversineDistance, date parsing)
- Validation schemas

### Integration Tests
- API endpoints
- Database operations
- Queue jobs

### Load Tests
- Concurrent slot booking (200 rps)
- Queue position calculation
- Search performance

### E2E Tests
- Complete patient journey
- Complete doctor journey
- Emergency reschedule flow

### Test Scenarios

#### 1. Concurrent Booking
```javascript
// Simulate 100 users trying to book same slot
// Expect: Only 1 succeeds, 99 get "already booked" error
```

#### 2. Slot Hold Expiry
```javascript
// Create slot hold, wait 130 seconds
// Try to confirm → Expect: "hold expired" error
```

#### 3. OCR Accuracy
```javascript
// Upload 100 test prescriptions
// Measure: Precision, Recall, F1 for drug extraction
// Target: >92% F1 score
```

#### 4. RAG Citation Coverage
```javascript
// Query patient history 100 times
// Verify: Every answer has source citations
// Target: 100% citation coverage
```

---

## Performance Targets

- **Search → Book:** ≤ 90 seconds (median)
- **Availability API:** ≤ 150ms (p95)
- **Double-booking rate:** 0% with 200 rps
- **T-1h reminder delivery:** ≥ 99% success
- **OCR drug extraction:** ≥ 92% F1 score
- **RAG answer time:** ≤ 3 seconds

---

## Security Considerations

1. **Authentication:**
   - JWT with 7-day expiry
   - Secure OTP generation
   - Rate limiting on auth endpoints

2. **Authorization:**
   - Role-based access control
   - Resource ownership checks
   - Verified doctor requirement

3. **Data Protection:**
   - PHI encryption at rest
   - HTTPS for transit
   - Audit logs for all access

4. **API Security:**
   - Helmet for headers
   - CORS configuration
   - Input validation (Joi)
   - SQL injection prevention (Prisma)

---

## Future Enhancements

1. **Teleconsultation:**
   - WebRTC video calls
   - In-app chat
   - Screen sharing

2. **Payment Integration:**
   - Razorpay/Stripe
   - Wallet system
   - Insurance claims

3. **Lab Integration:**
   - Partner APIs
   - Direct report upload
   - Test booking

4. **Pharmacy Integration:**
   - Medicine delivery
   - Prescription sync
   - Stock availability

5. **AI Enhancements:**
   - Diagnosis suggestion
   - Drug interaction checking
   - Treatment plan optimization

6. **Analytics:**
   - Doctor performance trends
   - Patient health trends
   - Predictive modeling

---

## Contact & Support

For questions or issues:
- Documentation: See README.md
- API Docs: See backend/README.md
- Development Team: [Contact Info]

---

**Version:** 1.0.0  
**Last Updated:** November 2025  
**Platform:** HealBridge Healthcare System


