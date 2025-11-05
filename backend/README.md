# HealBridge Backend

Comprehensive healthcare platform backend with patient and doctor interfaces.

## Features

### Patient Features
- 🔐 OTP-based authentication
- 🩺 AI-powered symptom triage
- 🔍 Doctor search with filters (distance, specialty, rating)
- 📅 Real-time appointment booking with slot holds
- ⏰ Live wait time estimates
- 📄 OCR for prescription/report uploads
- 💊 Medication reminders
- 🌐 Multi-language support
- 🧭 Navigation deep links

### Doctor Features
- 👨‍⚕️ License verification
- 📋 Schedule management (recurring patterns)
- 🏥 Multi-clinic support
- 💬 RAG-powered patient history chat
- 📝 Digital prescription generation
- 📊 Analytics dashboard
- 🚨 Emergency leave handling
- ⏱️ Real-time status tracking

### Advanced Features
- 🤖 RAG (Retrieval Augmented Generation) for patient history
- 📸 OCR for external prescriptions
- 🔔 Multi-channel notifications (Email, SMS, Push)
- 🚑 Emergency reschedule workflow
- ⏳ Real-time wait time calculation
- 📈 Doctor analytics
- 🔄 Automatic slot conflict prevention

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Cache/Queue:** Redis + Bull
- **Storage:** AWS S3
- **Email:** Nodemailer (SMTP)
- **OCR:** Tesseract.js + PDF-Parse
- **AI/RAG:** OpenAI API + LangChain
- **Auth:** JWT

## Setup

### Prerequisites
- Node.js 16+
- PostgreSQL 14+
- Redis 6+
- AWS Account (for S3)
- OpenAI API key (optional, for RAG)

### Installation

1. **Clone and install dependencies:**
```bash
cd HealBridge/backend
npm install
```

2. **Setup environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Setup database:**
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Or push schema (for development)
npm run prisma:push
```

4. **Start Redis:**
```bash
redis-server
```

5. **Start the server:**
```bash
# Development
npm run dev

# Production
npm start
```

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication

All authenticated endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

### Endpoints

#### Auth API (`/api/auth`)
- `POST /otp/send` - Send OTP to phone
- `POST /otp/verify` - Verify OTP and login
- `GET /me` - Get current user
- `POST /patient/profile` - Create patient profile
- `POST /doctor/profile` - Create doctor profile
- `PUT /language` - Update language preference

#### Patient API (`/api/patient`)
- `POST /triage/analyze` - Analyze symptoms
- `GET /triage/categories` - Get triage categories
- `GET /doctors/search` - Search doctors
- `GET /doctors/:doctorId/clinics/:clinicId/availability` - Get availability
- `POST /bookings/hold` - Create slot hold
- `POST /bookings/confirm` - Confirm appointment
- `GET /appointments` - Get appointments
- `POST /appointments/:id/checkin` - Check-in
- `GET /appointments/:id/waittime` - Get wait time
- `POST /documents/upload` - Upload document (OCR)
- `GET /summary` - Get patient summary
- `GET /prescriptions` - Get prescriptions
- `GET /medications/reminders` - Get medication reminders
- `POST /medications/:id/taken` - Mark medication taken

#### Doctor API (`/api/doctor`)
- `POST /verification/request` - Request license verification
- `GET /verification/status` - Get verification status
- `POST /clinics` - Add clinic
- `GET /clinics` - Get clinics
- `POST /schedule` - Create schedule block
- `POST /schedule/recurring` - Create recurring schedule
- `GET /schedule` - Get schedule
- `GET /appointments` - Get appointments
- `POST /appointments/:id/start` - Start consultation
- `POST /appointments/:id/end` - End consultation
- `GET /appointments/:id/patient-context` - Get patient context
- `POST /patients/:id/query` - Query patient history (RAG)
- `POST /prescriptions` - Create prescription
- `GET /statistics` - Get analytics
- `POST /emergency/leave` - Handle emergency leave

## Database Schema

Key models:
- **User** - Base user with role (PATIENT/DOCTOR/STAFF)
- **Patient** - Patient profile with medical history
- **Doctor** - Doctor profile with specialties and verification
- **Clinic** - Clinic locations with geo-coordinates
- **ScheduleBlock** - Doctor working hours
- **SlotHold** - Temporary slot reservation (2 min TTL)
- **Appointment** - Confirmed appointments
- **Prescription** - Digital prescriptions
- **Medication** - Medication records with reminders
- **Document** - Uploaded documents with OCR
- **RagChunk** - Vector embeddings for RAG
- **Notification** - Multi-channel notifications
- **WaitTimeEstimate** - Historical wait time data

## Architecture

### Services Layer
- **AuthService** - Authentication and user management
- **TriageService** - Symptom analysis
- **DoctorService** - Doctor search and availability
- **BookingService** - Appointment booking with conflict prevention
- **ScheduleService** - Schedule management
- **NotificationService** - Multi-channel notifications
- **OCRService** - Document OCR processing
- **RAGService** - Patient history retrieval and chat
- **PrescriptionService** - Prescription generation
- **MedicationService** - Medication reminders
- **WaitTimeService** - Real-time wait time calculation
- **LicenseService** - Doctor verification
- **EmergencyService** - Emergency reschedule workflow

### Queue Jobs
- Notification delivery (email, SMS, push)
- OCR processing
- RAG indexing
- License verification
- Wait time updates
- Medication reminders

## Development

### Project Structure
```
backend/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── prisma/          # Prisma schema
│   └── server.js        # Main server file
├── temp/                # Temporary files
├── .env                 # Environment variables
└── package.json
```

### Key Design Patterns
- **Service Layer Pattern** - Business logic separated from controllers
- **Repository Pattern** - Database access through Prisma
- **Queue Pattern** - Background jobs with Bull
- **Middleware Pattern** - Authentication, validation, error handling

### Conflict Prevention
The booking system uses:
1. Unique index on `(doctor_id, start_ts, end_ts, status)`
2. Transaction-based slot confirmation
3. 2-minute TTL slot holds
4. Redis-based hold tracking

## Deployment

### Environment Variables
Update `.env` for production:
- Use strong JWT_SECRET
- Configure proper CORS origins
- Setup production database
- Configure AWS S3 for file storage
- Setup email service
- Add OpenAI API key for RAG

### Database Migration
```bash
npm run prisma:migrate
```

### Production Start
```bash
NODE_ENV=production npm start
```

## Monitoring

Health check endpoint:
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-05T10:30:00.000Z",
  "uptime": 12345,
  "environment": "production"
}
```

## Contributing

1. Follow existing code structure
2. Add proper error handling
3. Write validation schemas
4. Test with multiple concurrent requests
5. Document API changes

## License

Proprietary - HealBridge Healthcare Platform

## Support

For issues and questions, contact the development team.

