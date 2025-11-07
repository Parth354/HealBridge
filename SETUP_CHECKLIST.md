# Setup Checklist - Firebase Gmail Login Integration

## ⚡ Critical Steps (Must Complete Before Running)

### 1. Backend Database Migration
```bash
cd backend
npx prisma migrate dev --name add_firebase_support
npx prisma generate
```

**Why:** Adds `firebase_uid` field to User table. Without this, authentication will fail.

**Expected Output:**
```
✔ Generated Prisma Client
✔ The migration has been applied successfully
```

---

### 2. Configure Backend URL in Android App

**File:** `apps/HealBridge/app/src/main/java/com/example/healbridge/ApiService.kt`

**Line 22:** Change `BASE_URL` based on your environment:

#### For Android Emulator:
```kotlin
private const val BASE_URL = "http://10.0.2.2:3000"
```

#### For Physical Device:
1. Find your computer's local IP:
   - Windows: `ipconfig` → Look for IPv4 Address
   - Mac/Linux: `ifconfig` → Look for inet address
2. Update URL:
```kotlin
private const val BASE_URL = "http://192.168.1.XXX:3000" // Replace XXX with your IP
```

#### For Production:
```kotlin
private const val BASE_URL = "https://your-api-domain.com"
```

---

### 3. Backend Environment Variables

**File:** `backend/.env`

Ensure these variables exist:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/healbridge
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-change-this
FIREBASE_PROJECT_ID=healbridge-dd480
```

---

## 📋 Pre-Flight Checklist

Before starting the app, verify:

- [ ] PostgreSQL is running
- [ ] Redis is running
- [ ] Backend dependencies installed (`npm install`)
- [ ] Database migration completed
- [ ] Backend server is running (`npm run dev`)
- [ ] Android Gradle sync completed
- [ ] Backend URL is correct in `ApiService.kt`
- [ ] Internet permission exists in `AndroidManifest.xml` ✅ (Already present)

---

## 🚀 Launch Commands

### Terminal 1 - Start Backend Server
```bash
cd backend
npm run dev
```

**Expected Output:**
```
✅ Firebase Admin initialized with project ID
✅ Twilio SMS client initialized (or warning if not configured)
Server running on port 3000
Connected to database
Connected to Redis
```

### Terminal 2 - Build Android App
```bash
cd apps/HealBridge
./gradlew assembleDebug
```

Or click "Run" in Android Studio.

---

## ✅ Verification Steps

### 1. Backend Health Check

**Test if backend is running:**
```bash
curl http://localhost:3000/api/auth/me
```

**Expected Response:**
```json
{"error":"Authentication required"}
```

This confirms the backend is running and authentication middleware is working.

---

### 2. Firebase Configuration Check

**Backend logs should show:**
```
✅ Firebase Admin initialized with project ID
```

If you see:
```
⚠️ Firebase credentials not configured
```

**Fix:** Add `FIREBASE_PROJECT_ID=healbridge-dd480` to `.env` and restart backend.

---

### 3. Test Login Flow

1. Launch Android app
2. Tap "Sign in with Google"
3. Select Google account
4. Watch logs:

**Android Logcat (Filter: ApiService):**
```
D/ApiService: Firebase token obtained, length: 1234
D/ApiService: Sending Firebase login request to backend...
D/ApiService: Response code: 200
D/Login: ✅ Backend authentication successful
```

**Backend Console:**
```
✅ Authenticated via Firebase token: cm123abc...
✅ Created new user cm123abc... with Firebase UID xyz789...
```

---

## 🐛 Common Issues & Fixes

### Issue 1: "Network error: Connection refused"

**Symptom:** Android app can't connect to backend

**Fixes:**
- **Emulator:** Ensure using `http://10.0.2.2:3000`
- **Device:** Ensure using correct local IP (e.g., `http://192.168.1.100:3000`)
- **Both:** Ensure backend server is running
- **Both:** Check firewall isn't blocking port 3000

**Test connectivity:**
```bash
# On your computer
curl http://localhost:3000/api/auth/me

# From Android (if using physical device)
# Open Chrome on phone and visit: http://YOUR_IP:3000/api/auth/me
```

