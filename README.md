# HealBridge - Complete Healthcare Platform

A comprehensive healthcare platform connecting patients with doctors through intelligent triage, seamless booking, and AI-powered medical assistance.

## 📱 App Screenshots

| Onboarding & Triage | Doctor Search | Booking Flow | Consultation |
|---------------------|---------------|--------------|--------------|
| ![p1](./screenshots/p1.png) | ![p2](./screenshots/p2.png) | ![p3](./screenshots/p3.png) | ![p4](./screenshots/p4.png) |

## 🏥 Complete Workflow: Start to Finish

### 1. Patient App: Onboarding → Booking → Visit → Aftercare

#### **Install → Launch**
- Pick language → enable voice assist
- OTP login via phone number
- Create patient profile (name, DOB, gender, allergies, chronic conditions, emergency contact)
- Consent for data use and notifications

#### **Home (Triage + Discovery)**
- Input symptoms by text/voice → AI triage suggests specialty and urgency bucket: **Immediate**, **Scheduled**, **House Visit**
- Set location permission → Map shows nearby clinics or home-visit coverage
- **Filters**: distance, fee, rating, next-available, house-visit, teleconsult toggle, language spoken

#### **Availability Search**
- Query by specialty + location → doctors sorted by Haversine distance
- Tie-break by earliest slot and rating
- Each doctor card shows next three slots, fee, avg waiting time in real-time

#### **Select Pathway**
- **Immediate**: Pick earliest slot today; if none, join live queue or waitlist
- **Scheduled**: Pick future slot
- **House Visit**: Pick address + time window within doctor's service radius

#### **Slot Hold → Confirmation**
- Tap slot → system creates 2-minute SlotHold
- Confirm details → optional mock payment → convert hold to Appointment atomically
- Receive confirmation screen + push/SMS/email + ICS "Add to Calendar"

#### **Pre-Visit Prep**
- Upload external prescriptions or lab PDFs/photos (**OCR powered**)
- Connect prior labs via partner picker (future)
- Auto-generated "Summary for Doctor" visible to user
- **T-24h**: reminder + pre-visit form (vitals, complaints)
- **T-1h**: reminder with deep link for navigation (Google/Apple Maps with clinic lat/lon)
- Live doctor status and avg wait estimate shown

#### **Arrival and Wait**
- At clinic: tap "I've arrived" or scan desk QR to check in
- Real-time queue shows estimated start time; updates as doctor progresses

#### **Consultation**
- Doctor views **RAG chat** over patient history + OCR'd meds/reports
- Doctor prescribes digitally; optional lab orders

#### **Post-Visit**
- Prescription delivered as push + in-app + email PDF
- Structured meds saved to vault
- Auto medicine reminders: schedule built from dosage, frequency, duration
- Feedback prompt; share with family "care circle" if enabled

#### **Aftercare**
- Refill reminders, one-tap reorder (future)
- Follow-up suggestion generated based on diagnosis and typical pathways
- All reports and prescriptions searchable with **voice queries** supported

### 2. Doctor App: Onboarding → Schedule → Consult → Analytics

#### **Onboarding**
- KYC + license upload → Async verification vs registry
- Add clinics with address, lat/lon, service radius, fees, visit types supported
- Set working hours, breaks, slot length, buffer, tele/house-visit toggles

#### **Live Schedule**
- Unified calendar with online bookings + receptionist entries
- Walk-in QR queue visible and merged
- Emergency toggle to pause or mark leave; triggers auto-reschedule workflow

#### **Pre-Visit Context**
- For each upcoming patient: summary card with problems, allergies, meds timeline, last vitals, recent labs
- **RAG chat** to ask: "show last HbA1c and statin history," "compare BP last 3 visits"

#### **During Consult**
- One-tap timers start/stop to learn true consult durations
- E-prescription builder with autocomplete, dosage templates, language selection for patient copy

#### **Post-Consult**
- Send prescription to user (push + email)
- Mark follow-up recommended; set slot templates
- **Analytics**: avg consult duration, no-show %, utilization, revenue, patient NPS

## 🔧 Key System Workflows

