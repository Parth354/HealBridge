# HealBridge - Quick Start Guide

## 🚀 Get Running in 10 Minutes

This guide will get you up and running for **development/testing** with minimal configuration.

---

## Prerequisites

Make sure you have these installed:
```bash
node --version  # Should be 16 or higher
psql --version  # PostgreSQL 14+
redis-cli --version  # Redis 6+
```

If not installed:
```bash
# macOS
brew install node postgresql redis

# Ubuntu
sudo apt update
sudo apt install nodejs npm postgresql redis-server

# Windows
# Download installers from official websites
```

---

## Step 1: Clone & Install (2 minutes)

```bash
cd HealBridge/backend
npm install
```

---

## Step 2: Setup Database (2 minutes)

```bash
# Start PostgreSQL (if not running)
# macOS
brew services start postgresql

# Ubuntu
sudo service postgresql start

# Create database
createdb healbridge

# Or using psql
psql -U postgres -c "CREATE DATABASE healbridge;"
```

---

## Step 3: Setup Redis (1 minute)

```bash
# Start Redis
# macOS
brew services start redis

# Ubuntu
sudo service redis-server start

# Windows
# Use Redis Windows port or WSL

# Test Redis
redis-cli ping
# Should return: PONG
```

---

## Step 4: Configure Environment (2 minutes)

Create `.env` file:
```bash
cp env.example.txt .env
```

Edit `.env` with these **minimum** settings:
```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://localhost:5432/healbridge?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Security (CHANGE THIS!)
JWT_SECRET="my-super-secret-key-change-this-12345"

# Email (Optional - for testing)
MAIL_HOST=
MAIL_USER=
MAIL_PASS=

# Leave these empty for now (will use PATCH FIX mode)
AWS_ACCESS_KEY=
AWS_SECRET_KEY=
S3_BUCKET=
OPENAI_API_KEY=
```

---

## Step 5: Setup Database Schema (1 minute)

```bash
# Generate Prisma client
npm run prisma:generate

# Push schema to database
npm run prisma:push

# You should see:
# ✔ Database synced successfully
```

---

## Step 6: Start Server (1 minute)

```bash
npm run dev
```

You should see:
```
╔═══════════════════════════════════════╗
║       HealBridge Backend Server       ║
╠═══════════════════════════════════════╣
║  Environment: development             ║
║  Port:        3000                    ║
║  Status:      Running ✓               ║
╚═══════════════════════════════════════╝
🏥 Server is running on port 3000
```

---

## Step 7: Test It! (1 minute)

### Test 1: Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-05T10:00:00.000Z",
  "uptime": 5.234,
  "environment": "development"
}
```

### Test 2: Send OTP (Will show in console)
```bash
curl -X POST http://localhost:3000/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210"}'
```

Check your server console - you'll see:
```
OTP for 9876543210: 123456
```

### Test 3: Verify OTP & Login
```bash
curl -X POST http://localhost:3000/api/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","otp":"123456"}'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "phone": "9876543210",
    "role": "PATIENT",
    "verified": true,
    "hasProfile": false
  }
}
```

**Save this token!** You'll need it for authenticated requests.

---

## What Works in Development Mode?

### ✅ Fully Functional
- Authentication (OTP via console)
- Patient profile creation
- Doctor profile creation
- Doctor search with geolocation
- Appointment booking with slot holds
- Schedule management
- Prescription creation
- Medication tracking
- Wait time estimates
- Database operations

### ⚠️ Patch Mode (Console Only)
- SMS (shows OTP in console)
- Push notifications (logs to console)
- File uploads (returns placeholder URLs)
- RAG/AI features (returns simple text)

---

## Next Steps

### For Basic Testing (Free)
Continue with current setup. Everything works except:
- Real SMS (use console OTP)
- Real push notifications (see console logs)
- Cloud file storage (uses local temp files)

### To Add Real SMS (Recommended)
```bash
# 1. Sign up for Twilio trial (free $15 credit)
# https://www.twilio.com/try-twilio

# 2. Add to .env:
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890

# 3. Uncomment integration code in:
# src/services/auth.service.js (line 15-35)
```

### To Add File Storage (Recommended)
```bash
# 1. Create AWS account (free tier)
# https://aws.amazon.com/free/

