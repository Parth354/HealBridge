# Firebase Gmail Login - Quick Start Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Redis server
- Android Studio
- Firebase project with Google Sign-In enabled

## 1. Backend Setup (5 minutes)

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/healbridge
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
FIREBASE_PROJECT_ID=healbridge-dd480
```

### Step 3: Run Database Migration

```bash
npx prisma migrate dev --name add_firebase_support
npx prisma generate
```

### Step 4: Start Server

```bash
npm run dev
```

You should see:
```
✅ Firebase Admin initialized with project ID
Server running on port 3000
```

## 2. Android App Setup (3 minutes)

### Step 1: Update Backend URL

Edit `apps/HealBridge/app/src/main/java/com/example/healbridge/ApiService.kt`:

```kotlin
// Line 22: Update BASE_URL
private const val BASE_URL = "http://10.0.2.2:3000" // For emulator

// OR for physical device:
private const val BASE_URL = "http://YOUR_LOCAL_IP:3000"
```

### Step 2: Sync Gradle

Open Android Studio and sync Gradle to download dependencies (OkHttp, Gson).

### Step 3: Build and Run

```bash
./gradlew assembleDebug
```

Or click "Run" in Android Studio.

## 3. Test the Integration

### Test Login Flow

1. Launch the app
2. Tap "Sign in with Google"
3. Select a Google account
4. Check backend logs:

**Expected backend logs:**
```
✅ Firebase token verification successful
✅ Created new user [user_id] with Firebase UID [firebase_uid]
```

**Expected Android logs:**
```
D/ApiService: Firebase token obtained, length: 1234
D/Login: ✅ Backend authentication successful
D/Login: User ID: cm123abc
```

### Verify Database

```bash
npx prisma studio
```

Check the `User` table:
- New user created with `firebase_uid`
- Email populated from Google account
- `role` set to "PATIENT"

## 4. Troubleshooting

### Backend server not starting?

```bash
# Check if ports are available
netstat -an | grep 3000
netstat -an | grep 6379

# Start Redis if not running
redis-server
```

### Can't connect from Android app?

**For Emulator:**
- Use `http://10.0.2.2:3000`

**For Physical Device:**
- Use your computer's local IP: `http://192.168.x.x:3000`
- Find your IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Ensure device and computer are on same WiFi

### Firebase token verification failed?

1. Check `.env` has `FIREBASE_PROJECT_ID=healbridge-dd480`
2. Verify Firebase project ID matches `google-services.json`
3. Restart backend server after changing `.env`

## 5. Next Steps

### Production Deployment

1. **Get Firebase Service Account:**
   - Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Add JSON to `.env`:
   ```env
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
   ```

2. **Update Backend URL in Android:**
   ```kotlin
   private const val BASE_URL = "https://your-api-domain.com"
   ```

3. **Enable HTTPS:**
   - Use a reverse proxy (Nginx)
   - Or deploy to services like Heroku, AWS, Google Cloud

### Optional Configurations

**Enable detailed logging:**

`backend/src/config/firebase.js` - Already logs initialization

`ApiService.kt` - Already logs all requests

**Configure OkHttp timeouts:**

```kotlin
private val client = OkHttpClient.Builder()
    .connectTimeout(30, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .writeTimeout(30, TimeUnit.SECONDS)
    .build()
```

## 6. Testing API Calls

### Make authenticated request from Android:

```kotlin
lifecycleScope.launch {
    val result = apiService.makeAuthenticatedRequest(
        endpoint = "/api/patient/appointments",
        method = "GET"
    )
    result.onSuccess { response ->
        Log.d("API", "Success: $response")
    }
}
```

### Test with curl:

```bash
# Login and get token
curl -X POST http://localhost:3000/api/auth/firebase/login \
  -H "Content-Type: application/json" \
  -d '{"firebaseToken":"YOUR_FIREBASE_TOKEN","role":"PATIENT"}'

# Use token for API calls
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Summary

✅ Firebase Admin SDK integrated in backend  
✅ Database schema updated with `firebase_uid`  
✅ Authentication endpoints added  
✅ Android app sends Firebase token to backend  
✅ Backend verifies token and returns JWT  
✅ Automatic account creation and linking  
✅ Seamless API authentication  

**Time to implement: ~10 minutes**  
**Lines of code added: ~500**  
**New dependencies: 2 (firebase-admin, okhttp + gson)**

For detailed information, see `FIREBASE_GMAIL_LOGIN_INTEGRATION.md`

