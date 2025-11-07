# HealBridge Complete Workflow & Database Sync Design

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Patient App   │    │  Doctor Web App │    │   Backend API   │
│   (Firebase)    │◄──►│   (React)       │◄──►│ (Node.js/Prisma)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Firebase/Firestore│    │   PostgreSQL    │    │   Supabase      │
│ (Patient Data)  │    │ (Core System)   │    │ (Documents/RAG) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Edge Functions │
                    │ (OCR + RAG)     │
                    └─────────────────┘
```

## 📋 Complete User Journey Workflow

### 1️⃣ PATIENT ONBOARDING & DISCOVERY

#### A. App Installation & Setup
```
Patient App (Firebase) → Backend API → PostgreSQL
```

**Flow:**
1. **Install & Launch** → Language selection → Voice assist setup
2. **Firebase Auth** → Phone OTP → Create Firebase user
3. **Profile Creation** → Store in Firestore:
   ```json
   {
     "uid": "firebase_uid",
     "name": "John Doe",
     "dob": "1990-01-01",
     "gender": "Male",
     "phone": "+919876543210",
     "allergies": ["Penicillin"],
     "chronicConditions": ["Hypertension"],
     "emergencyContact": "+919876543211",
     "language": "en",
     "consentGiven": true
   }
   ```
4. **Sync to Backend** → Create user in PostgreSQL:
   ```sql
   INSERT INTO users (firebase_uid, phone, role, verified)
   VALUES ('firebase_uid', '+919876543210', 'PATIENT', true);
   ```

#### B. Home Screen Triage
```
Patient Input → Backend Triage API → Specialty Recommendation
```

**Implementation:**
- **Symptom Input**: Text/Voice → NLP processing
- **Triage Logic**: Symptoms → Specialty mapping
- **Urgency Classification**: Immediate/Scheduled/House Visit
- **Location Services**: GPS → Nearby clinics query

### 2️⃣ DOCTOR DISCOVERY & AVAILABILITY

#### A. Search & Filter
```sql
-- Backend Query: Find doctors by specialty and location
SELECT d.*, c.*, 
       (6371 * acos(cos(radians(?)) * cos(radians(c.lat)) * 
        cos(radians(c.lon) - radians(?)) + sin(radians(?)) * 
        sin(radians(c.lat)))) AS distance
FROM doctors d
JOIN clinics c ON d.user_id = c.doctor_id
WHERE d.specialties @> ARRAY[?]
  AND d.verified_status = 'VERIFIED'
