package com.example.healbridge.api

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.tasks.await
import okhttp3.*
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

class SupabaseClient {
    companion object {
        private const val SUPABASE_URL = "https://YOUR_PROJECT.functions.supabase.co"
        private const val SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY"
    }
    
    private val client = OkHttpClient()
    
    suspend fun uploadDocument(
        context: Context,
        fileUri: Uri,
        type: String,
        patientId: String
    ): Result<DocumentUploadResponse> {
        return try {
            val token = FirebaseAuth.getInstance().currentUser?.getIdToken(false)?.await()?.token
                ?: return Result.failure(Exception("No auth token"))
            
            val file = uriToFile(context, fileUri)
            val requestBody = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("file", file.name, file.asRequestBody("multipart/form-data".toMediaType()))
                .addFormDataPart("type", type)
                .addFormDataPart("patient_id", patientId)
                .build()
            
            val request = Request.Builder()
                .url("$SUPABASE_URL/upload-document")
                .post(requestBody)
                .addHeader("Authorization", "Bearer $token")
                .addHeader("apikey", SUPABASE_ANON_KEY)
                .build()
            
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val json = JSONObject(response.body?.string() ?: "{}")
                Result.success(DocumentUploadResponse.fromJson(json))
            } else {
                Result.failure(Exception("Upload failed: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getPatientSummary(patientId: String, query: String? = null): Result<PatientSummaryResponse> {
        return try {
            val token = FirebaseAuth.getInstance().currentUser?.getIdToken(false)?.await()?.token
                ?: return Result.failure(Exception("No auth token"))
            
            val urlBuilder = "$SUPABASE_URL/patient-summary".toHttpUrl().newBuilder()
                .addQueryParameter("patient_id", patientId)
            
            query?.let { urlBuilder.addQueryParameter("query", it) }
            
            val request = Request.Builder()
                .url(urlBuilder.build())
                .get()
                .addHeader("Authorization", "Bearer $token")
                .addHeader("apikey", SUPABASE_ANON_KEY)
                .build()
            
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val json = JSONObject(response.body?.string() ?: "{}")
                Result.success(PatientSummaryResponse.fromJson(json))
            } else {
                Result.failure(Exception("Summary failed: ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    private fun uriToFile(context: Context, uri: Uri): File {
        val fileName = getFileName(context, uri)
        val tempFile = File(context.cacheDir, fileName)
        context.contentResolver.openInputStream(uri)?.use { input ->
            FileOutputStream(tempFile).use { output ->
                input.copyTo(output)
            }
        }
        return tempFile
    }
    
    private fun getFileName(context: Context, uri: Uri): String {
        var fileName = "document"
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (nameIndex >= 0) {
                    fileName = cursor.getString(nameIndex)
                }
            }
        }
        return fileName
    }
}

data class DocumentUploadResponse(
    val success: Boolean,
    val documentId: String?,
    val fileUrl: String?,
    val extractedText: String?,
    val structuredData: StructuredData?,
    val confidence: Double?,
    val needsVerification: Boolean?,
    val ocrError: String?
) {
    companion object {
        fun fromJson(json: JSONObject): DocumentUploadResponse {
            return DocumentUploadResponse(
                success = json.getBoolean("success"),
                documentId = json.optString("document_id"),
                fileUrl = json.optString("file_url"),
                extractedText = json.optString("extracted_text"),
                structuredData = json.optJSONObject("structured_data")?.let { StructuredData.fromJson(it) },
                confidence = json.optDouble("confidence"),
                needsVerification = json.optBoolean("needs_verification"),
                ocrError = json.optString("ocr_error")
            )
        }
    }
}

data class StructuredData(
    val medications: List<Medication>?
) {
    companion object {
        fun fromJson(json: JSONObject): StructuredData {
            val medicationsArray = json.optJSONArray("medications")
            val medications = mutableListOf<Medication>()
            medicationsArray?.let {
                for (i in 0 until it.length()) {
                    medications.add(Medication.fromJson(it.getJSONObject(i)))
                }
            }
            return StructuredData(medications)
        }
    }
}

data class Medication(
    val name: String,
    val strength: String,
    val form: String,
    val frequency: String,
    val durationDays: Int?,
    val route: String
) {
    companion object {
        fun fromJson(json: JSONObject): Medication {
            return Medication(
                name = json.getString("name"),
                strength = json.getString("strength"),
                form = json.getString("form"),
                frequency = json.getString("frequency"),
                durationDays = json.optInt("duration_days"),
                route = json.getString("route")
            )
        }
    }
}

data class PatientSummaryResponse(
    val success: Boolean,
    val summary: PatientSummary?,
    val pdfUrl: String?
) {
    companion object {
        fun fromJson(json: JSONObject): PatientSummaryResponse {
            return PatientSummaryResponse(
                success = json.getBoolean("success"),
                summary = json.optJSONObject("summary")?.let { PatientSummary.fromJson(it) },
                pdfUrl = json.optString("pdf_url")
            )
        }
    }
}

data class PatientSummary(
    val patient: PatientInfo,
    val medicalInfo: MedicalInfo,
    val visitHistory: List<VisitHistory>,
    val currentMedications: List<CurrentMedication>,
    val documentsSummary: DocumentsSummary,
    val ragQuery: String?,
    val ragAnswer: String?,
    val ragSources: List<RagSource>?
) {
    companion object {
        fun fromJson(json: JSONObject): PatientSummary {
            return PatientSummary(
                patient = PatientInfo.fromJson(json.getJSONObject("patient")),
                medicalInfo = MedicalInfo.fromJson(json.getJSONObject("medical_info")),
                visitHistory = json.getJSONArray("visit_history").let { array ->
                    (0 until array.length()).map { VisitHistory.fromJson(array.getJSONObject(it)) }
                },
                currentMedications = json.getJSONArray("current_medications").let { array ->
                    (0 until array.length()).map { CurrentMedication.fromJson(array.getJSONObject(it)) }
                },
                documentsSummary = DocumentsSummary.fromJson(json.getJSONObject("documents_summary")),
                ragQuery = json.optString("rag_query"),
                ragAnswer = json.optString("rag_answer"),
                ragSources = json.optJSONArray("rag_sources")?.let { array ->
                    (0 until array.length()).map { RagSource.fromJson(array.getJSONObject(it)) }
                }
            )
        }
    }
}

data class PatientInfo(val name: String, val age: Int, val gender: String, val email: String) {
    companion object {
        fun fromJson(json: JSONObject) = PatientInfo(
            json.getString("name"), json.getInt("age"), 
            json.getString("gender"), json.getString("email")
        )
    }
}

data class MedicalInfo(val chronicConditions: List<String>, val allergies: List<String>) {
    companion object {
        fun fromJson(json: JSONObject) = MedicalInfo(
            json.getJSONArray("chronic_conditions").let { (0 until it.length()).map { i -> it.getString(i) } },
            json.getJSONArray("allergies").let { (0 until it.length()).map { i -> it.getString(i) } }
        )
    }
}

data class VisitHistory(val date: String, val clinic: String, val type: String, val prescriptionsCount: Int) {
    companion object {
        fun fromJson(json: JSONObject) = VisitHistory(
            json.getString("date"), json.getString("clinic"),
            json.getString("type"), json.getInt("prescriptions_count")
        )
    }
}

data class CurrentMedication(val name: String, val strength: String, val frequency: String) {
    companion object {
        fun fromJson(json: JSONObject) = CurrentMedication(
            json.getString("name"), json.getString("strength"), json.getString("frequency")
        )
    }
}

data class DocumentsSummary(val prescriptions: Int, val labReports: Int, val total: Int) {
    companion object {
        fun fromJson(json: JSONObject) = DocumentsSummary(
            json.getInt("prescriptions"), json.getInt("lab_reports"), json.getInt("total")
        )
    }
}

data class RagSource(val index: Int, val docType: String, val excerpt: String, val similarity: Double) {
    companion object {
        fun fromJson(json: JSONObject) = RagSource(
            json.getInt("index"), json.getString("doc_type"),
            json.getString("excerpt"), json.getDouble("similarity")
        )
    }
}