### **A. Availability + Conflict-Free Booking**
- Precompute per-doctor slot tables daily from ScheduleBlocks minus breaks/holidays
- On slot tap: create `SlotHold(id, doctor_id, start_ts, end_ts, ttl=120s)`
- Confirm: single DB transaction promotes SlotHold → Appointment with unique index `(doctor_id, start_ts)`
- Concurrent channels (reception, online) use the same path

### **B. Notifications**
- **Channels**: push, SMS, email with retry/backoff
- **Triggers**: booking instant, T-24h, T-1h, post-visit prescription, medicine reminders
- **Navigation deep links**:
  - Android: `geo:0,0?q=<lat>,<lon>(ClinicName)`
  - iOS: `http://maps.apple.com/?q=ClinicName&ll=<lat>,<lon>`

### **C. OCR Ingestion**
- **Inputs**: image/PDF
- **Steps**: detect page → OCR → sectioner → NER for drug, strength, form, frequency, route, duration → normalize to RxNorm-like internal catalog
- Store both raw file and structured meds
- Flag low-confidence items for user confirmation

### **D. Per-User RAG for Doctors**
- **Sources**: structured prescriptions, OCR'd external docs, visit notes, labs
- **Chunking**: semantic sections with medication tables kept intact
- **Index**: per-patient vector store; metadata tags: source, date, doc type, clinician
- **Query**: doctor question → retrieve top-k + time-aware rerank → grounded answer with citations to original docs
- **Guardrails**: PHI stays per-patient; no cross-patient retrieval

### **E. Avg Waiting Time (Real-Time)**
- **Inputs**: planned slots, consult timers, check-ins, no-shows, lateness, overrun model per doctor × weekday × hour
- **Estimate**: `ETT(patient) = max(0, start_ts − now) + backlog_minutes × overrun_factor`
- Update every 30–60s or on events: check-in, start/stop consult, cancel

### **F. Emergency Reschedule**
- Doctor marks emergency → find same-specialty within 5–8 km with slots or tele
- Offer users: reschedule, switch doctor, or refund (mock)
- Notify with one-tap confirm; cascade calendar updates

### **G. License Verification**
- Async job checks registry; manual review fallback
- Doctor status gates visibility in search

## 🗄️ Data Model (MVP)

```sql
-- Core entities
user(id, role[patient|doctor|staff], phone, email, language, verified)
doctor(id, user_id, specialties[], license_no, verified_status, rating)
clinic(id, doctor_id, name, lat, lon, address, house_visit_radius_km)

-- Scheduling
schedule_block(id, doctor_id, clinic_id, start_ts, end_ts, slot_min, buffer_min, type[work|break|holiday])
slot_hold(id, doctor_id, clinic_id, patient_id, start_ts, end_ts, ttl_expires_at, status)
appointment(id, doctor_id, clinic_id, patient_id, start_ts, end_ts, status, visit_type[clinic|tele|house], fee_mock)

-- Medical records
prescription(id, appointment_id, pdf_url, summary_json, sent_at)
medication(id, prescription_id, name, strength, form, freq, route, duration_days, start_date, reminders_enabled)
document(id, patient_id, type[prescription|lab|report], file_url, text, structured_json, ocr_conf)

-- AI & Search
rag_chunk(id, patient_id, doc_id, chunk_text, embedding, meta)
notification(id, user_id, appointment_id, type, channel, scheduled_at, sent_at, status)
```

## 🔌 APIs in Call Order (Happy Path)

1. `POST /auth/otp` → `POST /auth/verify`
2. `GET /triage?symptoms=...` → returns specialty, urgency bucket
3. `GET /doctors?specialty=cardio&lat=..&lon=..&visit=clinic|house&sort=distance|next_available`
4. `GET /doctors/{id}/availability?date=YYYY-MM-DD`
5. `POST /slot_holds {doctor_id, clinic_id, start_ts}` → `{hold_id, expires_at}`
6. `POST /appointments {hold_id, patient_id, visit_type, address?}`
7. `POST /documents {file}` → `{doc_id}` → `POST /documents/{id}/ocr`
8. `GET /patients/{id}/summary` → used for doctor preview and RAG grounding
9. `POST /prescriptions {appointment_id, items[...]}` → returns pdf_url
10. `POST /notifications {type='prescription_mail', to=email, link=pdf_url}`
11. `POST /medication_reminders {medication_id, schedule[]}`
12. `POST /checkin {appointment_id}`
13. `POST /consult/{appointment_id}/start` → `/stop`
14. `POST /appointments/{id}/reschedule` or `/cancel`

