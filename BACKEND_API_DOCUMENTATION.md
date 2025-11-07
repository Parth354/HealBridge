# HealBridge Backend API Documentation

## Base URL
**Production**: `https://healbridgebackend.onrender.com`
**Local Development**: `http://localhost:3000`

## Authentication
All API requests require Firebase ID Token in the Authorization header:
```
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

### Authentication Flow
1. User logs in with Firebase (Google Sign-in)
2. Firebase returns ID token
3. Mobile app includes token in all API requests
4. Backend verifies Firebase token and finds/creates user in PostgreSQL
5. Backend attaches user info to request: `{ userId, role, patientId, doctorId, firebaseUid }`

---

## Patient API Endpoints

### Base Path: `/api/patient`

### 1. Profile Management

#### GET `/api/patient/profile`
Get patient profile from Firestore with sync
- **Auth**: Required (Firebase token)
- **Response**:
```json
{
  "success": true,
  "profile": {
    "uid": "firebase_uid",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+91-9876543210",
    "dob": "1990-01-01",
    "gender": "Male",
    "address": {
      "houseNo": "123",
      "locality": "Main Street",
      "city": "Delhi",
      "state": "Delhi",
      "pinCode": "110001"
    },
    "language": "English",
    "consentDataUse": true,
    "consentNotifications": true
  },
  "synced": true
}
```

#### PUT `/api/patient/profile`
Update patient profile in Firestore
- **Auth**: Required
- **Body**: Profile data (same structure as GET response)

#### GET `/api/patient/data/complete`
Get complete patient data (profile + appointments + medications + documents)
- **Auth**: Required

#### POST `/api/patient/sync/force`
Force profile sync from Firestore to PostgreSQL
- **Auth**: Required

---

### 2. Doctor Search

#### GET `/api/patient/doctors/search`
Search for doctors with filters
- **Auth**: Required
- **Query Parameters**:
  - `specialty` (optional): Doctor specialty
  - `lat` (optional): Latitude for location-based search
  - `lon` (optional): Longitude for location-based search
  - `visitType` (optional): CLINIC or HOUSE
  - `sortBy` (optional): distance, rating, fee (default: distance)
  - `maxDistance` (optional): Max distance in km (default: 50)
  - `minRating` (optional): Minimum rating (default: 0)
  - `limit` (optional): Results limit (default: 20)

- **Response**:
```json
{
  "doctors": [
    {
      "id": "doctor_id",
      "user": {
        "firstName": "Dr. John",
        "lastName": "Smith"
      },
      "specialty": "Cardiologist",
      "experience": 10,
      "rating": 4.5,
      "consultationFee": 500,
      "clinics": [
        {
          "id": "clinic_id",
          "name": "Apollo Hospital",
          "address": "Delhi",
          "lat": 28.6139,
          "lon": 77.2090
        }
      ],
      "distance": 2.5
    }
  ],
  "count": 10
}
```

#### GET `/api/patient/doctors/{doctorId}/clinics/{clinicId}/availability`
Get doctor availability for a specific date
- **Auth**: Required
- **Query Parameters**:
  - `date` (required): Date in YYYY-MM-DD format

- **Response**:
```json
{
  "date": "2024-01-15",
  "slots": [
    {
      "startTs": "2024-01-15T09:00:00Z",
      "endTs": "2024-01-15T09:30:00Z",
      "isAvailable": true
    }
  ]
}
```

---

### 3. Appointment Booking (2-Step Process)

#### Step 1: Create Slot Hold
**POST** `/api/patient/bookings/hold`
Reserve a slot for 2 minutes
- **Auth**: Required
- **Body**:
```json
{
  "doctorId": "doctor_id",
  "clinicId": "clinic_id",
  "startTs": "2024-01-15T09:00:00Z",
  "endTs": "2024-01-15T09:30:00Z"
}
```

- **Response**:
```json
{
  "holdId": "hold_id",
  "expiresAt": "2024-01-15T09:02:00Z",
  "expiresInSeconds": 120
}
```

#### Step 2: Confirm Appointment
**POST** `/api/patient/bookings/confirm`
Convert hold to confirmed appointment
- **Auth**: Required
- **Body**:
```json
{
  "holdId": "hold_id",
  "visitType": "CLINIC",
  "address": null,
  "feeMock": 500,
  "symptoms": "Chest pain",
  "notes": "First visit"
}
```

- **Response**:
```json
{
  "success": true,
  "appointment": {
    "id": "appointment_id",
    "doctor_id": "doctor_id",
    "clinic_id": "clinic_id",
    "patient_id": "patient_id",
    "startTs": "2024-01-15T09:00:00Z",
    "endTs": "2024-01-15T09:30:00Z",
    "status": "CONFIRMED",
    "visitType": "CLINIC",
    "feeMock": 500,
    "doctor": {
      "user": {
        "firstName": "Dr. John",
        "lastName": "Smith"
      },
      "specialty": "Cardiologist"
    },
    "clinic": {
      "name": "Apollo Hospital",
      "address": "Delhi"
    }
  }
}
```

---

### 4. Appointment Management

#### GET `/api/patient/appointments`
Get patient appointments
- **Auth**: Required
- **Query Parameters**:
  - `status` (optional): CONFIRMED, STARTED, COMPLETED, CANCELLED, RESCHEDULED

- **Response**:
```json
{
  "appointments": [
    {
      "id": "appointment_id",
      "startTs": "2024-01-15T09:00:00Z",
      "endTs": "2024-01-15T09:30:00Z",
      "status": "CONFIRMED",
      "visitType": "CLINIC",
      "feeMock": 500,
      "doctor": {
        "user": {
          "firstName": "Dr. John",
          "lastName": "Smith"
        },
        "specialty": "Cardiologist"
      },
      "clinic": {
        "name": "Apollo Hospital",
        "address": "Delhi"
      },
      "checkedInAt": null,
      "consultStartedAt": null,
      "consultEndedAt": null
    }
  ],
  "count": 5
}
```

#### POST `/api/patient/appointments/{appointmentId}/checkin`
Check-in for appointment
- **Auth**: Required
- **Response**: Updated appointment object

#### DELETE `/api/patient/appointments/{appointmentId}`
Cancel appointment
- **Auth**: Required
- **Response**:
```json
{
  "success": true,
  "appointment": {
    "id": "appointment_id",
    "status": "CANCELLED"
  }
}
```

#### GET `/api/patient/appointments/{appointmentId}/waittime`
Get wait time estimate
- **Auth**: Required
- **Response**:
```json
{
  "estimatedWaitMinutes": 15,
  "queuePosition": 3,
  "message": "Approximately 15 minutes"
}
```

---

### 5. Triage (Symptom Analysis)

#### POST `/api/patient/triage/analyze`
Analyze symptoms and recommend specialist
- **Auth**: Required
- **Body**:
```json
{
  "symptoms": "chest pain, shortness of breath"
}
```

- **Response**:
```json
{
  "urgency": "HIGH",
  "recommendedSpecialty": "Cardiologist",
  "message": "Please seek immediate medical attention",
  "symptoms": ["chest pain", "shortness of breath"]
}
```

#### GET `/api/patient/triage/categories`
Get symptom categories
- **Auth**: Required
- **Response**:
```json
{
  "categories": [
    {
      "name": "Cardiac",
      "symptoms": ["chest pain", "palpitations"]
    }
  ]
}
```

---

### 6. Prescriptions & Medications

#### GET `/api/patient/prescriptions`
Get patient prescriptions
- **Auth**: Required
- **Response**:
```json
{
  "prescriptions": [
    {
      "id": "prescription_id",
      "appointmentId": "appointment_id",
      "diagnosis": "Hypertension",
      "medications": [
        {
          "name": "Aspirin",
          "dosage": "100mg",
          "frequency": "Once daily",
          "duration": "30 days"
        }
      ]
    }
  ],
  "count": 5
}
```

#### GET `/api/patient/medications/reminders`
Get today's medication reminders
- **Auth**: Required

#### POST `/api/patient/medications/{medicationId}/taken`
Mark medication as taken
- **Auth**: Required

---

### 7. Documents & Patient Summary

#### POST `/api/patient/documents/upload`
Upload medical document (prescription, lab report)
- **Auth**: Required
- **Content-Type**: multipart/form-data
- **Body**:
  - `file`: Document file
  - `docType`: PRESCRIPTION, LAB_REPORT, etc.

#### GET `/api/patient/summary`
Get AI-generated patient summary
- **Auth**: Required
- **Response**: Patient medical summary with RAG

---

## Data Models

### Appointment Status Flow
```
CONFIRMED → STARTED → COMPLETED
         ↓
    CANCELLED
         ↓
   RESCHEDULED