ORDER BY distance, d.rating DESC;
```

#### B. Real-time Availability
```javascript
// Get available slots for next 7 days
const getAvailableSlots = async (doctorId, clinicId) => {
  const scheduleBlocks = await prisma.scheduleBlock.findMany({
    where: {
      doctor_id: doctorId,
      clinic_id: clinicId,
      type: 'work',
      startTs: { gte: new Date() }
    }
  });
  
  const bookedSlots = await prisma.appointment.findMany({
    where: {
      doctor_id: doctorId,
      clinic_id: clinicId,
      status: { in: ['CONFIRMED', 'STARTED'] }
    }
  });
  
  return generateAvailableSlots(scheduleBlocks, bookedSlots);
};
```

### 3️⃣ BOOKING WORKFLOW

#### A. Slot Hold Mechanism
```javascript
// 2-minute slot hold to prevent double booking
const createSlotHold = async (doctorId, clinicId, patientId, startTs, endTs) => {
  return await prisma.slotHold.create({
    data: {
      doctor_id: doctorId,
      clinic_id: clinicId,
      patient_id: patientId,
      start_ts: startTs,
      end_ts: endTs,
      ttl_expires_at: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
      status: 'HELD'
    }
  });
};
```

#### B. Atomic Booking Confirmation
```javascript
// Convert hold to appointment atomically
const confirmBooking = async (holdId, visitType, address, fee) => {
  return await prisma.$transaction(async (tx) => {
    const hold = await tx.slotHold.findUnique({ where: { id: holdId } });
    
    if (!hold || hold.ttl_expires_at < new Date()) {
      throw new Error('Slot hold expired');
    }
    
    const appointment = await tx.appointment.create({
      data: {
        doctor_id: hold.doctor_id,
        clinic_id: hold.clinic_id,
        patient_id: hold.patient_id,
        start_ts: hold.start_ts,
        end_ts: hold.end_ts,
        visit_type: visitType,
        address: address,
        fee_mock: fee,
        status: 'CONFIRMED'
      }
    });
    
    await tx.slotHold.delete({ where: { id: holdId } });
    
    return appointment;
  });
};
```

#### C. Multi-Channel Notifications
```javascript
const sendBookingConfirmation = async (appointment) => {
  const notifications = [
    { type: 'BOOKING_CONFIRMED', channel: 'PUSH', scheduled_at: new Date() },
    { type: 'REMINDER_24H', channel: 'PUSH', scheduled_at: new Date(appointment.start_ts - 24*60*60*1000) },
    { type: 'REMINDER_1H', channel: 'PUSH', scheduled_at: new Date(appointment.start_ts - 60*60*1000) }
  ];
  
  for (const notif of notifications) {
    await prisma.notification.create({
      data: {
        user_id: appointment.patient_id,
        appointment_id: appointment.id,
        ...notif
      }
    });
  }
};
```

### 4️⃣ PRE-VISIT PREPARATION

#### A. Document Upload & OCR
```javascript
// Patient uploads documents → Supabase Edge Function
const uploadDocument = async (file, patientId, type) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('patient_id', patientId);
  formData.append('type', type);
  
  const response = await fetch('/upload-document', {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${supabaseToken}`,
      'apikey': supabaseAnonKey
    }
  });
  
  return response.json();
};
```

#### B. Database Sync: Supabase → PostgreSQL
```javascript
// Sync document metadata to main database
const syncDocumentToPostgres = async (supabaseDoc) => {
  await prisma.document.create({
    data: {
      id: supabaseDoc.id,
      patient_id: supabaseDoc.patient_id,
      type: supabaseDoc.type,
      file_url: supabaseDoc.file_url,
      text: supabaseDoc.text,
      structured_json: supabaseDoc.structured_json,
      ocr_confidence: supabaseDoc.ocr_confidence
    }
  });
  
  // Sync medications if extracted
  if (supabaseDoc.structured_data?.medications) {
    for (const med of supabaseDoc.structured_data.medications) {
      await prisma.medication.create({
        data: {
          patient_id: supabaseDoc.patient_id,
          document_id: supabaseDoc.id,
          name: med.name,
          strength: med.strength,
          form: med.form,
          frequency: med.frequency,
          route: med.route,
          duration_days: med.duration_days,
          start_date: new Date()
        }
      });
    }
  }
};
```

### 5️⃣ VISIT DAY WORKFLOW

#### A. Check-in Process
```javascript
// Patient arrives and checks in
const checkIn = async (appointmentId, location) => {
  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: 'CHECKED_IN',
      checked_in_at: new Date(),
      patient_location: location
    }
  });
  
  // Update real-time queue
  await updateWaitingQueue(appointment.doctor_id, appointment.clinic_id);
  
  return appointment;
};
```

#### B. Real-time Wait Estimation
```javascript
const calculateWaitTime = async (doctorId, clinicId) => {
  const currentTime = new Date();
  const todayAppointments = await prisma.appointment.findMany({
    where: {
      doctor_id: doctorId,
      clinic_id: clinicId,
      start_ts: {
        gte: new Date(currentTime.toDateString()),
        lte: new Date(currentTime.getTime() + 24*60*60*1000)
      },
      status: { in: ['CONFIRMED', 'CHECKED_IN', 'STARTED'] }
    },
    orderBy: { start_ts: 'asc' }
  });
  
  // Calculate based on doctor's average consultation time and current backlog
  const avgConsultTime = await getDoctorAvgConsultTime(doctorId);
  const backlogMinutes = todayAppointments.length * avgConsultTime;
  
  return Math.max(0, backlogMinutes);
};
```

### 6️⃣ CONSULTATION WORKFLOW

#### A. Doctor Pre-consultation Context
```javascript
// Generate patient summary using RAG
const getPatientContext = async (patientId, query) => {
  const response = await fetch('/patient-summary', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${supabaseToken}`,
      'apikey': supabaseAnonKey
    },
    params: {
      patient_id: patientId,
      query: query || 'Provide complete medical history summary'
    }
  });
  
  return response.json();
};
```

#### B. Consultation Timer & Analytics
```javascript
const startConsultation = async (appointmentId) => {
  return await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: 'STARTED',
      consult_started_at: new Date()
    }
  });
};

