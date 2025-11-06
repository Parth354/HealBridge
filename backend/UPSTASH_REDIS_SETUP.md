# ☁️ Upstash Redis Setup Guide

Complete guide to set up cloud Redis using Upstash - no local installation needed!

---

## 🎯 Why Upstash?

### Advantages over Local Redis:

| Feature | Local Redis | Upstash Redis |
|---------|-------------|---------------|
| **Installation** | Required | Not required ☁️ |
| **Maintenance** | Manual | Fully managed |
| **Availability** | Single machine | Global, highly available |
| **Scalability** | Manual scaling | Auto-scaling |
| **Cost** | Infrastructure cost | Pay-as-you-go (Free tier!) |
| **Backup** | Manual setup | Automatic |
| **Security** | Self-managed | Built-in TLS/SSL |

### Perfect for:
- ✅ Development & Testing (Free tier!)
- ✅ Production deployments
- ✅ Teams without DevOps
- ✅ Quick prototyping
- ✅ Serverless architectures

---

## 🚀 Quick Start (5 minutes)

### Step 1: Sign Up for Upstash

1. Go to [https://upstash.com](https://upstash.com)
2. Click **"Sign Up"**
3. Sign up with:
   - GitHub (recommended)
   - Google
   - Email

### Step 2: Create Redis Database

1. After login, click **"Create Database"**
2. Fill in details:
   - **Name**: `healbridge-redis`
   - **Type**: Select **Regional** (for development) or **Global** (for production)
   - **Region**: Choose closest to your users
     - US East (N. Virginia) - `us-east-1`
     - Europe (Ireland) - `eu-west-1`
     - Asia Pacific (Mumbai) - `ap-south-1`
   - **TLS**: ✅ **Enabled** (always keep this on)
   - **Eviction**: `noeviction` (recommended for healthcare data)

3. Click **"Create"**

### Step 3: Get Redis URL

1. Click on your newly created database
2. You'll see connection details:

```
Endpoint: ruling-chipmunk-12345.upstash.io
Port: 6379
```

3. Scroll down to **"REST API"** section
4. Copy the **"REDIS_URL"**

**Format:**
```
rediss://default:YOUR_PASSWORD@ruling-chipmunk-12345.upstash.io:6379
```

⚠️ **Important:** Notice `rediss://` (with double 's') - this indicates TLS/SSL

### Step 4: Add to `.env` File

```env
# ============================================
# REDIS CONFIGURATION (Upstash Cloud)
# ============================================
REDIS_URL="rediss://default:YOUR_PASSWORD@ruling-chipmunk-12345.upstash.io:6379"
```

⚠️ **Replace** `YOUR_PASSWORD` and `ruling-chipmunk-12345` with your actual values

### Step 5: Restart Server

```powershell
# Stop current server (Ctrl+C)

# Start again
npm run dev
```

**Expected Output:**
```
🌐 Upstash Redis detected - using TLS connection
🔄 Redis: Connecting to Upstash Cloud...
✅ Redis: Connected to Upstash Cloud and ready!
   Using cloud Redis - no local installation needed ☁️
```

---

## 🎉 You're Done!

No more local Redis installation needed. Your backend now uses cloud Redis!

---

## 📊 Upstash Free Tier

Perfect for development and small projects:

| Resource | Free Tier | Paid Tier |
|----------|-----------|-----------|
| **Max Commands** | 10,000/day | Unlimited |
| **Max Data Size** | 256 MB | Unlimited |
| **Max Connections** | 100 | Unlimited |
| **Max Bandwidth** | 200 MB/day | Unlimited |
| **Price** | **FREE** | From $0.20/10K commands |

**For HealBridge Development:**
- ✅ 10,000 commands = ~300-500 API requests/day
- ✅ More than enough for testing
- ✅ Can upgrade anytime

---

## 🔧 Configuration Details

### Redis URL Format

```
rediss://[username]:[password]@[endpoint]:[port]
```

**Example:**
```
rediss://default:AaaBbbCccDddEee123@ruling-chipmunk-12345.upstash.io:6379
```

**Components:**
- `rediss://` - Protocol (TLS enabled)
- `default` - Username (usually "default")
- `AaaBbbCccDddEee123` - Password (from Upstash console)
- `ruling-chipmunk-12345.upstash.io` - Endpoint
- `6379` - Port

### TLS/SSL Configuration

Upstash uses TLS by default for security:
- ✅ All data encrypted in transit
- ✅ Secure connections over internet
- ✅ Automatically handled by our config

---

## 🧪 Testing Upstash Connection

### Test 1: Check Server Logs

```powershell
npm run dev
```

Look for:
```
✅ Redis: Connected to Upstash Cloud and ready!
```

### Test 2: Test OTP (Uses Redis)

```bash
POST http://localhost:3000/api/auth/otp/send
Content-Type: application/json

{
  "phone": "9876543210"
}
```

If Redis is working, you'll get:
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

### Test 3: Check Upstash Dashboard

1. Go to Upstash Dashboard
2. Click on your database
3. Go to **"Data Browser"** tab
4. You should see keys like:
   - `otp:9876543210`
   - `hold:xyz123`

---

## 🌍 Regional vs Global Database

### Regional Database (Recommended for Development)

- **Pros:**
  - Lower latency
  - Lower cost
  - Simpler setup
  
- **Cons:**
  - Single region only

**Best for:**
- Development
- Single-region deployments
- Cost-sensitive projects

### Global Database (Recommended for Production)

- **Pros:**
  - Multi-region replication
  - High availability
  - Global low latency
  
- **Cons:**
  - Higher cost
  - Slightly more complex

**Best for:**
- Production
- Global user base
- Mission-critical apps

---

## 📈 Monitoring & Management

### Upstash Dashboard Features

1. **Metrics Tab**
   - Commands per second
   - Memory usage
   - Connection count
   - Bandwidth usage

2. **Data Browser**
   - View all keys
   - Inspect values
   - Delete keys manually
   - Set TTL

3. **REST API**
   - HTTP-based Redis commands
   - No Redis client needed
   - Perfect for serverless

4. **CLI**
   - Built-in Redis CLI
   - Test commands directly
   - Debug issues

---

## 🔐 Security Best Practices

### 1. Protect Your Password

```env
# ❌ NEVER commit .env to Git
# ✅ Add .env to .gitignore
```

### 2. Use Strong Passwords

Upstash generates strong passwords automatically. Don't change to weaker ones.

### 3. Rotate Credentials

If credentials are exposed:
1. Go to Upstash Dashboard
2. Click **"Reset Password"**
3. Update `.env` file
4. Restart server

### 4. Use Environment Variables

```javascript
// ✅ Good - from environment
const redisUrl = process.env.REDIS_URL;

// ❌ Bad - hardcoded
const redisUrl = "rediss://default:password@...";
```

---

## 🚨 Troubleshooting

### Issue 1: "Connection Timeout"

**Symptoms:**
```
❌ Redis error: connect ETIMEDOUT
```

**Solutions:**
1. Check internet connection
2. Verify REDIS_URL in `.env`
3. Check Upstash status: [https://status.upstash.com](https://status.upstash.com)
4. Try different network (disable VPN)

### Issue 2: "Authentication Failed"

**Symptoms:**
```
❌ Redis error: WRONGPASS invalid username-password pair
```

**Solutions:**
1. Copy Redis URL again from Upstash dashboard
2. Ensure password is correct (no extra spaces)
3. Check username is "default"
4. Reset password in Upstash dashboard if needed

### Issue 3: "Max Commands Exceeded" (Free Tier)

**Symptoms:**
```
❌ Redis error: ERR max number of clients reached
```

**Solutions:**
1. Upgrade to paid tier
2. Optimize Redis usage (reduce unnecessary commands)
3. Implement caching strategy
4. Clear old keys with TTL

### Issue 4: "TLS Connection Failed"

**Symptoms:**
```
❌ Redis error: unable to verify the first certificate
```

**Solutions:**
- Already handled in our config with `rejectUnauthorized: false`
- If still fails, check firewall/antivirus blocking TLS
- Ensure using `rediss://` (not `redis://`)

---

## 💡 Migration from Local Redis

### Already have data in local Redis?

#### Option 1: Manual Migration (Small Dataset)

```bash
# 1. Export from local Redis
redis-cli --rdb dump.rdb

# 2. Import to Upstash
# Use Upstash REST API or Redis CLI
```

#### Option 2: Let it Rebuild (Recommended)

Most data is temporary (OTP, holds):
1. Stop local Redis
2. Update `.env` to Upstash
3. Restart server
4. Data rebuilds as users interact

**No migration needed for:**
- OTP codes (5 min TTL)
- Slot holds (2 min TTL)
- Session data (temporary)

---

## 📊 Cost Estimation

### Development (Free Tier)

| Feature | Usage | Cost |
|---------|-------|------|
| Commands | < 10,000/day | **FREE** |
| Storage | < 256 MB | **FREE** |
| Bandwidth | < 200 MB/day | **FREE** |
| **Total** | | **$0/month** |

### Small Production (Paid)

| Feature | Usage | Cost |
|---------|-------|------|
| Commands | 100,000/day | $0.60/month |
| Storage | 1 GB | $0.25/month |
| Bandwidth | 10 GB/month | $0.09/month |
| **Total** | | **~$1/month** |

### Medium Production

| Feature | Usage | Cost |
|---------|-------|------|
| Commands | 1M/day | $6/month |
| Storage | 10 GB | $2.50/month |
| Bandwidth | 100 GB/month | $0.90/month |
| **Total** | | **~$10/month** |

---

## 🔄 Switching Back to Local Redis

Need to switch back? Easy!

```env
# Just change REDIS_URL
REDIS_URL="redis://localhost:6379"
```

The configuration automatically detects and uses local Redis.

---

## 🌟 Advanced Features

### 1. REST API (HTTP-based Redis)

Access Redis via HTTP (no Redis client needed):

```bash
curl -X POST https://ruling-chipmunk-12345.upstash.io/set/mykey/myvalue \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Global Replication

For global apps:
1. Upgrade to Global database
2. Data replicates to all regions
3. Low latency worldwide

### 3. Pub/Sub

Real-time messaging:
```javascript
// Supported out of the box
await redisClient.publish('channel', 'message');
```

### 4. Redis Streams

Event streaming:
```javascript
// Supported with Upstash
await redisClient.xAdd('stream', '*', { field: 'value' });
```

---

## 📚 Resources

- **Upstash Docs**: [https://docs.upstash.com/redis](https://docs.upstash.com/redis)
- **Upstash Console**: [https://console.upstash.com](https://console.upstash.com)
- **Upstash Status**: [https://status.upstash.com](https://status.upstash.com)
- **Pricing Calculator**: [https://upstash.com/pricing/redis](https://upstash.com/pricing/redis)
- **Support**: [support@upstash.com](mailto:support@upstash.com)

---

## ✅ Summary

**What Changed:**
- ✅ Redis configuration now supports Upstash
- ✅ Auto-detects cloud vs local Redis
- ✅ TLS enabled for Upstash
- ✅ Better error messages
- ✅ No code changes needed

**To Use Upstash:**
1. Sign up at upstash.com
2. Create Redis database
3. Copy REDIS_URL
4. Add to `.env`
5. Restart server

**Benefits:**
- ☁️ No local Redis installation
- 🌍 Global availability
- 🔒 Built-in security (TLS)
- 💰 Free tier available
- 📈 Easy to scale
- 🛠️ Fully managed

---

**Your HealBridge backend now supports cloud Redis! 🚀**

No more local Redis setup needed. Just use Upstash and focus on building features!

