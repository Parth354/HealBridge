package com.example.healbridge.api

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.TimeUnit
import java.security.MessageDigest
import java.util.UUID

class SupabaseClient {
    companion object {
        private const val SUPABASE_FUNCTIONS_URL = SupabaseConfig.SUPABASE_FUNCTIONS_URL
    }
    
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()
    
    suspend fun uploadDocument(
        context: Context,
        fileUri: Uri,
        type: String,
        patientId: String
    ): Result<DocumentUploadResponse> = withContext(Dispatchers.IO) {
        try {
            val file = uriToFile(context, fileUri)
            val mimeType = getMimeType(context, fileUri, file.name)
            val requestBody = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("file", file.name, file.asRequestBody(mimeType.toMediaType()))
                .addFormDataPart("patient_id", firebaseUidToUuid(patientId))
                .build()
            
            val request = Request.Builder()
                .url("$SUPABASE_FUNCTIONS_URL/document-upload")
                .post(requestBody)
                .build()
            
            val response = client.newCall(request).execute()
            val responseBody = response.body?.string() ?: "{}"
            
            if (response.isSuccessful) {
                val json = JSONObject(responseBody)
                Result.success(DocumentUploadResponse.fromJson(json))
            } else {
                android.util.Log.e("SupabaseClient", "Upload failed: ${response.code} - $responseBody")
                Result.failure(Exception("Upload failed: ${response.code} - $responseBody"))
            }
        } catch (e: Exception) {
            android.util.Log.e("SupabaseClient", "Upload exception", e)
            Result.failure(e)
        }
    }
    
    suspend fun getPatientSummary(patientId: String, query: String? = null): Result<PatientSummaryResponse> = withContext(Dispatchers.IO) {
        try {
            val uuid = firebaseUidToUuid(patientId)
            val urlBuilder = "$SUPABASE_FUNCTIONS_URL/patient-summary".toHttpUrl().newBuilder()
                .addQueryParameter("patient_id", uuid)
            
            query?.let { urlBuilder.addQueryParameter("query", it) }
            
            val request = Request.Builder()
                .url(urlBuilder.build())
                .post("".toRequestBody("application/json".toMediaType()))
                .addHeader("Content-Type", "application/json")
                .build()
            
            val response = client.newCall(request).execute()
            val responseBody = response.body?.string() ?: "{}"
            
            if (response.isSuccessful) {
                val json = JSONObject(responseBody)
                Result.success(PatientSummaryResponse.fromJson(json))
            } else {
                android.util.Log.e("SupabaseClient", "Summary failed: ${response.code} - $responseBody")
                Result.failure(Exception("Summary failed: ${response.code} - $responseBody"))
            }
        } catch (e: Exception) {
            android.util.Log.e("SupabaseClient", "Summary exception", e)
            Result.failure(e)
        }
    }
    