---

### Issue 2: "Invalid Firebase token"

**Symptom:** Backend returns "Invalid Firebase token" error

**Fixes:**
- Check `FIREBASE_PROJECT_ID` in `.env` matches Firebase project
- Restart backend after changing `.env`
- Verify `google-services.json` is in correct location
- Check Firebase Console for project ID

---

### Issue 3: Database Migration Failed

**Symptom:** `prisma migrate` command fails

**Fixes:**
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env` is correct
- Ensure database exists: `createdb healbridge`
- Check connection: `psql $DATABASE_URL`

---

### Issue 4: Android Build Fails

**Symptom:** Gradle sync fails or build errors

**Fixes:**
- Sync Gradle files (File → Sync Project with Gradle Files)
- Clean build: `./gradlew clean`
- Invalidate caches (File → Invalidate Caches / Restart)
- Check `libs.versions.toml` has okhttp and gson entries

---

## 📊 Testing Scenarios

### Scenario 1: New User Registration

1. Use a Gmail account that hasn't logged in before
2. Complete Google Sign-In
3. **Expected:** User created in database with `firebase_uid`
4. **Expected:** Navigate to User Details screen (no profile yet)

**Verify in database:**
```bash
npx prisma studio
```
Check User table for new entry with populated `firebase_uid` and `email`.

---

### Scenario 2: Existing User Login (Account Linking)

1. Create a user with phone/OTP first
2. Logout
3. Login with Gmail using same email
4. **Expected:** `firebase_uid` added to existing user
5. **Expected:** All previous data retained

---

### Scenario 3: API Call with JWT Token

After login, make an API call:

```kotlin
lifecycleScope.launch {
    val result = apiService.makeAuthenticatedRequest(
        endpoint = "/api/auth/me",
        method = "GET"
    )
    result.onSuccess { response ->
        Log.d("Test", "User data: $response")
    }
}
```

**Expected:** Successful response with user data

---

## 🎯 Success Criteria

Your integration is working correctly if:

- ✅ Backend starts without errors
- ✅ Firebase Admin SDK initializes
- ✅ Database has `firebase_uid` column
- ✅ Android app connects to backend
- ✅ User can sign in with Google
- ✅ Backend creates/links user account
- ✅ JWT token is stored in app
- ✅ Subsequent API calls work with JWT token
- ✅ User data syncs between Firebase and backend

---

## 🔧 Optional Production Configurations

### 1. Get Firebase Service Account JSON (Production)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project "healbridge-dd480"
3. Project Settings → Service Accounts
4. Click "Generate new private key"
5. Download JSON file
6. Convert to single line and add to `.env`:

```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"..."}
```

### 2. Enable HTTPS (Production)

Use Nginx as reverse proxy:

```nginx
server {
    listen 443 ssl;
    server_name api.healbridge.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. Configure CORS (Production)

In `backend/src/server.js`, update CORS:

```javascript
app.use(cors({
  origin: ['https://your-frontend-domain.com'],
  credentials: true
}));
```

---

## 📞 Need Help?

1. **Check Documentation:**
   - `FIREBASE_GMAIL_LOGIN_INTEGRATION.md` - Full guide
   - `QUICK_START.md` - Quick setup
   - `IMPLEMENTATION_SUMMARY.md` - What was implemented

2. **Check Logs:**
   - Backend: Console output from `npm run dev`
   - Android: Logcat in Android Studio (filter: ApiService, Login)

3. **Verify Database:**
   ```bash
   npx prisma studio
   ```

4. **Test Backend API:**
   ```bash
   curl http://localhost:3000/api/auth/me
   ```

---

## ✨ You're Ready When...

- [ ] Database migration completed successfully
- [ ] Backend server running with Firebase initialized
- [ ] Android app builds without errors
- [ ] Backend URL configured correctly in `ApiService.kt`
- [ ] All pre-flight checks passed
- [ ] Test login successful
- [ ] Logs show authentication working
- [ ] Database shows new user with `firebase_uid`

**Then you're ready to test the full flow!** 🎉

---

*Last Updated: November 7, 2025*

