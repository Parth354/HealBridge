# Integration Code Examples

## Complete copy-paste ready code for integrating third-party services

---

## 📱 SMS Integration

### Option 1: Twilio (Recommended for India)

**Step 1:** Install package
```bash
npm install twilio
```

**Step 2:** Add to `.env`
```env
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**Step 3:** Replace in `src/services/auth.service.js` (line 35)
```javascript
// Replace console.log with this:
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

try {
  await client.messages.create({
    body: `Your HealBridge OTP is: ${otp}. Valid for 5 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: `+91${phone}` // Add country code for India
  });
  console.log(`✅ OTP sent to ${phone}`);
} catch (error) {
  console.error('SMS send failed:', error);
  throw new Error('Failed to send OTP');
}
```

### Option 2: AWS SNS

**Step 1:** Already have AWS SDK installed

**Step 2:** Add to `.env` (if not already there)
```env
AWS_ACCESS_KEY=your_access_key
AWS_SECRET_KEY=your_secret_key
AWS_REGION=ap-south-1
```

**Step 3:** Replace in `src/services/auth.service.js` (line 35)
```javascript
const AWS = require('aws-sdk');
const sns = new AWS.SNS({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION
});

const params = {
  Message: `Your HealBridge OTP is: ${otp}. Valid for 5 minutes.`,
  PhoneNumber: `+91${phone}`,
  MessageAttributes: {
    'AWS.SNS.SMS.SMSType': {
      DataType: 'String',
      StringValue: 'Transactional'
    }
  }
};

try {
  const result = await sns.publish(params).promise();
  console.log(`✅ OTP sent to ${phone}`, result.MessageId);
} catch (error) {
  console.error('SMS send failed:', error);
  throw new Error('Failed to send OTP');
}
```

---

## 🔔 Push Notification Integration

### Option 1: Firebase Cloud Messaging (FCM) - Recommended

**Step 1:** Install package
```bash
npm install firebase-admin
```

**Step 2:** Get Firebase credentials
1. Go to Firebase Console: https://console.firebase.google.com/
2. Create project or select existing
3. Go to Project Settings → Service Accounts
4. Generate new private key (downloads JSON)

**Step 3:** Add to `.env`
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
```

**Step 4:** Create `src/config/firebase.js`
```javascript
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
}

module.exports = admin;
```

**Step 5:** Add `fcmToken` to User model in `src/prisma/schema.prisma`
```prisma
model User {
  id            String   @id @default(cuid())
  role          UserRole
  phone         String   @unique
  email         String?  @unique
  language      String   @default("en")
  verified      Boolean  @default(false)
  fcmToken      String?  // Add this line
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // ... rest of model
}
```

Run migration:
```bash
npx prisma db push
```

**Step 6:** Create `src/services/push.service.js`
```javascript
const admin = require('../config/firebase');
const prisma = require('../config/prisma');

class PushService {
  async sendPushNotification(userId, notification) {
    // Get user's FCM token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true }
    });

    if (!user?.fcmToken) {
      console.log(`No FCM token for user ${userId}`);
      return { success: false, error: 'No FCM token found' };
    }

    const message = {
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data || {},
      token: user.fcmToken,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'healbridge_notifications'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    try {
      const response = await admin.messaging().send(message);
      console.log(`✅ Push sent to user ${userId}:`, response);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('Push notification failed:', error);
      
      // Handle invalid token
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        // Clear invalid token
        await prisma.user.update({
          where: { id: userId },
          data: { fcmToken: null }
        });
      }
      
      return { success: false, error: error.message };
    }
  }

  // Save FCM token when user logs in
  async saveToken(userId, fcmToken) {
    return await prisma.user.update({
      where: { id: userId },
      data: { fcmToken }
    });
  }
}

module.exports = new PushService();
```

**Step 7:** Use in notification service
Replace line 265 in `src/services/notification.service.js`:
```javascript
const pushService = require('./push.service');