    suspend fun getDocuments(
        patientId: String,
        page: Int = 1,
        limit: Int = 20,
        type: String? = null,
        search: String? = null,
        order: String = "desc",
        signedUrls: Boolean = false,
        signedSeconds: Int = 3600
    ): Result<DocumentsResponse> = withContext(Dispatchers.IO) {
        try {
            val uuid = firebaseUidToUuid(patientId)
            android.util.Log.d("SupabaseClient", "Fetching documents for UUID: $uuid (from Firebase UID: $patientId)")
            
            val offset = (page - 1) * limit
            val anonKey = SupabaseConfig.SUPABASE_ANON_KEY
            
            // Build PostgREST URL with query parameters
            val urlBuilder = "${SupabaseConfig.POSTGREST_URL}/documents".toHttpUrl().newBuilder()
                .addQueryParameter("patient_id", "eq.$uuid")
                .addQueryParameter("order", "created_at.${order}")
                .addQueryParameter("limit", limit.toString())
                .addQueryParameter("offset", offset.toString())
                .addQueryParameter("select", "id,patient_id,type,file_url,text,structured_json,ocr_confidence,created_at,updated_at")
            
            // Add type filter if provided
            type?.let {
                urlBuilder.addQueryParameter("type", "eq.$it")
            }
            
            // Add search filter if provided (text search using ilike)
            search?.takeIf { it.trim().isNotEmpty() }?.let { searchTerm ->
                urlBuilder.addQueryParameter("text", "ilike.*${searchTerm.trim()}*")
            }
            
            val url = urlBuilder.build()
            android.util.Log.d("SupabaseClient", "PostgREST URL: $url")
            
            // Make request with count in headers
            val request = Request.Builder()
                .url(url)
                .get()
                .addHeader("apikey", anonKey)
                .addHeader("Authorization", "Bearer $anonKey")
                .addHeader("Content-Type", "application/json")
                .addHeader("Prefer", "count=exact")
                .build()
            
            val response = client.newCall(request).execute()
            val responseBody = response.body?.string() ?: "[]"
            
            // Get count from Content-Range header
            val contentRange = response.header("Content-Range") ?: ""
            val totalCount = extractCountFromContentRange(contentRange)
            
            android.util.Log.d("SupabaseClient", "PostgREST response: ${response.code}, Content-Range: $contentRange, body length: ${responseBody.length}")
            
            if (response.isSuccessful) {
                val jsonArray = org.json.JSONArray(responseBody)
                val documents = mutableListOf<Document>()
                
                for (i in 0 until jsonArray.length()) {
                    val docJson = jsonArray.getJSONObject(i)
                    documents.add(
                        Document(
                            id = docJson.getString("id"),
                            type = docJson.getString("type"),
                            fileUrl = docJson.getString("file_url"),
                            text = docJson.optString("text").takeIf { it.isNotEmpty() },
                            ocrConfidence = docJson.optDouble("ocr_confidence", 0.0),
                            createdAt = docJson.getString("created_at")
                        )
                    )
                }
                
                val actualTotalCount = if (totalCount > 0) totalCount else documents.size
                val totalPages = if (actualTotalCount > 0 && limit > 0) {
                    Math.ceil(actualTotalCount.toDouble() / limit).toInt()
                } else {
                    1
                }
                
                android.util.Log.d("SupabaseClient", "Fetched ${documents.size} documents (page $page of $totalPages, total: $actualTotalCount)")
                
                Result.success(
                    DocumentsResponse(
                        success = true,
                        documents = documents,
                        totalCount = actualTotalCount,
                        currentPage = page,
                        totalPages = totalPages
                    )
                )
            } else {
                android.util.Log.e("SupabaseClient", "PostgREST failed: ${response.code} - $responseBody")
                Result.failure<DocumentsResponse>(Exception("Failed to fetch documents: ${response.code} - $responseBody"))
            }
        } catch (e: Exception) {
            android.util.Log.e("SupabaseClient", "Documents exception: ${e.message}", e)
            android.util.Log.e("SupabaseClient", "Stack trace: ${e.stackTraceToString()}")
            Result.failure<DocumentsResponse>(e)
        }
    }
    