const endConsultation = async (appointmentId) => {
  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: 'COMPLETED',
      consult_ended_at: new Date()
    }
  });
  
  // Update doctor analytics
  await updateDoctorAnalytics(appointment.doctor_id, appointment);
  
  return appointment;
};
```

### 7️⃣ POST-VISIT & PRESCRIPTION

#### A. Digital Prescription Creation
```javascript
const createPrescription = async (appointmentId, medications, diagnosis) => {
  const prescription = await prisma.prescription.create({
    data: {
      appointment_id: appointmentId,
      summary_json: {
        diagnosis,
        medications,
        followUp: true,
        notes: 'Take medications as prescribed'
      }
    }
  });
  
  // Create individual medication records
  for (const med of medications) {
    await prisma.medication.create({
      data: {
        patient_id: appointment.patient_id,
        prescription_id: prescription.id,
        ...med,
        start_date: new Date(),
        reminders_enabled: true
      }
    });
  }
  
  // Generate PDF and send notifications
  await generatePrescriptionPDF(prescription);
  await sendPrescriptionNotification(prescription);
  
  return prescription;
};
```

#### B. Cross-Database Sync
```javascript
// Sync prescription to Supabase for RAG indexing
const syncPrescriptionToSupabase = async (prescription) => {
  const supabaseDoc = await supabase
    .from('documents')
    .insert({
      patient_id: prescription.appointment.patient_id,
      type: 'prescription',
      file_url: prescription.pdf_url,
      text: generatePrescriptionText(prescription),
      structured_json: prescription.summary_json,
      ocr_confidence: 1.0
    });
  
  // Create RAG chunks for future queries
  await createRAGChunks(supabaseDoc.id, prescription);
};
```

## 🔄 Database Synchronization Strategy

### 1. User Data Flow
```
Firebase (Patient Auth) → PostgreSQL (Core System) → Supabase (Documents)
```

### 2. Document Flow
```
Patient App → Supabase Edge Function (OCR) → Supabase DB → PostgreSQL (Metadata)
```

### 3. Appointment Flow
```
Patient App → PostgreSQL (Booking) → Doctor Web App → PostgreSQL (Updates)
```

### 4. Prescription Flow
```
Doctor Web App → PostgreSQL (Create) → Supabase (RAG Indexing) → Patient App (Notification)
```

## 🚀 Implementation Priorities

### Phase 1: Core Booking System
- [ ] Slot hold mechanism
- [ ] Atomic booking confirmation
- [ ] Real-time availability
- [ ] Basic notifications

### Phase 2: Document Management
- [ ] OCR integration with Supabase
- [ ] Cross-database sync
- [ ] RAG implementation
- [ ] Patient summary generation

### Phase 3: Advanced Features
- [ ] Real-time wait estimation
- [ ] Emergency rescheduling
- [ ] Analytics dashboard
- [ ] Medicine reminders

### Phase 4: Optimization
- [ ] Performance tuning
- [ ] Caching strategies
- [ ] Mobile app optimization
- [ ] Doctor workflow improvements

## 🔧 Critical Sync Points

1. **User Creation**: Firebase → PostgreSQL
2. **Document Upload**: Supabase → PostgreSQL metadata
3. **Prescription Creation**: PostgreSQL → Supabase RAG
4. **Appointment Updates**: Real-time across all systems
5. **Notification Delivery**: Multi-channel coordination

This workflow ensures data consistency across Firebase (patient auth), PostgreSQL (core system), and Supabase (documents/RAG) while maintaining the user experience described in your use case.