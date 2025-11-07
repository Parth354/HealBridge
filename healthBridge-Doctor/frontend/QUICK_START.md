# 🚀 Quick Start Guide - Testing Backend Integration

## ✅ Everything is Integrated!

Your doctor platform is now 100% integrated with the Express.js backend.

---

## 🏃 Running the Application

### Terminal 1: Backend
```bash
cd HealBridge/backend
npm run dev
```
**Expected:** Backend running on `http://localhost:3000`

### Terminal 2: Frontend
```bash
cd HealBridge/healthBridge-Doctor/frontend
npm run dev
```
**Expected:** Frontend running on `http://localhost:5173`

---

## 🧪 Quick Test Checklist

### 1. ✅ Authentication (5 min)
- [ ] Go to `http://localhost:5173/login`
- [ ] Enter phone: `9876543210`
- [ ] Click **"Send OTP"**
- [ ] Check backend console for OTP code
- [ ] Enter OTP and click **"Verify"**
- [ ] Should redirect to Dashboard

**What's happening:**
- Frontend calls `POST /api/auth/otp/send`
- Backend generates OTP and saves to Redis
- Frontend calls `POST /api/auth/otp/verify`
- Backend returns JWT token
- Token stored and used for all future requests

---

### 2. ✅ Dashboard (2 min)
**Check:**
- [ ] Statistics cards showing real data
- [ ] Today's appointments listed
- [ ] Quick action buttons work

**What's happening:**
- `GET /doctor/statistics` - fetches real stats
- `GET /doctor/appointments` - fetches today's appointments
- All data from your backend database

---

### 3. ✅ Schedule Page (3 min)
- [ ] Click **"Schedule"** in sidebar
- [ ] Select different dates
- [ ] Try filtering by status
- [ ] Click **"Mark Leave"** - should show success

**What's happening:**
- `GET /doctor/appointments?date=YYYY-MM-DD`
- `POST /doctor/schedule/unavailable` - for leave

---

### 4. ✅ Patient Summary with RAG Chat (5 min)
- [ ] From Schedule, click on an appointment
- [ ] Click **"View Patient Summary"**
- [ ] View patient context loaded from backend
- [ ] Try RAG chat in right panel:
  - Type: "What medications is the patient taking?"
  - Type: "Any allergies?"
  - Type: "Show recent lab results"

**What's happening:**
- `GET /doctor/appointments/:id/patient-context`
- `POST /doctor/patients/:id/query` - RAG powered search
- AI searches through patient history

---

### 5. ✅ Start Consultation (5 min)
- [ ] From appointment, click **"Start Consultation"**
- [ ] Timer should start
- [ ] Add prescription:
  - Type medicine name (autocomplete)
  - Select dosage, frequency
  - Add duration
  - Click **"Add to Prescription"**
- [ ] Click **"Send to Patient"**
- [ ] Should see success message

**What's happening:**
- `POST /doctor/appointments/:id/start` - starts consultation
- `POST /doctor/prescriptions` - creates prescription
- `POST /doctor/appointments/:id/end` - ends consultation
- Backend notifies patient

---

### 6. ✅ Analytics (2 min)
- [ ] Click **"Analytics"** in sidebar
- [ ] Try different date ranges (Week/Month/Year)
- [ ] Check KPI cards
- [ ] View charts

**What's happening:**
- `GET /doctor/statistics?startDate=...&endDate=...`
- Real data from backend aggregated by date range

---

### 7. ✅ Settings - Clinic Management (3 min)
- [ ] Click **"Settings"** in sidebar
- [ ] Go to **"Clinics"** tab
- [ ] Click **"Add New Clinic"**
- [ ] Fill in:
  - Name: "Heart Care Clinic"
  - Address: "Sector 12, Dwarka, Delhi"
  - Radius: 5 km
- [ ] Click **"Add Clinic"**
- [ ] Should see clinic added

**What's happening:**
- `GET /doctor/clinics` - lists clinics
- `POST /doctor/clinics` - adds new clinic

---

### 8. ✅ Settings - License Verification (2 min)
- [ ] In Settings, go to **"Verification"** tab
- [ ] View current status
- [ ] Click **"Request Verification"**
- [ ] Should see success message

**What's happening:**
- `GET /doctor/verification/status`
- `POST /doctor/verification/request`

---

