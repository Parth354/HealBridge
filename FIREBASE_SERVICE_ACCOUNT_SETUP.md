# Firebase Service Account Setup Guide

## What is FIREBASE_SERVICE_ACCOUNT?

`FIREBASE_SERVICE_ACCOUNT` is an environment variable that contains the **Firebase Admin SDK credentials** in JSON format. It allows your backend server to:

- ✅ Verify Firebase ID tokens from patient login
- ✅ Access Firebase Authentication user data
- ✅ Read/write to Firestore database
- ✅ Send push notifications via FCM
- ✅ Manage Firebase users programmatically

## Why Do You Need It?

Your HealBridge backend uses Firebase for:
1. **Patient Authentication**: Verifying Firebase ID tokens when patients log in with Gmail
2. **Firestore Access**: Reading/writing patient profile data stored in Firestore
3. **User Management**: Creating and managing Firebase user accounts

## How to Get Firebase Service Account Credentials

### Step 1: Go to Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **"healbridge-dd480"** (or your project name)

### Step 2: Generate Service Account Key

1. Click the **⚙️ Settings** icon (gear icon) in the left sidebar
2. Click **"Project settings"**
3. Go to the **"Service accounts"** tab
4. Click **"Generate new private key"** button
5. Click **"Generate key"** in the confirmation dialog
6. A JSON file will be downloaded to your computer

**Example filename:** `healbridge-dd480-firebase-adminsdk-xxxxx.json`

### Step 3: The Downloaded JSON File

The file will look like this:

```json
{
  "type": "service_account",
  "project_id": "healbridge-dd480",
  "private_key_id": "abc123def456...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@healbridge-dd480.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40healbridge-dd480.iam.gserviceaccount.com"
}
```

## How to Add to Your Backend

### Method 1: Store as Environment Variable (Recommended)

#### For Windows (PowerShell):

**Option A: Add to `.env` file**

1. Open or create `.env` file in `HealBridge/backend/` directory

2. Add this line (replace with your actual JSON):

```env
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"healbridge-dd480","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@healbridge-dd480.iam.gserviceaccount.com","client_id":"123456789012345678901","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/..."}'
```

**IMPORTANT NOTES:**
- ⚠️ **Single line**: The entire JSON must be on ONE line
- ⚠️ **Single quotes**: Use single quotes around the JSON
- ⚠️ **No spaces**: Don't add extra spaces or line breaks
- ⚠️ **Escape properly**: Keep `\n` in private_key as-is

**Option B: Using a conversion tool**

If you have the JSON file, you can convert it to a single-line string:

**Windows PowerShell:**
```powershell
# Navigate to backend directory
cd C:\Users\negis\OneDrive\Desktop\Assignment\Veersa\HealBridge\backend

# Convert JSON file to single line
$json = Get-Content .\healbridge-firebase-key.json -Raw | ConvertFrom-Json | ConvertTo-Json -Compress
Set-Content .env -Value "FIREBASE_SERVICE_ACCOUNT='$json'"
```

**Node.js Script (create `scripts/convert-firebase-key.js`):**
```javascript
const fs = require('fs');

// Read the downloaded Firebase JSON file
const serviceAccount = JSON.parse(
  fs.readFileSync('./healbridge-firebase-key.json', 'utf8')
);

// Convert to single-line string
const singleLine = JSON.stringify(serviceAccount);

// Create .env format
const envContent = `FIREBASE_SERVICE_ACCOUNT='${singleLine}'`;

console.log('Add this to your .env file:\n');
console.log(envContent);

// Or append to .env file
fs.appendFileSync('.env', '\n' + envContent);
console.log('\n✅ Added to .env file');
```

Run it:
```bash
node scripts/convert-firebase-key.js
```

### Method 2: Store File Path (Alternative)

If you prefer to keep the JSON file separate:

1. Place the downloaded JSON file in a safe location:
   ```
   HealBridge/backend/config/firebase-service-account.json
   ```

2. Add to `.gitignore`:
   ```
   config/firebase-service-account.json
   ```

3. Modify `backend/src/config/firebase.js`:
   ```javascript
   import { readFileSync } from 'fs';
   import { join } from 'path';
   
   // Try to load from file if env var not set
   if (!config.FIREBASE_SERVICE_ACCOUNT) {
     try {
       const filePath = join(process.cwd(), 'config', 'firebase-service-account.json');
       const fileContent = readFileSync(filePath, 'utf8');
       config.FIREBASE_SERVICE_ACCOUNT = fileContent;
     } catch (error) {
       console.warn('No Firebase service account file found');
     }
   }
   ```

## Complete .env File Example

Your `HealBridge/backend/.env` should include:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# JWT
JWT_SECRET="your-secure-jwt-secret-key"

# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"healbridge-dd480","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
FIREBASE_PROJECT_ID="healbridge-dd480"

# Optional: Other services
TWILIO_ACCOUNT_SID="your_twilio_sid"
TWILIO_AUTH_TOKEN="your_twilio_token"
TWILIO_PHONE_NUMBER="+1234567890"
```

## Verification

### Test if Firebase is Working

1. **Start your backend:**
   ```bash
   cd HealBridge/backend
   npm start
   ```

2. **Check console logs:**
   You should see:
   ```
   ✅ Firebase Admin initialized with service account
   ```

3. **If you see warnings:**
   ```
   ⚠️  Firebase credentials not configured
   ⚠️  Add FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID to .env
   ```
   This means the environment variable is not set correctly.

### Test API Endpoint

**Test Firebase Token Verification:**
```bash
# Using curl (replace with actual token)
curl -X POST http://localhost:3000/api/auth/firebase/login \
  -H "Content-Type: application/json" \
  -d '{"role":"PATIENT"}'