// In sendPushNotification method:
async sendPushNotification(userId, notification) {
  return await pushService.sendPushNotification(userId, notification);
}
```

**Step 8:** Add endpoint to save FCM token
In `src/routes/auth.routes.js`:
```javascript
// Add this route
router.post('/fcm-token', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { token } = req.body;
    
    const pushService = require('../services/push.service');
    await pushService.saveToken(userId, token);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 📦 AWS S3 Integration

**Already have AWS SDK installed**

**Step 1:** Ensure credentials in `.env`
```env
AWS_ACCESS_KEY=your_access_key
AWS_SECRET_KEY=your_secret_key
AWS_REGION=ap-south-1
S3_BUCKET=healbridge-documents
```

**Step 2:** Create S3 bucket
1. Go to AWS Console → S3
2. Create bucket named `healbridge-documents`
3. Settings:
   - ✅ Block all public access (IMPORTANT!)
   - ✅ Enable versioning
   - ✅ Enable default encryption (AES-256)
   - Add lifecycle rule: Move to Glacier after 1 year

**Step 3:** Replace in `src/services/ocr.service.js` (line 342)
```javascript
async uploadToS3(file, patientId) {
  const fs = require('fs');
  const s3 = require('../config/s3');
  
  const key = `prescriptions/${patientId}/${Date.now()}_${file.originalname}`;
  const fileContent = await fs.promises.readFile(file.path);
  
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: fileContent,
    ContentType: file.mimetype,
    ACL: 'private', // ⚠️ NEVER use public-read for patient data
    ServerSideEncryption: 'AES256',
    Metadata: {
      patientId: patientId,
      uploadedAt: new Date().toISOString()
    }
  };
  
  try {
    const uploadResult = await s3.s3.upload(params).promise();
    
    // Clean up temp file
    await fs.promises.unlink(file.path);
    
    console.log(`✅ File uploaded: ${uploadResult.Key}`);
    return uploadResult.Location;
  } catch (error) {
    console.error('S3 upload failed:', error);
    throw new Error('File upload failed');
  }
}
```

**Step 4:** Add function to get signed URL (for secure access)
Add this to `src/services/ocr.service.js`:
```javascript
// Add this method to OCRService class
async getSignedUrl(fileUrl) {
  const s3 = require('../config/s3');
  
  // Extract key from URL
  const url = new URL(fileUrl);
  const key = url.pathname.substring(1); // Remove leading /
  
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Expires: 3600 // 1 hour
  };
  
  return s3.s3.getSignedUrl('getObject', params);
}
```

---

## 🤖 OpenAI API Integration

**Already configured in code, just need API key**

**Step 1:** Get API key
1. Go to: https://platform.openai.com/api-keys
2. Create new secret key
3. Copy and save it (you won't see it again)

**Step 2:** Add to `.env`
```env
OPENAI_API_KEY=sk-your-key-here
```

**Step 3:** Test it
```bash
# Restart server
npm run dev

# Test RAG query
curl -X POST http://localhost:3000/api/doctor/patients/{patientId}/query \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"Show recent medications"}'
```

**Cost Optimization Tips:**
```javascript
// In src/services/rag.service.js, line 280
// Change from gpt-4 to gpt-3.5-turbo to save 95% on costs:
model: 'gpt-3.5-turbo', // $0.0015 per 1K tokens instead of $0.03
```

---

## 📧 Email Integration (Already Working!)

**Just needs SMTP configuration**

### For Gmail (Development)

**Step 1:** Enable 2FA on Google account

**Step 2:** Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select app: Mail
3. Select device: Other (Custom name) → "HealBridge"
4. Copy the 16-character password

**Step 3:** Add to `.env`
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-16-char-app-password
```

### For SendGrid (Production)

**Step 1:** Sign up at https://sendgrid.com/

**Step 2:** Create API key
1. Settings → API Keys
2. Create API Key
3. Copy key

**Step 3:** Add to `.env`
```env
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USER=apikey
MAIL_PASS=SG.your-api-key-here
```

---

## 🏥 License Verification (India - NMC)

**⚠️ Note:** NMC doesn't have public API. Options:

### Option 1: Manual Verification (Recommended)

Keep current PATCH FIX and add admin panel for manual verification.

### Option 2: Web Scraping (Advanced)

**Step 1:** Install packages
```bash
npm install puppeteer cheerio
```

**Step 2:** Create scraper in `src/services/license.service.js`
```javascript
async checkMedicalRegistry(licenseNo, specialties) {
  const puppeteer = require('puppeteer');
  
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Go to NMC website
    await page.goto('https://www.nmc.org.in/information-desk/indian-medical-register/');
    
    // Fill search form
    await page.type('#registrationNo', licenseNo);
    await page.click('#searchButton');
    
    // Wait for results
    await page.waitForSelector('.search-results', { timeout: 5000 });
    
    // Extract data
    const result = await page.evaluate(() => {
      const row = document.querySelector('.search-results tbody tr');
      if (!row) return { found: false };
      
      return {
        found: true,
        licenseNo: row.querySelector('td:nth-child(1)').textContent,
        doctorName: row.querySelector('td:nth-child(2)').textContent,
        registrationDate: row.querySelector('td:nth-child(3)').textContent,
        status: 'active'
      };
    });
    
    await browser.close();
    return result;
    
  } catch (error) {
    console.error('NMC scraping failed:', error);
    // Fallback to manual review
    return { found: null, requiresManualReview: true };
  }
}
```

---

## 🧪 Testing Integrations

### Test SMS
```bash
curl -X POST http://localhost:3000/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210"}'
```

### Test Push Notification
```javascript
// In your app, after login, send FCM token:
fetch('http://localhost:3000/api/auth/fcm-token', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ token: 'fcm-device-token-here' })
});
```

### Test S3 Upload
```bash
curl -X POST http://localhost:3000/api/patient/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@prescription.jpg" \
  -F "docType=PRESCRIPTION"
