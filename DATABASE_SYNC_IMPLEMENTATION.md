# HealBridge Database Synchronization Implementation

## 🎯 Current Architecture Analysis

### Databases in Use:
1. **PostgreSQL** (Backend) - Core system, appointments, doctors, users
2. **Firebase/Firestore** - Patient authentication and profiles  
3. **Supabase** - Document storage, OCR processing, RAG functionality

## 🔄 Critical Sync Requirements

### 1. User Identity Mapping
```javascript
// backend/src/services/sync.service.js
class SyncService {
  // Sync Firebase user to PostgreSQL
  async syncFirebaseUserToPostgres(firebaseUser) {
    const existingUser = await prisma.user.findUnique({
      where: { firebase_uid: firebaseUser.uid }
    });
    
    if (!existingUser) {
      return await prisma.user.create({
        data: {
          firebase_uid: firebaseUser.uid,
          phone: firebaseUser.phoneNumber,
          email: firebaseUser.email,
          role: 'PATIENT',
          verified: firebaseUser.emailVerified
        }
      });
    }
    
    return existingUser;
  }
  
  // Sync patient to Supabase for document association
  async syncPatientToSupabase(postgresUser, firebaseProfile) {
    const { data, error } = await supabase.auth.admin.createUser({
      user_id: postgresUser.id,
      email: firebaseProfile.email,
      phone: firebaseProfile.phone,
      user_metadata: {
        postgres_id: postgresUser.id,
        firebase_uid: postgresUser.firebase_uid,
        name: firebaseProfile.name,
        role: 'PATIENT'
      }
    });
    
    if (error) throw error;
    return data;
  }
}
```

### 2. Document Sync Pipeline
```javascript
// backend/src/services/document-sync.service.js
class DocumentSyncService {
  // Called after Supabase edge function processes document
  async syncDocumentFromSupabase(supabaseDocId) {
    // Get document from Supabase
    const { data: supabaseDoc } = await supabase
      .from('documents')
      .select('*')
      .eq('id', supabaseDocId)
      .single();
    
    // Create metadata record in PostgreSQL
    const postgresDoc = await prisma.document.create({
      data: {
        id: supabaseDoc.id,
        patient_id: await this.getPostgresPatientId(supabaseDoc.patient_id),
        type: supabaseDoc.type,
        file_url: supabaseDoc.file_url,
        text: supabaseDoc.text,
        structured_json: supabaseDoc.structured_json,
        ocr_confidence: supabaseDoc.ocr_confidence
      }
    });
    
    // Extract and sync medications
    if (supabaseDoc.structured_json?.medications) {
      await this.syncMedications(postgresDoc.id, supabaseDoc.structured_json.medications);
    }
    
    return postgresDoc;
  }
  
  async syncMedications(documentId, medications) {
    for (const med of medications) {
      await prisma.medication.create({
        data: {
          patient_id: await this.getPatientIdFromDocument(documentId),
          document_id: documentId,
          name: med.name,
          strength: med.strength,
          form: med.form || 'tablet',
          frequency: med.frequency,
          route: med.route || 'oral',
          duration_days: med.duration_days || 30,
          start_date: new Date(),
          reminders_enabled: false
        }
      });
    }
  }
}
```

### 3. Prescription Sync (PostgreSQL → Supabase)
```javascript
// backend/src/services/prescription-sync.service.js
class PrescriptionSyncService {
  async syncPrescriptionToSupabase(prescriptionId) {
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        appointment: {
          include: {
            patient: true,
            doctor: true
          }
        }
      }
    });
    
    // Create document in Supabase for RAG indexing
    const { data: supabaseDoc } = await supabase
      .from('documents')
      .insert({
        patient_id: prescription.appointment.patient.firebase_uid,
        type: 'prescription',
        file_url: prescription.pdf_url,
        text: this.generatePrescriptionText(prescription),
        structured_json: prescription.summary_json,
        ocr_confidence: 1.0
      })
      .select()
      .single();
    
    // Create RAG chunks for searchability
    await this.createRAGChunks(supabaseDoc.id, prescription);
    
    return supabaseDoc;
  }
  
  async createRAGChunks(documentId, prescription) {
    const chunks = [
      {
        chunk_text: `Prescription for ${prescription.appointment.patient.name}: ${JSON.stringify(prescription.summary_json.medications)}`,
        metadata: {
          type: 'prescription',
          doctor: prescription.appointment.doctor.name,
          date: prescription.created_at,
          appointment_id: prescription.appointment_id
        }
      }
    ];
    
    for (const chunk of chunks) {
      // Generate embedding using OpenAI/similar
      const embedding = await this.generateEmbedding(chunk.chunk_text);
      
      await supabase
        .from('rag_chunks')
        .insert({
          patient_id: prescription.appointment.patient.firebase_uid,
          document_id: documentId,
          chunk_text: chunk.chunk_text,
          embedding: embedding,
          metadata: chunk.metadata
        });
    }
  }
}
```

