# 🔧 Doctor Profile Schema Update Guide

## Changes Made

Added `firstName` and `lastName` fields to the Doctor model to allow proper name display instead of showing phone numbers.

## Quick Update Commands

### Option 1: Using Prisma Migrate (Recommended)

```bash
cd backend

# Generate and apply migration
npm run prisma:migrate

# When prompted, name it: "add_doctor_name_fields"

# Generate Prisma client
npm run prisma:generate
```

### Option 2: Direct Database Push (Quick for Development)

```bash
cd backend

# Push schema changes directly to database
npm run prisma:db:push

# Generate Prisma client
npm run prisma:generate
```

### Option 3: Manual SQL (if above don't work)

```sql
-- Connect to your PostgreSQL database and run:
ALTER TABLE "Doctor" ADD COLUMN "firstName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Doctor" ADD COLUMN "lastName" TEXT NOT NULL DEFAULT '';
```

## Update Existing Doctor Names

After migration, you can update your doctor's name:

```bash
# Use the test script
node backend/scripts/update-doctor-name.js
```

Or via API (after server restart):

```bash
# Get your doctor ID from the database or login
# Then call the update endpoint:

curl -X PUT http://localhost:3000/api/doctor/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe"
  }'
```

## Update Verification Status (For Testing)

```bash
# Use the verification update script
node backend/scripts/update-verification.js <doctorId> VERIFIED
```

Or via API:

```bash
curl -X PUT http://localhost:3000/api/doctor/verification/<DOCTOR_ID>/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "VERIFIED"}'
```

## Restart Server

After migration:

```bash
cd backend
npm start
```

## Verify Changes

1. ✅ Doctor table has firstName and lastName columns
2. ✅ Settings page loads without errors
3. ✅ Can update name via Settings
4. ✅ Name displays correctly (not phone number)
5. ✅ Verification status shows correctly

## Troubleshooting

### Issue: Migration fails
```bash
# Reset and try again
npx prisma migrate reset --schema=./src/prisma/schema.prisma
npm run prisma:db:push
```

### Issue: Prisma client outdated
```bash
npm run prisma:generate
```

### Issue: TypeScript errors
```bash
# Prisma client types need regeneration
rm -rf node_modules/.prisma
npm run prisma:generate
```

