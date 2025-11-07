# Backend Integration Status

## ✅ Completed Integration

### 1. **Authentication**
- ✅ Real OTP send/verify via `/api/auth/otp/*`
- ✅ JWT token storage and auto-inclusion
- ✅ User session management
- ✅ Token validation on app load

### 2. **API Layer** (`src/api/doctorApi.js`)
All backend endpoints integrated:

**Schedule Management:**
- ✅ `POST /doctor/schedule` - Create schedule
- ✅ `POST /doctor/schedule/recurring` - Recurring schedule
- ✅ `POST /doctor/schedule/unavailable` - Mark unavailable
- ✅ `GET /doctor/schedule` - Get schedule

**Appointments:**
- ✅ `GET /doctor/appointments` - Get appointments
- ✅ `POST /doctor/appointments/:id/start` - Start consultation
- ✅ `POST /doctor/appointments/:id/end` - End consultation

**Patient Context & RAG:**
- ✅ `GET /doctor/appointments/:id/patient-context` - Patient summary
- ✅ `POST /doctor/patients/:id/query` - RAG query

**Prescriptions:**
- ✅ `POST /doctor/prescriptions` - Create prescription

**Analytics:**
- ✅ `GET /doctor/statistics` - Get statistics
- ✅ `GET /doctor/status` - Current status

**Clinic Management:**
- ✅ `POST /doctor/clinics` - Add clinic
- ✅ `GET /doctor/clinics` - Get clinics

**License Verification:**
- ✅ `POST /doctor/verification/request` - Request verification
- ✅ `GET /doctor/verification/status` - Get status

**Emergency:**
- ✅ `POST /doctor/emergency/leave` - Emergency leave

**Wait Time:**
- ✅ `POST /doctor/waittime/update` - Update factors

### 3. **Custom Hooks** (`src/hooks/`)
- ✅ `useAppointments(date)` - Fetch appointments
- ✅ `useStartConsultation()` - Start consultation mutation
- ✅ `useEndConsultation()` - End consultation mutation
- ✅ `usePatientContext(appointmentId)` - Fetch patient context

### 4. **Pages Updated**
- ✅ **Login** - Real OTP sending
- ✅ **Verify** - Real OTP verification
- ✅ **Dashboard** - Real statistics from backend

---

## 🚧 Pending Integration

### Pages to Update:

**Schedule Page:**
- [ ] Use `getSchedule()` API
- [ ] Use `getAppointments()` for appointments list
- [ ] Add schedule creation form
- [ ] Add unavailable marking

**Patient Summary:**
- [ ] Use `getPatientContext()` API
- [ ] Use `queryPatientHistory()` for RAG chat
- [ ] Display real patient data

**Consult Page:**
- [ ] Use `startConsultation()` on timer start
- [ ] Use `endConsultation()` on timer stop
- [ ] Use `createPrescription()` API

**Analytics:**
- [ ] Use `getStatistics()` API with date ranges
- [ ] Display real charts from backend data

**Settings (New Page):**
- [ ] Profile management
- [ ] Clinic CRUD operations
- [ ] License verification status
- [ ] Request verification

**Navbar:**
- [ ] Emergency leave toggle
- [ ] Use `handleEmergencyLeave()` API

---

## 📋 Backend API Endpoints Reference

### Base URL
```
http://localhost:3000/api
```

### Headers Required
```javascript
{
  'Authorization': 'Bearer <JWT_TOKEN>',
  'Content-Type': 'application/json'
}
```

### Authentication Flow
```
1. POST /auth/otp/send { phone }
2. POST /auth/otp/verify { phone, otp, role: 'DOCTOR' }
   → Returns: { token, user }
3. Store token in sessionStorage as 'authToken'
4. Include token in all subsequent requests
```

### Schedule Endpoints

**Create Schedule:**
```javascript
POST /doctor/schedule
{
  "clinic_id": "string",
  "startTs": "2024-11-06T09:00:00Z",
  "endTs": "2024-11-06T17:00:00Z",
  "slotDuration": 30
}
```

**Get Schedule:**
```javascript
GET /doctor/schedule?startDate=2024-11-06&endDate=2024-11-07
```

### Appointments Endpoints

**Get Appointments:**
```javascript
GET /doctor/appointments?date=2024-11-06
```

**Start Consultation:**
```javascript
POST /doctor/appointments/:appointmentId/start
```

**End Consultation:**
```javascript
POST /doctor/appointments/:appointmentId/end
```

### Patient Context

**Get Patient Summary:**
```javascript
GET /doctor/appointments/:appointmentId/patient-context
```

**RAG Query:**
```javascript
POST /doctor/patients/:patientId/query
{
  "query": "What medications is the patient currently taking?"
}
```

### Prescription

**Create Prescription:**
```javascript
POST /doctor/prescriptions
{
  "appointment_id": "string",
  "patient_id": "string",
  "medications": [
    {
      "name": "Amoxicillin",
      "dosage": "500mg",
      "frequency": "Twice daily",
      "duration": 7,
      "instructions": "Take with food"
    }
  ],
  "diagnosis": "string",
  "notes": "string"
}
```

### Statistics

**Get Statistics:**
```javascript
GET /doctor/statistics?startDate=2024-10-01&endDate=2024-11-06

Response:
{
  "stats": {
    "totalAppointments": 156,
    "completed": 142,
    "cancelled": 8,
    "noShows": 6,
    "avgConsultTime": 24,
    "revenue": 234000
  },
  "period": { "start": "...", "end": "..." }
}
```

### Clinic Management

**Add Clinic:**
```javascript
POST /doctor/clinics
{
  "name": "Cardiology Clinic",
  "lat": 28.5921,
  "lon": 77.0460,
  "address": "Dwarka, New Delhi",
  "houseVisitRadiusKm": 5
}
```

**Get Clinics:**
```javascript
GET /doctor/clinics
```

### License Verification

**Request Verification:**
```javascript
POST /doctor/verification/request
```

**Get Status:**
```javascript
GET /doctor/verification/status

Response:
{
  "verifiedStatus": "PENDING|VERIFIED|REJECTED",
  "requestedAt": "...",
  "verifiedAt": "..."
}
```

### Emergency Leave

**Handle Emergency:**
```javascript
POST /doctor/emergency/leave
{
  "startTime": "2024-11-06T10:00:00Z",
  "endTime": "2024-11-06T12:00:00Z",
  "reason": "Personal emergency"
}
```

---

## 🔐 Authentication Middleware

Backend requires:
1. **authenticate** - Valid JWT token
2. **requireDoctorProfile** - User must have doctor profile
3. **requireVerifiedDoctor** - Doctor must be verified (for most endpoints)

---

## 🎯 Next Steps

1. Update Schedule page with real APIs
2. Update PatientSummary with RAG integration
3. Update Consult page with real consultation flow
4. Create Settings page
5. Add emergency leave to Navbar
6. Test complete flow end-to-end

---

## 🚀 Running the Application

### Backend:
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:3000
```

### Frontend:
```bash
cd healthBridge-Doctor/frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Test Flow:
1. Login with phone number
2. Get OTP from backend logs (dev mode)
3. Verify OTP
4. Access dashboard with real statistics
5. View appointments
6. Start/end consultations
7. Create prescriptions
8. View analytics

---

## 📝 Important Notes

- **Token expiry**: JWT tokens expire (check backend config)
- **Doctor verification**: Some endpoints require verified doctor status
- **Database**: Ensure Prisma migrations are run
- **Redis**: Required for OTP storage
- **Date formats**: Use ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)

---

**Integration Progress: 40% Complete**

