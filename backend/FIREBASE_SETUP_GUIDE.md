# 🔥 Firebase Firestore Setup Guide

## Problem
Your backend can verify Firebase ID tokens but **cannot read/write Firestore data** because service account credentials are missing.

## Solution

### **Step 1: Download Firebase Service Account**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `healbridge-dd480`
3. Click the **⚙️ gear icon** → **Project Settings**
4. Go to the **Service accounts** tab
5. Click **"Generate new private key"**
6. Download the JSON file (e.g., `healbridge-dd480-firebase-adminsdk.json`)

### **Step 2: Convert JSON to Base64**

You have **two options**:

#### **Option A: Use PowerShell (Windows)**

```powershell
# Navigate to where you downloaded the JSON file
cd C:\path\to\downloaded\file

# Convert to Base64
$json = Get-Content "healbridge-dd480-firebase-adminsdk.json" -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
$base64 = [System.Convert]::ToBase64String($bytes)
$base64 | Set-Clipboard
Write-Host "✅ Base64 string copied to clipboard!"
Write-Host "Paste it into your .env file as FIREBASE_SERVICE_ACCOUNT"
```

#### **Option B: Use Online Tool**
1. Go to: https://www.base64encode.org/
2. Paste the entire JSON content
3. Click "Encode"
4. Copy the base64 result

#### **Option C: Use Node.js Script**

Save the JSON file in `backend/` directory as `firebase-service-account.json`, then run:

```bash
node scripts/encode-firebase-json.js
```

### **Step 3: Add to .env File**

Open `backend/.env` and add:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=healbridge-dd480
FIREBASE_SERVICE_ACCOUNT=<paste_base64_string_here>
```

**Important:** 
- The base64 string will be VERY LONG (2000-3000 characters)
- Make sure it's on ONE line
- No spaces or line breaks

### **Step 4: Restart Backend**

```bash
cd backend
npm start
```

### **Step 5: Test Firestore Access**

```bash
node tests/test-firestore-fetch.js
```

You should see:
```
✅ Firestore is connected!
✅ Found 2 user(s) in Firestore
```

---

## Alternative: Use Application Default Credentials (ADC)

If you're developing on a machine with Google Cloud SDK installed:

```bash
gcloud auth application-default login
```

Then in `.env`:
```env
FIREBASE_PROJECT_ID=healbridge-dd480
# FIREBASE_SERVICE_ACCOUNT not needed with ADC
```

---

## Troubleshooting

### ❌ "Could not load the default credentials"
- You haven't added service account credentials
- Follow steps 1-3 above

### ❌ "Firebase token verification error"
- This is NORMAL when testing with invalid tokens
- Use a real Firebase ID token from your Android app

### ❌ "Firestore not initialized"
- Check that `FIREBASE_PROJECT_ID` is in `.env`
- Restart the backend after adding credentials

---

## Security Notes

⚠️ **NEVER commit the service account JSON or base64 to Git!**

- Add to `.gitignore`:
  ```
  firebase-service-account.json
  .env
  ```

- For production, use environment variables in your deployment platform:
  - Render: Add in Environment section
  - Heroku: `heroku config:set FIREBASE_SERVICE_ACCOUNT=<base64>`
  - AWS/GCP: Use managed service accounts

---

## Verify Setup

Run this command to check if everything is working:

```bash
cd backend
node tests/test-firestore-fetch.js
```

Expected output:
```
✅ Firebase Admin initialized with service account
✅ Firestore is connected!
✅ Found 2 user(s) in Firestore

📊 User Summary:
   1. John Doe
      Email: john@example.com
      Profile Complete: Yes ✅

✨ Your backend can successfully fetch patient data from Firebase!
```