### 9. ✅ Emergency Leave (1 min)
- [ ] Click **"Emergency Off"** button in top navbar
- [ ] Should turn red and say **"Emergency On"**
- [ ] Check success toast

**What's happening:**
- `POST /doctor/emergency/leave`
- Marks next 24 hours unavailable
- All appointments paused

---

## 🎯 Key API Calls Happening

When you use the app, here's what's happening behind the scenes:

| User Action | Frontend | Backend Endpoint | Result |
|-------------|----------|-----------------|--------|
| Login with phone | `authApi.sendOTP()` | `POST /api/auth/otp/send` | OTP sent |
| Verify OTP | `authApi.verifyOTP()` | `POST /api/auth/otp/verify` | JWT token |
| View dashboard | `getDashboardStats()` | `GET /doctor/statistics` | Real stats |
| View schedule | `getAppointments()` | `GET /doctor/appointments` | Appointments |
| View patient | `getPatientContext()` | `GET /doctor/appointments/:id/patient-context` | Patient data |
| RAG query | `queryPatientHistory()` | `POST /doctor/patients/:id/query` | AI search |
| Start consult | `startConsultation()` | `POST /doctor/appointments/:id/start` | Timer starts |
| Create Rx | `createPrescription()` | `POST /doctor/prescriptions` | Rx created |
| View analytics | `getAnalytics()` | `GET /doctor/statistics` | Charts data |
| Add clinic | `addClinic()` | `POST /doctor/clinics` | Clinic added |
| Mark leave | `markUnavailable()` | `POST /doctor/schedule/unavailable` | Leave marked |

---

## 🔍 Debugging

### If something doesn't work:

1. **Check Backend Console**
   - Look for API calls
   - Check for errors

2. **Check Browser Console** (F12)
   - Look for network errors
   - Check failed API calls

3. **Check Network Tab** (F12 → Network)
   - See actual requests/responses
   - Verify JWT token is being sent

4. **Common Issues:**

**Issue:** "Token invalid"
- **Solution:** Login again, token might have expired

**Issue:** "Cannot connect to backend"
- **Solution:** Make sure backend is running on port 3000

**Issue:** "No appointments showing"
- **Solution:** Backend database might be empty, add test data

---

## 📊 Expected Data Flow

```
User Login (Phone + OTP)
    ↓
Get JWT Token
    ↓
Store token in localStorage
    ↓
All API calls include JWT in headers
    ↓
Backend validates JWT
    ↓
Returns requested data
    ↓
Frontend displays data
```

---

## 🎉 Success Criteria

After testing, you should see:

✅ Login works with real OTP  
✅ Dashboard shows real statistics  
✅ Schedule loads actual appointments  
✅ Patient context displays correctly  
✅ RAG chat responds to queries  
✅ Consultation timer works  
✅ Prescriptions are created  
✅ Analytics show real data  
✅ Clinics can be added  
✅ Emergency mode activates  

---

## 📝 Test Data Suggestions

If you don't have data in backend, create test data:

**Test Doctor:**
- Phone: 9876543210
- Name: Dr. Amit Verma
- Specialization: Cardiology

**Test Patient:**
- Phone: 9876543211
- Name: Rajesh Kumar
- Age: 45

**Test Appointment:**
- Date: Today
- Time: Current time
- Status: BOOKED

Use backend seeding scripts or create manually through Prisma Studio:
```bash
cd backend
npx prisma studio
```

---

## 🚨 Important Notes

1. **OTP in Development Mode:**
   - Check backend console for OTP
   - In production, it will be sent via Twilio SMS

2. **JWT Token:**
   - Valid for 7 days
   - Auto-included in all requests
   - Stored in localStorage

3. **CORS:**
   - Backend allows `http://localhost:5173`
   - Update if using different port

4. **Database:**
   - MongoDB must be running
   - Redis must be running (for OTP)

---

## 🎯 Next: Go Test!

1. **Start both servers**
2. **Open browser**: `http://localhost:5173`
3. **Login with**: 9876543210
4. **Test each feature** using checklist above
5. **Check backend logs** to see API calls

**Everything should work perfectly! 🎉**

---

Need help? Check:
- `INTEGRATION_COMPLETE.md` - Full integration details
- `BACKEND_INTEGRATION.md` - API reference
- `OTP_INTEGRATION.md` - Auth flow details

**Happy Testing! 🚀**