```

Or use this test script (`test-firebase.js`):

```javascript
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('✅ Firebase initialized successfully!');
  console.log('Project ID:', serviceAccount.project_id);
  console.log('Client Email:', serviceAccount.client_email);
  
  // Test Firestore access
  const db = admin.firestore();
  console.log('✅ Firestore accessible');
  
  process.exit(0);
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
}
```

Run:
```bash
node test-firebase.js
```

## Security Best Practices

### ⚠️ CRITICAL: Never Commit Service Account to Git

1. **Add to `.gitignore`:**
   ```gitignore
   # Environment variables
   .env
   .env.local
   .env.*.local
   
   # Firebase credentials
   *firebase-adminsdk*.json
   firebase-service-account.json
   ```

2. **Check if already committed:**
   ```bash
   git log --all --full-history -- "*.json" | grep firebase
   ```

3. **If accidentally committed, remove from history:**
   ```bash
   # DANGER: This rewrites history
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/firebase-key.json" \
     --prune-empty --tag-name-filter cat -- --all
   
   # Then revoke the compromised key in Firebase Console
   ```

4. **Rotate the key:**
   - Go to Firebase Console → Service Accounts
   - Delete the old key
   - Generate a new one
   - Update `.env` with new credentials

### Additional Security Measures

1. **Use separate service accounts for different environments:**
   - Development: `dev-firebase-key.json`
   - Staging: `staging-firebase-key.json`
   - Production: `prod-firebase-key.json`

2. **Set minimum permissions:**
   - Go to Google Cloud Console
   - IAM & Admin → Service Accounts
   - Edit service account permissions
   - Grant only required roles

3. **Use environment-specific .env files:**
   ```
   .env.development
   .env.production
   .env.staging
   ```

4. **For production deployments:**
   - Use secret management services (AWS Secrets Manager, Azure Key Vault, etc.)
   - Or set as environment variable in hosting platform (Heroku, Render, Vercel, etc.)

## Troubleshooting

### Issue 1: "Firebase credentials not configured"

**Cause**: Environment variable not loaded

**Solution:**
```bash
# Check if .env file exists
ls -la .env

# Check if variable is set
node -e "require('dotenv').config(); console.log(process.env.FIREBASE_SERVICE_ACCOUNT ? 'Set' : 'Not set')"
```

### Issue 2: "Invalid service account"

**Cause**: JSON parsing error

**Solutions:**
1. Ensure JSON is on a single line
2. Check for escaped quotes
3. Verify the JSON is valid:
   ```bash
   node -e "JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)"
   ```

### Issue 3: "Private key must be a string"

**Cause**: Newlines in private_key not preserved

**Solution:**
- Ensure `\n` characters are preserved in the private_key field
- Use single quotes around the entire JSON
- Don't escape the `\n` again (keep as `\n`, not `\\n`)

### Issue 4: "Permission denied"

**Cause**: Service account lacks permissions

**Solution:**
1. Go to Google Cloud Console
2. IAM & Admin → Service Accounts
3. Select your service account
4. Add these roles:
   - Firebase Admin
   - Cloud Datastore User
   - Service Account Token Creator

## Production Deployment

### Render.com

1. Go to your Render service
2. Environment → Add Environment Variable
3. Key: `FIREBASE_SERVICE_ACCOUNT`
4. Value: Paste the single-line JSON
5. Save

### Heroku

```bash
heroku config:set FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
```

### Vercel

1. Settings → Environment Variables
2. Add `FIREBASE_SERVICE_ACCOUNT`
3. Paste single-line JSON
4. Select environment (Production/Preview/Development)

### AWS Elastic Beanstalk

1. Configuration → Software
2. Environment Properties
3. Add `FIREBASE_SERVICE_ACCOUNT`
4. Apply changes

## Quick Setup Script

Save as `setup-firebase.sh`:

```bash
#!/bin/bash

echo "🔧 Firebase Service Account Setup"
echo "=================================="
echo ""

# Check if firebase key file exists
if [ ! -f "firebase-service-account.json" ]; then
    echo "❌ firebase-service-account.json not found"
    echo "📥 Please download it from Firebase Console"
    exit 1
fi

# Convert to single line
FIREBASE_JSON=$(cat firebase-service-account.json | tr -d '\n' | tr -d ' ')

# Add to .env
echo "" >> .env
echo "# Firebase Configuration" >> .env
echo "FIREBASE_SERVICE_ACCOUNT='$FIREBASE_JSON'" >> .env

echo "✅ Added FIREBASE_SERVICE_ACCOUNT to .env"
echo "🔒 Remember to add .env to .gitignore"
echo "🚀 You can now start your backend server"
```

Run:
```bash
chmod +x setup-firebase.sh
./setup-firebase.sh
```

## Summary

1. **Download** Firebase service account JSON from Firebase Console
2. **Convert** to single-line string
3. **Add** to `.env` file: `FIREBASE_SERVICE_ACCOUNT='...'`
4. **Verify** by starting backend and checking logs
5. **Secure** by adding to `.gitignore`
6. **Test** by logging in with a patient account

Your backend will now be able to authenticate Firebase users and access Firestore! 🎉

