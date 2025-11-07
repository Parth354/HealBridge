# Fix Database Connection Issues

## Problem
Can't connect to PostgreSQL database at Render.com

## Solutions

### Option 1: Wake Up Sleeping Database (Free Tier)

Render.com free databases sleep after 15 minutes of inactivity.

**Steps:**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your database: `pos_database_14ch`
3. Check the status indicator:
   - 🟢 **Available** - Database is running
   - 🟡 **Sleeping** - Database needs to wake up
   - 🔴 **Unavailable** - There's an issue
4. If sleeping, it will wake automatically when you try to connect
5. **Wait 30-60 seconds** and try again

### Option 2: Update Connection String

Your current connection string might be outdated. Get the latest:

**Steps:**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your database
3. Scroll to **"Connections"** section
4. Copy the **"External Database URL"**
5. Update your `.env` file:

```env
DATABASE_URL="postgresql://pos_database_14ch_user:PASSWORD@dpg-d3ucvvdiees73e6577g-a.singapore-postgres.render.com:5432/pos_database_14ch?ssl=true"
```

**Important:** Make sure to include `?ssl=true` at the end!

### Option 3: Upgrade to Paid Plan (Recommended for Production)

Free databases:
- ❌ Sleep after 15 minutes
- ❌ Slower performance
- ❌ Limited connections
- ❌ 90-day data retention

Paid databases ($7/month):
- ✅ Always available
- ✅ Better performance
- ✅ More connections
- ✅ Automatic backups

### Option 4: Use Alternative Database

If Render issues persist, consider:

**A. Railway.app** (Free $5 credit):
```bash
# Install Railway CLI
npm install -g railway

# Login and create PostgreSQL
railway login
railway init
railway add postgresql

# Get connection string
railway variables
```

**B. Supabase** (Free tier, no sleep):
1. Go to https://supabase.com
2. Create new project
3. Go to Settings → Database
4. Copy connection string (Transaction Pooling)

**C. Neon.tech** (Free tier, no sleep):
1. Go to https://neon.tech
2. Create new project
3. Copy connection string

## Test Connection

After fixing, test with:

```bash
cd backend
node test-db-connection.js
```

Expected output:
```
✅ Database connection successful!
✅ Database query successful!
```

## Quick Fix Commands

### Wake Database & Test
```bash
# Wait 30 seconds, then:
cd backend
node test-db-connection.js
```

### If Still Fails - Check .env Format
```bash
# Your DATABASE_URL should look like:
DATABASE_URL="postgresql://username:password@host:5432/database?ssl=true"

# Common mistakes:
# ❌ Missing port :5432
# ❌ Missing ?ssl=true
# ❌ Space in connection string
# ❌ Wrong password
```

## Alternative: Use Local PostgreSQL (Development Only)

If you want to develop offline:

### Windows (using Docker):
```bash
docker run --name healbridge-postgres -e POSTGRES_PASSWORD=mysecretpassword -e POSTGRES_DB=healbridge -p 5432:5432 -d postgres:15
```

Then update `.env`:
```env
DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/healbridge"
```

## Render.com Specific Issues

### Issue 1: Database Suspended
**Reason:** No activity for 90 days (free tier)
**Fix:** Database data is deleted. Create new database.

### Issue 2: Connection Limit Reached
**Reason:** Free tier has limited connections (5)
**Fix:** 
```javascript
// Update prisma.js
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Add connection pooling
  pool: {
    min: 1,
    max: 5,
  },
});
```

### Issue 3: SSL Certificate Error
**Fix:** Add `?sslmode=require` to connection string:
```env
DATABASE_URL="postgresql://...?sslmode=require"
```

## Next Steps After Connection Works

1. Generate Prisma client:
```bash
npm run prisma:generate
```

2. Run migrations:
```bash
npm run prisma:migrate
```

3. Start backend:
```bash
npm start
```

## Support

If issues persist:
1. Check Render Status: https://status.render.com/
2. Check your Render dashboard for error messages
3. Try connecting with a PostgreSQL client (pgAdmin, DBeaver) to verify credentials

