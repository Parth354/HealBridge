package com.example.healbridge

import android.content.Context
import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * API Service for HealBridge Backend
 * Handles authentication with Firebase tokens and communication with the backend
 * 
 * NOTE: Patient authentication is ONLY via Firebase/Gmail login
 * OTP authentication is for doctors and staff only
 */
class ApiService(private val context: Context) {

    companion object {
        // Update this with your backend URL
        private const val BASE_URL = "http://10.0.2.2:3000" // Android emulator localhost
        // For physical device, use: "http://YOUR_LOCAL_IP:3000" or your deployed URL
        // For production: "https://your-backend-domain.com"
        
        private const val TAG = "ApiService"
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()
    private val auth = FirebaseAuth.getInstance()

    // Data classes for API responses
    data class LoginResponse(
        val token: String,
        val user: UserData
    )

    data class UserData(
        val id: String,
        val email: String?,
        @SerializedName("firebase_uid") val firebaseUid: String?,
        val role: String,
        val verified: Boolean,
        val hasProfile: Boolean,
        val name: String?,
        val picture: String?
    )

    data class ErrorResponse(
        val error: String,
        val hint: String? = null
    )

    /**
     * Authenticate with Firebase token
     * Sends Firebase ID token to backend and receives JWT token
     */
    suspend fun authenticateWithFirebase(role: String = "PATIENT"): Result<LoginResponse> {
        return withContext(Dispatchers.IO) {
            try {
                val currentUser = auth.currentUser
                    ?: return@withContext Result.failure(Exception("No Firebase user logged in"))

                // Get Firebase ID token
                val firebaseToken = currentUser.getIdToken(false).await().token
                    ?: return@withContext Result.failure(Exception("Failed to get Firebase token"))

                Log.d(TAG, "Firebase token obtained, length: ${firebaseToken.length}")

                // Prepare request body
                val requestBody = mapOf(
                    "firebaseToken" to firebaseToken,
                    "role" to role
                )

                val jsonBody = gson.toJson(requestBody)
                val body = jsonBody.toRequestBody("application/json".toMediaType())

                // Build request
                val request = Request.Builder()
                    .url("$BASE_URL/api/auth/firebase/login")
                    .post(body)
                    .addHeader("Content-Type", "application/json")
                    .build()

                Log.d(TAG, "Sending Firebase login request to backend...")

                // Execute request
                client.newCall(request).execute().use { response ->
                    val responseBody = response.body?.string()
                    Log.d(TAG, "Response code: ${response.code}")
                    Log.d(TAG, "Response body: $responseBody")

                    if (response.isSuccessful && responseBody != null) {
                        val loginResponse = gson.fromJson(responseBody, LoginResponse::class.java)
                        
                        // Store JWT token in SharedPreferences
                        saveJwtToken(loginResponse.token)
                        
                        Log.d(TAG, "✅ Authentication successful: ${loginResponse.user.id}")
                        Result.success(loginResponse)
                    } else {
                        val errorResponse = responseBody?.let {
                            try {
                                gson.fromJson(it, ErrorResponse::class.java)
                            } catch (e: Exception) {
                                ErrorResponse(responseBody)
                            }
                        } ?: ErrorResponse("Authentication failed")

                        Log.e(TAG, "❌ Authentication failed: ${errorResponse.error}")
                        Result.failure(Exception(errorResponse.error))
                    }
                }
            } catch (e: IOException) {
                Log.e(TAG, "Network error during authentication", e)
                Result.failure(Exception("Network error: ${e.message}"))
            } catch (e: Exception) {
                Log.e(TAG, "Error during authentication", e)
                Result.failure(e)
            }
        }
    }

    /**
     * Get current user profile from backend
     * Uses JWT token for authentication
     */
    suspend fun getCurrentUser(): Result<UserData> {
        return withContext(Dispatchers.IO) {
            try {
                val jwtToken = getJwtToken()
                    ?: return@withContext Result.failure(Exception("No JWT token found"))

                val request = Request.Builder()
                    .url("$BASE_URL/api/auth/me")
                    .get()
                    .addHeader("Authorization", "Bearer $jwtToken")
                    .build()

                client.newCall(request).execute().use { response ->
                    val responseBody = response.body?.string()

                    if (response.isSuccessful && responseBody != null) {
                        val userData = gson.fromJson(responseBody, UserData::class.java)
                        Result.success(userData)
                    } else {
                        val errorResponse = responseBody?.let {
                            try {
                                gson.fromJson(it, ErrorResponse::class.java)
                            } catch (e: Exception) {
                                ErrorResponse(responseBody)
                            }
                        } ?: ErrorResponse("Failed to get user data")

                        Result.failure(Exception(errorResponse.error))
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error getting current user", e)
                Result.failure(e)
            }
        }
    }

    /**
     * Get patient profile from Firestore via backend
     * Patient data is stored in Firebase Firestore
     */
    suspend fun getPatientProfile(): Result<String> {
        return makeAuthenticatedRequest("/api/patient/profile", "GET")
    }

    /**
     * Update patient profile in Firestore via backend
     * @param profileData Profile fields to update
     */
    suspend fun updatePatientProfile(profileData: Map<String, Any>): Result<String> {
        return makeAuthenticatedRequest("/api/patient/profile", "PUT", profileData)
    }

    /**
     * Make authenticated API call with Firebase token
     * Can be used for any protected endpoint
     */
    suspend fun makeAuthenticatedRequest(
        endpoint: String,
        method: String = "GET",
        body: Map<String, Any>? = null,
        useFirebaseToken: Boolean = false
    ): Result<String> {
        return withContext(Dispatchers.IO) {
            try {
                val token = if (useFirebaseToken) {
                    val currentUser = auth.currentUser
                        ?: return@withContext Result.failure(Exception("No Firebase user"))
                    currentUser.getIdToken(false).await().token
                        ?: return@withContext Result.failure(Exception("Failed to get Firebase token"))
                } else {
                    getJwtToken()
                        ?: return@withContext Result.failure(Exception("No JWT token found"))
                }

                val requestBuilder = Request.Builder()
                    .url("$BASE_URL$endpoint")
                    .addHeader("Authorization", "Bearer $token")
                    .addHeader("Content-Type", "application/json")

                if (method == "POST" && body != null) {
                    val jsonBody = gson.toJson(body)
                    requestBuilder.post(jsonBody.toRequestBody("application/json".toMediaType()))
                } else if (method == "PUT" && body != null) {
                    val jsonBody = gson.toJson(body)
                    requestBuilder.put(jsonBody.toRequestBody("application/json".toMediaType()))
                } else if (method == "DELETE") {
                    requestBuilder.delete()
                }

                val request = requestBuilder.build()

                client.newCall(request).execute().use { response ->
                    val responseBody = response.body?.string()

                    if (response.isSuccessful && responseBody != null) {
                        Result.success(responseBody)
                    } else {
                        val errorResponse = responseBody?.let {
                            try {
                                gson.fromJson(it, ErrorResponse::class.java)
                            } catch (e: Exception) {
                                ErrorResponse(responseBody)
                            }
                        } ?: ErrorResponse("Request failed")

                        Result.failure(Exception(errorResponse.error))
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error making authenticated request", e)
                Result.failure(e)
            }
        }
    }

    /**
     * Save JWT token to SharedPreferences
     */
    private fun saveJwtToken(token: String) {
        val prefs = context.getSharedPreferences("healbridge_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("jwt_token", token).apply()
        Log.d(TAG, "JWT token saved to SharedPreferences")
    }

    /**
     * Get JWT token from SharedPreferences
     */
    private fun getJwtToken(): String? {
        val prefs = context.getSharedPreferences("healbridge_prefs", Context.MODE_PRIVATE)
        return prefs.getString("jwt_token", null)
    }

    /**
     * Clear stored tokens (logout)
     */
    fun clearTokens() {
        val prefs = context.getSharedPreferences("healbridge_prefs", Context.MODE_PRIVATE)
        prefs.edit().remove("jwt_token").apply()
        Log.d(TAG, "JWT token cleared from SharedPreferences")
    }
}