## 🔧 Implementation Strategy

### 1. Webhook-based Sync
```javascript
// backend/src/routes/webhooks.js
router.post('/supabase/document-processed', async (req, res) => {
  const { document_id, patient_id, type } = req.body;
  
  try {
    // Sync document from Supabase to PostgreSQL
    await documentSyncService.syncDocumentFromSupabase(document_id);
    
    // Notify patient app
    await notificationService.sendDocumentProcessedNotification(patient_id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Document sync failed:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/firebase/user-created', async (req, res) => {
  const { uid, email, phoneNumber } = req.body;
  
  try {
    // Sync Firebase user to PostgreSQL
    const postgresUser = await syncService.syncFirebaseUserToPostgres({
      uid, email, phoneNumber
    });
    
    // Create Supabase user for document access
    await syncService.syncPatientToSupabase(postgresUser, req.body);
    
    res.json({ success: true, postgres_id: postgresUser.id });
  } catch (error) {
    console.error('User sync failed:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 2. Background Job Processing
```javascript
// backend/src/jobs/sync-jobs.js
import Bull from 'bull';

const syncQueue = new Bull('sync queue', process.env.REDIS_URL);

// Process document sync jobs
syncQueue.process('sync-document', async (job) => {
  const { documentId } = job.data;
  await documentSyncService.syncDocumentFromSupabase(documentId);
});

// Process prescription sync jobs
syncQueue.process('sync-prescription', async (job) => {
  const { prescriptionId } = job.data;
  await prescriptionSyncService.syncPrescriptionToSupabase(prescriptionId);
});

// Add job when prescription is created
export const queuePrescriptionSync = (prescriptionId) => {
  syncQueue.add('sync-prescription', { prescriptionId }, {
    delay: 1000, // 1 second delay
    attempts: 3,
    backoff: 'exponential'
  });
};
```

### 3. Real-time Sync Monitoring
```javascript
// backend/src/services/sync-monitor.service.js
class SyncMonitorService {
  async checkSyncHealth() {
    const checks = {
      postgres_users: await prisma.user.count(),
      supabase_documents: await this.getSupabaseDocumentCount(),
      pending_syncs: await this.getPendingSyncCount(),
      failed_syncs: await this.getFailedSyncCount()
    };
    
    return {
      status: checks.failed_syncs === 0 ? 'healthy' : 'degraded',
      checks,
      last_check: new Date()
    };
  }
  
  async retryFailedSyncs() {
    const failedSyncs = await this.getFailedSyncs();
    
    for (const sync of failedSyncs) {
      try {
        await this.retrySyncOperation(sync);
      } catch (error) {
        console.error(`Retry failed for sync ${sync.id}:`, error);
      }
    }
  }
}
```

## 📊 Data Flow Diagram

```
┌─────────────────┐
│   Patient App   │
│   (Firebase)    │
└─────────┬───────┘
          │ 1. Auth & Profile
          ▼
┌─────────────────┐    2. User Sync    ┌─────────────────┐
│   PostgreSQL    │◄──────────────────►│   Backend API   │
│  (Core System)  │                    │   (Node.js)     │
└─────────┬───────┘                    └─────────┬───────┘
          │                                      │
          │ 3. Metadata Sync                     │ 4. Document Upload
          ▼                                      ▼
┌─────────────────┐    5. OCR Process   ┌─────────────────┐
│    Supabase     │◄──────────────────►│ Edge Functions  │
│ (Documents/RAG) │                    │   (OCR/RAG)     │
└─────────────────┘                    └─────────────────┘
```

## 🚨 Critical Sync Points

### 1. Patient Registration
```
Firebase Auth → PostgreSQL User → Supabase User
```

### 2. Document Upload
```
Patient App → Supabase Edge Function → Supabase DB → PostgreSQL Metadata
```

### 3. Appointment Booking
```
Patient App → PostgreSQL Appointment → Doctor Web App
```

### 4. Prescription Creation
```
Doctor Web App → PostgreSQL Prescription → Supabase RAG → Patient Notification
```

## 🔍 Monitoring & Debugging

### Sync Status Endpoint
```javascript
// GET /api/sync/status
router.get('/status', async (req, res) => {
  const status = await syncMonitorService.checkSyncHealth();
  res.json(status);
});

// GET /api/sync/patient/:patientId
router.get('/patient/:patientId', async (req, res) => {
  const { patientId } = req.params;
  
  const syncStatus = {
    postgres_user: await prisma.user.findUnique({ where: { id: patientId } }),
    firebase_profile: await getFirebaseProfile(patientId),
    supabase_documents: await getSupabaseDocuments(patientId),
    sync_logs: await getSyncLogs(patientId)
  };
  
  res.json(syncStatus);
});
```

This implementation ensures all three databases stay synchronized while maintaining data integrity and providing real-time updates across the entire HealBridge ecosystem.