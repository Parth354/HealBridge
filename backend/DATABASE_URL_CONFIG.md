# Database Connection Configuration

## Issue Fixed
❌ **Error**: `Unknown property connectionLimit provided to PrismaClient constructor`
✅ **Fixed**: Removed invalid property from PrismaClient config

## Correct Way to Configure Connection Pooling

Connection pooling in Prisma is configured via the **DATABASE_URL** string, not in PrismaClient constructor.

### Update Your `.env` File

Add these parameters to your DATABASE_URL:

```env
DATABASE_URL="postgresql://pos_database_14ch_user:YOUR_PASSWORD@dpg-d46rfoggjchc73eltccg-a.singapore-postgres.render.com:5432/pos_database_14ch?connection_limit=5&pool_timeout=20&connect_timeout=10"
```

### Parameters Explained

| Parameter | Value | Why |
|-----------|-------|-----|
| `connection_limit` | `5` | Render free tier max connections |
| `pool_timeout` | `20` | Wait 20s for available connection |
| `connect_timeout` | `10` | Timeout connection attempt after 10s |

### Complete Format

```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?connection_limit=5&pool_timeout=20&connect_timeout=10
```

### For Render PostgreSQL:

1. Go to your Render dashboard
2. Click on your database
3. Copy the "External Database URL"
4. Add the parameters at the end:
   ```
   ?connection_limit=5&pool_timeout=20&connect_timeout=10
   ```

### Example:

**Before:**
```env
DATABASE_URL="postgresql://user:pass@host.render.com:5432/db"
```

**After:**
```env
DATABASE_URL="postgresql://user:pass@host.render.com:5432/db?connection_limit=5&pool_timeout=20&connect_timeout=10"
```

---

## Now Your Backend Should Start Successfully! 🚀

The retry logic in the authentication middleware will handle temporary database sleep issues.