    private fun extractCountFromContentRange(contentRange: String): Int {
        // Content-Range format: "0-9/25" where 25 is total count
        return try {
            if (contentRange.contains("/")) {
                contentRange.split("/").last().toInt()
            } else {
                0
            }
        } catch (e: Exception) {
            android.util.Log.w("SupabaseClient", "Failed to extract count from Content-Range: $contentRange", e)
            0
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
    
    private fun getMimeType(context: Context, uri: Uri, fileName: String): String {
        val mimeType = context.contentResolver.getType(uri)
        if (mimeType != null) return mimeType
        
        return when (fileName.substringAfterLast('.', "").lowercase()) {
            "pdf" -> "application/pdf"
            "jpg", "jpeg" -> "image/jpeg"
            "png" -> "image/png"
            "gif" -> "image/gif"
            "webp" -> "image/webp"
            else -> "application/octet-stream"
        }
    }
    
    private fun firebaseUidToUuid(firebaseUid: String): String {
        val md = MessageDigest.getInstance("MD5")
        val hash = md.digest(firebaseUid.toByteArray())
        return UUID.nameUUIDFromBytes(hash).toString()
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
    val pastMedications: List<PastMedication>,
    val documentsSummary: DocumentsSummary,
    val recentDocuments: List<RecentDocument>,
    val ragQuery: String?,
    val ragAnswer: String?,
    val ragSources: List<RagSource>?
) {
    companion object {
        fun fromJson(json: JSONObject): PatientSummary {
            return PatientSummary(
                patient = PatientInfo.fromJson(json.getJSONObject("patient")),
                medicalInfo = MedicalInfo.fromJson(json.getJSONObject("medical_info")),
                visitHistory = json.optJSONArray("visit_history")?.let { array ->
                    (0 until array.length()).map { VisitHistory.fromJson(array.getJSONObject(it)) }
                } ?: emptyList(),
                currentMedications = json.optJSONArray("current_medications")?.let { array ->
                    (0 until array.length()).map { CurrentMedication.fromJson(array.getJSONObject(it)) }
                } ?: emptyList(),
                pastMedications = json.optJSONArray("past_medications")?.let { array ->
                    (0 until array.length()).map { PastMedication.fromJson(array.getJSONObject(it)) }
                } ?: emptyList(),
                documentsSummary = DocumentsSummary.fromJson(json.getJSONObject("documents_summary")),
                recentDocuments = json.optJSONArray("recent_documents")?.let { array ->
                    (0 until array.length()).map { RecentDocument.fromJson(array.getJSONObject(it)) }
                } ?: emptyList(),
                ragQuery = json.optString("rag_query").takeIf { it.isNotEmpty() },
                ragAnswer = json.optString("rag_answer").takeIf { it.isNotEmpty() },
                ragSources = json.optJSONArray("rag_sources")?.let { array ->
                    (0 until array.length()).map { RagSource.fromJson(array.getJSONObject(it)) }
                }
            )
        }
    }
}

data class DocumentsResponse(
    val success: Boolean,
    val documents: List<Document>,
    val totalCount: Int,
    val currentPage: Int,
    val totalPages: Int
) {
    companion object {
        fun fromJson(json: JSONObject): DocumentsResponse {
            return DocumentsResponse(
                success = json.getBoolean("success"),
                documents = json.getJSONArray("documents").let { array ->
                    (0 until array.length()).map { Document.fromJson(array.getJSONObject(it)) }
                },
                totalCount = json.getInt("total_count"),
                currentPage = json.getInt("current_page"),
                totalPages = json.getInt("total_pages")
            )
        }
    }
}

data class Document(
    val id: String,
    val type: String,
    val fileUrl: String,
    val text: String?,
    val ocrConfidence: Double,
    val createdAt: String
) {
    companion object {
        fun fromJson(json: JSONObject): Document {
            return Document(
                id = json.getString("id"),
                type = json.getString("type"),
                fileUrl = json.getString("file_url"),
                text = json.optString("text"),
                ocrConfidence = json.optDouble("ocr_confidence", 0.0),
                createdAt = json.getString("created_at")
            )
        }
    }
}

data class PatientInfo(val name: String, val age: Int, val gender: String, val phone: String, val email: String) {
    companion object {
        fun fromJson(json: JSONObject) = PatientInfo(
            json.optString("name", "N/A"), 
            json.optInt("age", 0), 
            json.optString("gender", "N/A"),
            json.optString("phone", "N/A"),
            json.optString("email", "N/A")
        )
    }
}

data class EmergencyContact(val name: String?, val phone: String?, val relationship: String?) {
    companion object {
        fun fromJson(json: JSONObject?): EmergencyContact? {
            return if (json == null || json.length() == 0) null else EmergencyContact(
                json.optString("name"),
                json.optString("phone"),
                json.optString("relationship")
            )
        }
    }
}

data class MedicalInfo(
    val chronicConditions: List<String>, 
    val allergies: List<String>,
    val emergencyContact: EmergencyContact?
) {
    companion object {
        fun fromJson(json: JSONObject) = MedicalInfo(
            json.optJSONArray("chronic_conditions")?.let { (0 until it.length()).map { i -> it.getString(i) } } ?: emptyList(),
            json.optJSONArray("allergies")?.let { (0 until it.length()).map { i -> it.getString(i) } } ?: emptyList(),
            EmergencyContact.fromJson(json.optJSONObject("emergency_contact"))
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

data class CurrentMedication(
    val name: String, 
    val strength: String, 
    val form: String,
    val frequency: String,
    val route: String,
    val started: String
) {
    companion object {
        fun fromJson(json: JSONObject) = CurrentMedication(
            json.getString("name"), 
            json.getString("strength"), 
            json.getString("form"),
            json.getString("frequency"),
            json.getString("route"),
            json.getString("started")
        )
    }
}

data class PastMedication(
    val name: String,
    val strength: String,
    val form: String,
    val frequency: String,
    val route: String,
    val started: String,
    val ended: String?
) {
    companion object {
        fun fromJson(json: JSONObject) = PastMedication(
            json.getString("name"),
            json.getString("strength"),
            json.getString("form"),
            json.getString("frequency"),
            json.getString("route"),
            json.getString("started"),
            json.optString("ended")
        )
    }
}

data class RecentDocument(
    val type: String,
    val date: String,
    val hasText: Boolean,
    val hasStructuredData: Boolean
) {
    companion object {
        fun fromJson(json: JSONObject) = RecentDocument(
            json.getString("type"),
            json.getString("date"),
            json.getBoolean("has_text"),
            json.getBoolean("has_structured_data")
        )
    }
}

data class DocumentsSummary(val prescriptions: Int, val other: Int, val total: Int) {
    companion object {
        fun fromJson(json: JSONObject) = DocumentsSummary(
            json.getInt("prescriptions"), 
            json.optInt("other", 0), 
            json.getInt("total")
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