```

### Visit Types
- `CLINIC`: In-person clinic visit
- `HOUSE`: Home visit

### User Roles
- `PATIENT`: Mobile app users
- `DOCTOR`: Web app users

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": "Missing required field: doctorId"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

### 503 Service Unavailable (Database wake-up)
```json
{
  "error": "Database temporarily unavailable",
  "message": "Please try again in a moment",
  "retryAfter": 5
}
```

---

## Important Notes

1. **Firebase Authentication**: All patient requests must use Firebase ID tokens
2. **Slot Hold TTL**: Slot holds expire after 2 minutes (120 seconds)
3. **Database Wake-up**: First request after inactivity may take 30-60 seconds (Render free tier)
4. **Rate Limiting**: 100 requests per 15 minutes per IP
5. **OTP Rate Limiting**: 5 OTP requests per hour per IP
6. **File Upload Limit**: 10MB maximum
7. **Token Refresh**: Firebase tokens should be refreshed before expiry
8. **Timezone**: All timestamps are in UTC (ISO 8601 format)

---

## Mobile App Integration Checklist

- [x] ApiClient configured with base URL
- [x] TokenInterceptor adds Firebase token to requests
- [x] NetworkResult wrapper for API responses
- [ ] Update BASE_URL to production: `https://healbridgebackend.onrender.com/`
- [ ] Update ApiService endpoints to match backend routes
- [ ] Update data models to match backend response structure
- [ ] Implement 2-step booking flow (hold → confirm)
- [ ] Handle 503 errors with retry logic for database wake-up
- [ ] Add loading states for slow initial requests
- [ ] Implement token refresh logic
- [ ] Add error handling for expired holds
- [ ] Test with production backend
