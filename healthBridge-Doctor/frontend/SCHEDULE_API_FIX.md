# ✅ Schedule Creation 400 Error - FIXED

## 🐛 Problem
Creating schedules (both one-time and recurring) was causing **400 Bad Request** errors.

---

## 🔍 Root Cause

**Frontend sent wrong field names that didn't match backend validation schema.**

### What Backend Expected:

#### **One-Time Schedule** (`POST /doctor/schedule`)
```javascript
{
  clinicId: string,        // ✓ Required
  startTs: Date,           // ✓ Required (ISO timestamp)
  endTs: Date,             // ✓ Required (ISO timestamp)
  slotMinutes: number,     // Optional (default: 15)
  bufferMinutes: number,   // Optional (default: 0)
  type: string            // Optional ('work'|'break'|'holiday', default: 'work')
}
```

#### **Recurring Schedule** (`POST /doctor/schedule/recurring`)
```javascript
{
  clinicId: string,           // ✓ Required
  weekPattern: [{             // ✓ Required (array of patterns)
    day: number,              // 0-6 (Sunday=0, Monday=1, etc.)
    startTime: string,        // "HH:MM" format (e.g., "09:00")
    endTime: string           // "HH:MM" format (e.g., "17:00")
  }],
  startDate: Date,            // ✓ Required (when to start recurring)
  endDate: Date,              // ✓ Required (when to stop recurring)
  slotMinutes: number,        // Optional (default: 15)
  bufferMinutes: number       // Optional (default: 0)
}
```

### What Frontend Was Sending (❌ Wrong):

#### One-Time Schedule:
```javascript
{
  clinicId: "...",                    // ✓ Correct
  startTs: "...",                     // ✓ Correct
  endTs: "...",                       // ✓ Correct
  slotDurationMinutes: 30,            // ❌ Wrong field name (should be slotMinutes)
  isHouseVisit: false                 // ❌ Unexpected field (not in schema)
  // Missing: bufferMinutes, type
}
```

#### Recurring Schedule:
```javascript
{
  clinicId: "...",                    // ✓ Correct
  dayOfWeek: 1,                       // ❌ Wrong format (should be weekPattern array)
  startTime: "09:00",                 // ❌ Wrong structure
  endTime: "17:00",                   // ❌ Wrong structure
  slotDurationMinutes: 30,            // ❌ Wrong field name
  isHouseVisit: false,                // ❌ Unexpected field
  recurrenceType: "WEEKLY",           // ❌ Not used by backend
  recurrenceEndDate: "..."            // ❌ Should be endDate
  // Missing: weekPattern, startDate, endDate, slotMinutes, bufferMinutes
}
```

---

## ✅ Solution Applied

### Fixed One-Time Schedule:
```javascript
const scheduleData = {
  clinicId: slotForm.clinic_id,
  startTs: startDate.toISOString(),    // ISO timestamp
  endTs: endDate.toISOString(),        // ISO timestamp
  slotMinutes: parseInt(slotForm.slot_duration_minutes),  // Correct field name
  bufferMinutes: 0,                    // Added
  type: 'work'                         // Added
};
```

### Fixed Recurring Schedule:
```javascript
const recurringData = {
  clinicId: slotForm.clinic_id,
  weekPattern: [{                       // Correct array format
    day: startDate.getDay(),            // 0-6
    startTime: slotForm.start_time,     // "HH:MM"
    endTime: slotForm.end_time          // "HH:MM"
  }],
  startDate: startDate.toISOString(),   // When to start
  endDate: endDate.toISOString(),       // When to stop (defaults to 1 year)
  slotMinutes: parseInt(slotForm.slot_duration_minutes),
  bufferMinutes: 0
};
```

---

## 🔑 Key Changes

| Field Name | Before (❌) | After (✅) | Notes |
|------------|------------|-----------|-------|
| Slot duration | `slotDurationMinutes` | `slotMinutes` | Backend validation name |
| Buffer time | Not sent | `bufferMinutes: 0` | Required by backend |
| Schedule type | Not sent | `type: 'work'` | Backend default |
| House visit flag | `isHouseVisit` | Removed | Not in backend schema |
| Recurring format | Single day fields | `weekPattern` array | Backend structure |
| Start date | Not sent | `startDate` | Required for recurring |
| End date | `recurrenceEndDate` | `endDate` | Correct field name |

---

## 📋 Backend Validation Schema

From `backend/src/middleware/validation.middleware.js`:

### One-Time Schedule Validation:
```javascript
createSchedule: Joi.object({
  clinicId: Joi.string().required(),
  startTs: Joi.date().required(),
  endTs: Joi.date().greater(Joi.ref('startTs')).required(),
  slotMinutes: Joi.number().min(5).max(120).default(15),
  bufferMinutes: Joi.number().min(0).max(30).default(0),
  type: Joi.string().valid('work', 'break', 'holiday').default('work')
}),
```

### Recurring Schedule Validation:
```javascript
createRecurringSchedule: Joi.object({
  clinicId: Joi.string().required(),
  weekPattern: Joi.array().items(
    Joi.object({
      day: Joi.number().min(0).max(6).required(),
      startTime: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).required(),
      endTime: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).required()
    })
  ).min(1).required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().greater(Joi.ref('startDate')).required(),
  slotMinutes: Joi.number().min(5).max(120).default(15),
  bufferMinutes: Joi.number().min(0).max(30).default(0)
}),
```