## ⚡ Events and Jobs (Queues)

- `appointment.booked`, `appointment.reminder_24h`, `appointment.reminder_1h`
- `navigation.link.generated`
- `document.ocr.completed` → `rag.index.update`
- `prescription.created` → `notify.email` + `notify.push` → `meds.schedule.create`
- `doctor.status.updated` → `wait_time.recompute`
- `schedule.rebuild.daily`
- `license.verify.requested` → `license.verify.completed`

## 🔒 Security and Access

- **RBAC**: patient sees own data; doctor sees assigned appointments; staff limited to clinic
- All PHI at rest encrypted; audit logs on read/write
- Idempotent APIs with request_id to avoid double bookings
- PII minimization in logs; redact in traces

## 📊 KPI Targets

- Search→book median ≤ 90s
- Availability API p95 ≤ 150ms
- Double-booking rate = 0 with 200 rps concurrent attempts
- T-1h reminder delivery success ≥ 99%
- OCR micro-F1 on drug extraction ≥ 0.92 on internal set
- RAG answer citation coverage = 100% of outputs

## 🚀 Implementation Workflow

### **Slide 1: Discover → Book**
- Symptom triage → specialty + urgency
- Map + filters (Immediate/Scheduled/House)
- Slot hold → Confirm → Calendar + reminders

### **Slide 2: Prepare → Visit**
- OCR prior prescriptions → Summary view
- T-1h nav link + live wait time
- Check-in → Consult timer → E-Rx

### **Slide 3: Aftercare → Intelligence**
- Prescription mail + push
- Med reminders + refills
- Doctor analytics; RAG chat for context; continuous wait-time learning

## 🛠️ Tech Stack

### **Backend**
- **Runtime**: Node.js + Express
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis
- **Queue**: Bull/BullMQ
- **AI**: OpenAI GPT-4 + Embeddings
- **OCR**: Google Vision API / Tesseract
- **Deployment**: Render / Railway

### **Frontend**
- **Mobile**: React Native + Expo
- **Web**: React + Vite
- **State**: Zustand / Redux Toolkit
- **Navigation**: React Navigation
- **UI**: NativeBase / Tamagui

### **Infrastructure**
- **Storage**: AWS S3 / Cloudinary
- **CDN**: CloudFlare
- **Monitoring**: Sentry + LogRocket
- **Analytics**: Mixpanel / PostHog

## 🏃‍♂️ Quick Start

### **Prerequisites**
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Expo CLI

### **Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Configure DATABASE_URL, REDIS_URL, etc.
npx prisma migrate dev
npm run dev
```

### **Mobile App Setup**
```bash
cd apps/HealBridge
npm install
npx expo start
```

### **Doctor Web App Setup**
```bash
cd healthBridge-Doctor/frontend
npm install
npm run dev
```

## 🔧 Edge Cases and Resolutions

- **Overlapping channels**: single writer transaction on `(doctor_id, start_ts)`
- **Late doctor**: auto-push new ETA; offer switch or tele-upgrade
- **No-show**: mark; auto-invite waitlist; adjust future estimates
- **Low OCR confidence**: request user confirm before reminders
- **Emergency leave**: batch reschedule workflow with ranked alternatives

## 🎯 What to Build First (Hackathon Cut)

### **Day 1**
Auth, doctor search + availability, slot hold→book, notifications, prescription PDF, email send, basic OCR stub, medication reminders scheduler

### **Day 2**
Check-in + live wait time, doctor portal with summary and RAG over prescriptions, navigation deep link, reschedule/cancel, license status flag

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

For support, email support@healbridge.com or join our Slack channel.

---

**HealBridge** - Bridging the gap between patients and healthcare providers through intelligent technology.