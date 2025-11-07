# Real OTP Verification Integration

## ✅ Completed Integration

The frontend now uses **real backend OTP authentication** instead of mock verification.

---

## 🔧 Changes Made

### 1. **Created New Auth API File** (`src/api/authApi.js`)
- `sendOTP(phone)` - Send OTP to phone number
- `sendEmailOTP(email)` - Send OTP to email
- `verifyOTP(identifier, otp, role)` - Verify OTP and get JWT token
- `getCurrentUser(token)` - Get current user with token
- `createDoctorProfile(token, profileData)` - Create doctor profile

### 2. **Updated AuthContext** (`src/context/AuthContext.jsx`)
- Added `sendOTPCode(identifier, type)` - Sends OTP via backend
- Added `verifyOTPCode(otp)` - Verifies OTP with backend
- Added `authToken` state - Stores JWT token
- Added `pendingAuth` state - Stores identifier during OTP flow
- Added user transformation from backend format to frontend format
- Added automatic token validation on app load

### 3. **Updated Login Page** (`src/pages/Login.jsx`)
- Changed from mock `login()` to real `sendOTPCode()`
- Sends OTP to backend when form is submitted
- Supports both email and phone number login

### 4. **Updated Verify Page** (`src/pages/Verify.jsx`)
- Changed from mock verification to real `verifyOTPCode()`
- Displays the identifier (phone/email) being verified
- Real resend OTP functionality
- Handles profile completion flow
- Validates pending auth session

---

## 🔄 Authentication Flow

### **Step 1: Login** (`/login`)
1. User enters phone number or email
2. Frontend validates input
3. Calls `sendOTPCode(identifier, type)`
4. Backend sends OTP via Twilio SMS (or console in dev mode)
5. `pendingAuth` state stores identifier
6. User redirected to `/verify`

### **Step 2: Verification** (`/verify`)
1. User enters 6-digit OTP
2. Frontend calls `verifyOTPCode(otp)` with stored identifier
3. Backend verifies OTP from Redis
4. On success:
   - Returns JWT token + user data
   - Frontend stores token in sessionStorage
   - Frontend transforms user data
   - Redirects to `/dashboard` or `/settings` (if profile incomplete)

### **Step 3: Session Persistence**
1. Token stored in `sessionStorage` as `authToken`
2. User data stored as `doctor`
3. On page reload, AuthContext validates token with backend
4. If valid, user stays logged in
5. If invalid, user redirected to `/login`

---

## 🔐 Security Features

✅ **JWT Token Authentication** - Secure token-based auth  
✅ **OTP Expiry** - OTPs expire after 5 minutes  
✅ **Rate Limiting** - Backend has rate limits on OTP endpoints  
✅ **Session Storage** - Tokens stored securely  
✅ **Auto Token Validation** - Validates token on app load  
✅ **Protected Routes** - Redirects to login if not authenticated  

---

## 🧪 Testing the Integration

### **Development Mode** (No Twilio)
If Twilio credentials are not in `.env`, the backend logs OTP to console:

```
📱 DEV MODE - OTP for +919876543210: 123456
   (Configure Twilio in .env for production SMS)
```

Check the **backend terminal** for the OTP code.

### **Production Mode** (With Twilio)
1. Add to backend `.env`:
   ```
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_number
   ```
2. OTP will be sent via real SMS

---

## 📡 Backend API Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/otp/send` | POST | Send OTP to phone/email |
| `/api/auth/otp/verify` | POST | Verify OTP and login |
| `/api/auth/me` | GET | Get current user (Protected) |
| `/api/auth/doctor/profile` | POST | Create doctor profile (Protected) |

---

## 🔑 Required Environment Variables (Backend)

```env
# Twilio (for SMS OTP)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# JWT Secret
JWT_SECRET=your_jwt_secret_key

# Redis (for OTP storage)
REDIS_HOST=localhost
REDIS_PORT=6379

# Database
DATABASE_URL=your_mongodb_connection_string
```

---

## 🚀 Running the Complete Flow

### 1. Start Backend
```bash
cd backend
npm install
npm run dev
```

### 2. Start Frontend
```bash
cd healthBridge-Doctor/frontend
npm install
npm run dev
```

### 3. Test the Flow
1. Go to `http://localhost:5173/login`
2. Enter phone number (e.g., `9876543210`)
3. Click "Send OTP"
4. Check backend terminal for OTP (in dev mode)
5. Enter the OTP in verify page
6. You should be logged in and redirected to dashboard!

---

## 🎯 Next Steps

- [ ] Add email OTP support in backend
- [ ] Implement doctor profile completion form
- [ ] Add forgot password functionality
- [ ] Implement refresh token mechanism
- [ ] Add biometric authentication option
- [ ] Implement multi-factor authentication

---

## 📝 Notes

- **Role**: All doctors login with role `'DOCTOR'` 
- **OTP Expiry**: 5 minutes (300 seconds)
- **Token Storage**: sessionStorage (cleared on browser close)
- **Backend Port**: 3000
- **Frontend Port**: 5173

---

## ⚠️ Important

Make sure your backend is running on `http://localhost:3000` or update the `API_BASE_URL` in:
- `frontend/src/api/client.js`
- `frontend/src/utils/constants.js`

---

**Integration completed successfully!** 🎉