---

## 🚀 How It Works Now

### One-Time Schedule Example:
**User Input:**
- Clinic: Heart Care Clinic
- Date: 2025-02-01
- Start Time: 09:00
- End Time: 17:00
- Slot Duration: 30 minutes

**Sent to Backend:**
```json
{
  "clinicId": "clinic-uuid-123",
  "startTs": "2025-02-01T09:00:00.000Z",
  "endTs": "2025-02-01T17:00:00.000Z",
  "slotMinutes": 30,
  "bufferMinutes": 0,
  "type": "work"
}
```

**Backend Creates:**
- Schedule block from 9 AM to 5 PM
- Divided into 30-minute slots
- Total: 16 appointment slots available

---

### Recurring Schedule Example:
**User Input:**
- Clinic: Heart Care Clinic
- Date: 2025-02-03 (Monday)
- Start Time: 09:00
- End Time: 17:00
- Recurring: Weekly
- End Date: 2025-12-31

**Sent to Backend:**
```json
{
  "clinicId": "clinic-uuid-123",
  "weekPattern": [{
    "day": 1,
    "startTime": "09:00",
    "endTime": "17:00"
  }],
  "startDate": "2025-02-03T00:00:00.000Z",
  "endDate": "2025-12-31T00:00:00.000Z",
  "slotMinutes": 30,
  "bufferMinutes": 0
}
```

**Backend Creates:**
- Schedule pattern for every Monday
- From Feb 3, 2025 to Dec 31, 2025
- 9 AM - 5 PM with 30-min slots
- Automatically creates slots every week

---

## 📊 Field Mapping Reference

### Frontend Form → Backend API

| Form Field | Maps To | Type | Example |
|------------|---------|------|---------|
| `clinic_id` | `clinicId` | string | "clinic-uuid-123" |
| `date` + `start_time` | `startTs` | ISO Date | "2025-02-01T09:00:00.000Z" |
| `date` + `end_time` | `endTs` | ISO Date | "2025-02-01T17:00:00.000Z" |
| `slot_duration_minutes` | `slotMinutes` | number | 30 |
| N/A | `bufferMinutes` | number | 0 (auto) |
| N/A | `type` | string | "work" (auto) |

**For Recurring:**
| Form Field | Maps To | Notes |
|------------|---------|-------|
| `date` | `weekPattern[0].day` | Extract day of week (0-6) |
| `start_time` | `weekPattern[0].startTime` | Direct mapping |
| `end_time` | `weekPattern[0].endTime` | Direct mapping |
| `date` | `startDate` | When pattern starts |
| `recurrence_end_date` | `endDate` | When pattern ends (default: 1 year) |

---

## ✅ Testing

### Test One-Time Schedule:
1. Open Schedule page
2. Click "Add Slot"
3. Fill in:
   - Clinic: Select any
   - Date: Tomorrow
   - Start: 09:00
   - End: 17:00
   - Duration: 30 minutes
4. DON'T check recurring
5. Click "Create Schedule"
6. ✅ Should see success message
7. ✅ No 400 error

### Test Recurring Schedule:
1. Open Schedule page
2. Click "Add Slot"
3. Fill in same as above
4. ✅ CHECK "Make this a recurring schedule"
5. Type: Weekly
6. End Date: 6 months from now
7. Click "Create Schedule"
8. ✅ Should see success message
9. ✅ No 400 error

---

## 🔧 Troubleshooting

### If you still get 400 error:

1. **Check Backend Console:**
   - Look for validation error details
   - Shows which field failed

2. **Check Browser Network Tab:**
   - Open DevTools (F12)
   - Network tab
   - Find the failed request
   - Check "Payload" to see what was sent
   - Check "Response" to see error details

3. **Common Issues:**
   - **"clinicId is required"** → No clinic selected
   - **"startTs must be before endTs"** → End time before start time
   - **"day must be between 0 and 6"** → Date parsing issue
   - **"startTime must match pattern"** → Time format wrong

---

## 📝 Backend Processing

### What Backend Does:

1. **Validates Request:**
   - Checks all required fields present
   - Validates data types
   - Checks constraints (e.g., end > start)

2. **Checks for Conflicts:**
   - Queries existing schedules
   - Ensures no time overlaps
   - Returns error if conflict found

3. **Creates Schedule:**
   - Inserts into `ScheduleBlock` table
   - Links to doctor and clinic
   - Returns created schedule

4. **For Recurring:**
   - Stores weekly pattern
   - Backend auto-generates blocks weekly
   - Until end date reached

---

## 🎯 Status

✅ **One-Time Schedule** - FIXED  
✅ **Recurring Schedule** - FIXED  
✅ **Field names corrected**  
✅ **Data format matches backend**  
✅ **Validation passes**  
✅ **No more 400 errors**  

---

## 📚 Related Files

- **Frontend:** `src/pages/Schedule.jsx`
- **Backend Validation:** `backend/src/middleware/validation.middleware.js`
- **Backend Service:** `backend/src/services/schedule.service.js`
- **Backend Controller:** `backend/src/controllers/doctor.controller.js`

---

**Problem Solved! Schedule creation should now work without 400 errors.** ✅