# 2. Create S3 bucket named "healbridge-dev"

# 3. Add to .env:
AWS_ACCESS_KEY=your_key
AWS_SECRET_KEY=your_secret
AWS_REGION=ap-south-1
S3_BUCKET=healbridge-dev

# 4. Uncomment integration code in:
# src/services/ocr.service.js (line 293-343)
```

### To Add AI Features (Optional)
```bash
# 1. Get OpenAI API key (free $5 credit)
# https://platform.openai.com/api-keys

# 2. Add to .env:
OPENAI_API_KEY=sk-your-key-here

# 3. Restart server - RAG will work automatically
```

---

## Common Issues & Fixes

### Issue: "Redis connection failed"
```bash
# Check Redis is running
redis-cli ping

# Start Redis
brew services start redis  # macOS
sudo service redis-server start  # Ubuntu
```

### Issue: "Database connection failed"
```bash
# Check PostgreSQL is running
pg_isready

# Start PostgreSQL
brew services start postgresql  # macOS
sudo service postgresql start  # Ubuntu

# Check database exists
psql -l | grep healbridge
```

### Issue: "Prisma Client not found"
```bash
npm run prisma:generate
```

### Issue: "Port 3000 already in use"
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in .env
PORT=3001
```

### Issue: "Module not found"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## Testing the Full Workflow

### Patient Journey
```bash
# 1. Send OTP
curl -X POST http://localhost:3000/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210"}'

# 2. Copy OTP from console, then verify
curl -X POST http://localhost:3000/api/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","otp":"<YOUR_OTP>"}'

# 3. Save the token from response
TOKEN="<YOUR_JWT_TOKEN>"

# 4. Create patient profile
curl -X POST http://localhost:3000/api/auth/patient/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "dob": "1990-01-01",
    "gender": "Male",
    "allergies": "None",
    "emergencyContact": "9876543211"
  }'

# 5. Analyze symptoms
curl -X POST http://localhost:3000/api/patient/triage/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symptoms":"fever and headache"}'

# 6. Search doctors (will be empty initially)
curl -X GET "http://localhost:3000/api/patient/doctors/search?specialty=Cardiology&lat=28.6139&lon=77.2090" \
  -H "Authorization: Bearer $TOKEN"
```

---

## What's Next?

### For Development
1. ✅ You're ready to develop!
2. Read: `IMPLEMENTATION_GUIDE.md` for features
3. Read: `backend/README.md` for API docs
4. Read: `CONFIGURATION_GUIDE.md` for production setup

### For Production
1. Follow: `CONFIGURATION_GUIDE.md`
2. Integrate: SMS, Push, S3 (see `INTEGRATION_EXAMPLES.md`)
3. Deploy: Use Railway, Render, or AWS
4. Monitor: Add error tracking (Sentry)

---

## Development Tools

### Database GUI
```bash
# Install Prisma Studio
npx prisma studio

# Opens at http://localhost:5555
# Visual interface to view/edit database
```

### API Testing
Use Postman or Thunder Client (VSCode extension)

Import collection (create `postman_collection.json`):
```json
{
  "info": { "name": "HealBridge API" },
  "item": [
    {
      "name": "Send OTP",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/api/auth/otp/send",
        "body": {
          "mode": "raw",
          "raw": "{\"phone\":\"9876543210\"}"
        }
      }
    }
  ]
}
```

---

## 📚 Documentation Reference

- **IMPLEMENTATION_GUIDE.md** - Complete feature documentation
- **CONFIGURATION_GUIDE.md** - What needs configuration
- **INTEGRATION_EXAMPLES.md** - Copy-paste code for integrations
- **backend/README.md** - API documentation
- **Code Comments** - Look for ⚠️ PATCH FIX and 🔧 ROOT FIX markers

---

## 🎉 You're Ready!

Your development environment is set up. Key points:

1. ✅ Server running on `http://localhost:3000`
2. ⚠️ SMS/Push are console-only (PATCH FIX)
3. ✅ All core features work locally
4. 📖 Read other docs for production setup

**Happy coding!** 🚀

---

**Questions?**
- Check console logs (marked with ⚠️ for patch fixes)
- Review `CONFIGURATION_GUIDE.md`
- Check code comments in service files