```

### Test OpenAI RAG
```bash
curl -X POST http://localhost:3000/api/doctor/patients/{patientId}/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"What medications is this patient currently taking?"}'
```

---

## 📊 Cost Estimates (Monthly for 1000 active users)

| Service | Free Tier | Paid Estimate |
|---------|-----------|---------------|
| Twilio SMS | $0 | $75/month (3 SMS/user) |
| Firebase FCM | Free | Free |
| AWS S3 | 5GB free | $5-10/month |
| OpenAI API | $5 credit | $20-50/month |
| SendGrid Email | 100/day free | $15/month |
| AWS SNS SMS | $1 free | $60/month |
| **TOTAL** | **~Free** | **$115-200/month** |

---

## 🚀 Priority Order for Production

1. ✅ **Email** (Already working, just add SMTP)
2. 🔴 **SMS** (Critical for OTP)
3. 🟡 **S3** (Important for document storage)
4. 🟢 **Push Notifications** (Nice to have)
5. 🔵 **OpenAI** (Optional, for RAG features)
6. 🟣 **License Verification** (Can be manual initially)

---

## 💡 Quick Start Recommendation

**For MVP/Testing:**
```env
# Use these free options:
MAIL_HOST=smtp.gmail.com  # Free with Gmail
MAIL_USER=your.gmail@gmail.com
MAIL_PASS=your-app-password

# Twilio trial account (free $15 credit)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...

# AWS free tier
AWS_ACCESS_KEY=...
S3_BUCKET=healbridge-dev

# OpenAI (optional)
OPENAI_API_KEY=...  # $5 free credit
```

**Cost for testing:** ~$0-5/month

---

## 📞 Need Help?

Check these files for detailed comments:
- `src/services/auth.service.js` - SMS integration
- `src/services/notification.service.js` - Push notifications  
- `src/services/ocr.service.js` - S3 upload
- `src/services/rag.service.js` - OpenAI integration
- `src/services/license.service.js` - License verification

Each file has **⚠️ PATCH FIX** and **🔧 ROOT FIX** markers showing what needs to be changed.

