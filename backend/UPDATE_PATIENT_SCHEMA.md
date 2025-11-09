# 🔧 Patient Profile Schema Update Guide

## Current Schema Status

The Patient model in `src/prisma/schema.prisma` should have the following fields to match the app:

```prisma
model Patient {
  id                String        @id @default(cuid())
  user_id           String        @unique
  name              String
  dob               DateTime
  gender            String
  allergies         String        @default("")
  chronicConditions String        @default("")
  emergencyContact  String
  careCircle        String[]      @default([])
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  // ... relations
}
```

## Quick Update Commands

### Option 1: Using Prisma Migrate (Recommended for Production)

```bash
cd backend

# Generate and apply migration
npm run prisma:migrate

# When prompted, name it: "update_patient_profile_fields"

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

### Option 3: Create Migration Script

```bash
cd backend

# Create a new migration
npx prisma migrate dev --name update_patient_profile --schema=./src/prisma/schema.prisma

# Generate Prisma client
npm run prisma:generate
```

## Verify Schema Matches App Requirements

The schema should support:
- ✅ `name` (String) - Full name
- ✅ `dob` (DateTime) - Date of birth
- ✅ `gender` (String) - Gender
- ✅ `allergies` (String, default: "") - Comma-separated allergies
- ✅ `chronicConditions` (String, default: "") - Comma-separated conditions
- ✅ `emergencyContact` (String) - Emergency contact phone
- ✅ `user_id` (String, unique) - Links to User table

## Update Existing Patient Records (Optional)

If you need to update existing patient records to ensure they have default values:

```bash
# Run the update script
node scripts/update-patient-profiles.js
```

## Restart Server

After migration:

```bash
cd backend
npm start
# or for development
npm run dev
```

## Verify Changes

1. ✅ Patient table has all required fields
2. ✅ Allergies and chronicConditions have default empty strings
3. ✅ Emergency contact field exists
4. ✅ App can create/update patient profiles
5. ✅ Data is stored and retrieved correctly

## Troubleshooting

### Issue: Migration fails
```bash
# Reset and try again (WARNING: This will delete all data in development)
npx prisma migrate reset --schema=./src/prisma/schema.prisma
npm run prisma:db:push
```

### Issue: Prisma client outdated
```bash
npm run prisma:generate
```

### Issue: Type errors
```bash
# Clean and regenerate Prisma client
rm -rf node_modules/.prisma
npm run prisma:generate
```

### Issue: Schema doesn't match
```bash
# Check current schema
cat src/prisma/schema.prisma | grep -A 15 "model Patient"

# Compare with expected schema above
```

## Manual SQL Update (If Needed)

If migrations don't work, you can manually update the database:

```sql
-- Connect to your PostgreSQL database and run:

-- Ensure allergies has default empty string
ALTER TABLE "Patient" 
  ALTER COLUMN "allergies" SET DEFAULT '';

-- Ensure chronicConditions has default empty string
ALTER TABLE "Patient" 
  ALTER COLUMN "chronicConditions" SET DEFAULT '';

-- Update existing records with empty strings if NULL
UPDATE "Patient" 
SET "allergies" = '' 
WHERE "allergies" IS NULL;

UPDATE "Patient" 
SET "chronicConditions" = '' 
WHERE "chronicConditions" IS NULL;

-- Ensure emergencyContact is NOT NULL (if it should be required)
-- ALTER TABLE "Patient" 
--   ALTER COLUMN "emergencyContact" SET NOT NULL;
```

## Testing

After updating the schema, test the API:

```bash
# Test creating a patient profile
curl -X POST http://localhost:3000/api/auth/patient/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "dob": "1990-01-01",
    "gender": "Male",
    "allergies": "Peanuts, Penicillin",
    "chronicConditions": "Diabetes, Hypertension",
    "emergencyContact": "1234567890"
  }'

# Test updating a patient profile
curl -X PUT http://localhost:3000/api/patient/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "allergies": ["Peanuts", "Latex"],
    "conditions": ["Diabetes"]
  }'
```

## Schema Alignment Checklist

- [x] Patient model has `allergies` field (String, default: "")
- [x] Patient model has `chronicConditions` field (String, default: "")
- [x] Patient model has `emergencyContact` field (String)
- [x] Backend controller handles allergies as array or string
- [x] Backend controller handles conditions as array or string
- [x] Backend returns allergies as array
- [x] Backend returns conditions as array
- [x] App sends allergies as string (create) or array (update)
- [x] App sends conditions as string (create) or array (update)
- [x] App displays allergies/conditions as comma-separated strings

## Notes

- **Allergies and Conditions**: Stored as comma-separated strings in database, converted to arrays in API responses
- **Emergency Contact**: Required field, must be 10-digit phone number
- **Name**: Stored as full name, split into firstName/lastName in API responses
- **Address**: Not stored in Patient model (only in Appointment for house visits)

