package com.example.healbridge.api

import android.content.Context
import com.example.healbridge.cache.CacheManager
import com.example.healbridge.data.NetworkResult
import com.example.healbridge.data.models.*
import com.example.healbridge.data.models.OTPRequest
import com.example.healbridge.data.models.OTPResponse
import com.example.healbridge.data.models.VerifyOTPRequest
import com.example.healbridge.data.models.LoginResponse

class ApiRepository(private val context: Context? = null) {
    private val apiService = ApiClient.apiService
    private val cacheManager: CacheManager? = context?.let { CacheManager(it) }
    
    // Doctor Search - maps backend response to app Doctor model with caching
    suspend fun searchDoctors(
        specialty: String? = null,
        lat: Double? = null,
        lon: Double? = null,
        visitType: String? = null,
        sortBy: String? = "distance",
        maxDistance: Int? = 50,
        minRating: Double? = 0.0,
        limit: Int = 20,
        useCache: Boolean = true
    ): NetworkResult<DoctorSearchResponse> {
        // Try cache first if enabled
        if (useCache && cacheManager != null) {
            val cachedDoctors = cacheManager.getCachedDoctors(lat, lon, specialty, maxDistance ?: 50)
            if (cachedDoctors != null && cachedDoctors.isNotEmpty()) {
                android.util.Log.d("ApiRepository", "Using cached doctors: ${cachedDoctors.size}")
                return NetworkResult.Success(
                    DoctorSearchResponse(
                        doctors = cachedDoctors,
                        totalCount = cachedDoctors.size,
                        currentPage = 1,
                        totalPages = 1
                    )
                )
            }
        }
        
        return try {
            val response = apiService.searchDoctors(specialty, lat, lon, visitType, sortBy, maxDistance, minRating, limit)
            if (response.isSuccessful && response.body() != null) {
                val backendResponse = response.body()!!
                
                // Map backend response to app Doctor model
                val doctors = backendResponse.doctors.map { backendDoctor ->
                    // Use the toDoctor function which handles name extraction properly
                    com.example.healbridge.data.models.toDoctor(
                        backendDoctor,
                        userEmail = backendDoctor.user?.email,
                        userPhone = backendDoctor.user?.phone
                    )
                }
                
                // Cache the results
                if (cacheManager != null) {
                    cacheManager.cacheDoctors(doctors, lat, lon, specialty, maxDistance ?: 50)
                }
                
                NetworkResult.Success(
                    DoctorSearchResponse(
                        doctors = doctors,
                        totalCount = backendResponse.count,
                        currentPage = 1,
                        totalPages = (backendResponse.count + limit - 1) / limit
                    )
                )
            } else {
                val errorMessage = try {
                    response.errorBody()?.string() ?: "Failed to search doctors"
                } catch (e: Exception) {
                    "Failed to search doctors: ${response.message()}"
                }
                NetworkResult.Error(errorMessage, response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    // Doctor Search - returns raw backend response (for MapFragment to get clinic coordinates)
    suspend fun searchDoctorsRaw(
        specialty: String? = null,
        lat: Double? = null,
        lon: Double? = null,
        visitType: String? = null,
        sortBy: String? = "distance",
        maxDistance: Int? = 50,
        minRating: Double? = 0.0,
        limit: Int = 20
    ): NetworkResult<com.example.healbridge.data.models.BackendDoctorSearchResponse> {
        return try {
            val response = apiService.searchDoctors(specialty, lat, lon, visitType, sortBy, maxDistance, minRating, limit)
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                val errorMessage = try {
                    response.errorBody()?.string() ?: "Failed to search doctors"
                } catch (e: Exception) {
                    "Failed to search doctors: ${response.message()}"
                }
                NetworkResult.Error(errorMessage, response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    // Doctor Availability
    suspend fun getDoctorAvailability(
        doctorId: String,
        clinicId: String,
        date: String
    ): NetworkResult<AvailabilityResponse> {
        return try {
            val response = apiService.getDoctorAvailability(doctorId, clinicId, date)
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Failed to get availability", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    // Get Doctor Slots (wrapper for availability) - requires clinicId with caching
    suspend fun getDoctorSlots(
        doctorId: String, 
        clinicId: String, 
        date: String,
        useCache: Boolean = true
    ): NetworkResult<List<TimeSlot>> {
        // Try cache first if enabled
        if (useCache && cacheManager != null) {
            val cachedSlots = cacheManager.getCachedSlots(doctorId, clinicId, date)
            if (cachedSlots != null) {
                android.util.Log.d("ApiRepository", "Using cached slots: ${cachedSlots.size} for $doctorId/$clinicId on $date")
                return NetworkResult.Success(cachedSlots)
            }
        }
        
        return try {
            android.util.Log.d("ApiRepository", "Fetching slots for doctor=$doctorId, clinic=$clinicId, date=$date")
            val response = apiService.getDoctorAvailability(doctorId, clinicId, date)
            
            if (response.isSuccessful && response.body() != null) {
                val availabilityResponse = response.body()!!
                android.util.Log.d("ApiRepository", "Availability response received:")
                android.util.Log.d("ApiRepository", "  - date: ${availabilityResponse.date}")
                android.util.Log.d("ApiRepository", "  - doctorId: ${availabilityResponse.doctorId}")
                android.util.Log.d("ApiRepository", "  - clinicId: ${availabilityResponse.clinicId}")
                android.util.Log.d("ApiRepository", "  - totalSlots: ${availabilityResponse.totalSlots}")
                android.util.Log.d("ApiRepository", "  - bookedCount: ${availabilityResponse.bookedCount}")
                android.util.Log.d("ApiRepository", "  - availableSlots size: ${availabilityResponse.availableSlots.size}")
                
                // Log first few slots for debugging
                if (availabilityResponse.availableSlots.isNotEmpty()) {
                    availabilityResponse.availableSlots.take(3).forEachIndexed { index, slot ->
                        android.util.Log.d("ApiRepository", "  - slot[$index]: startTs=${slot.startTs}, endTs=${slot.endTs}, available=${slot.available}")
                    }
                } else {
                    android.util.Log.w("ApiRepository", "  - WARNING: availableSlots is empty! This could mean:")
                    android.util.Log.w("ApiRepository", "    1. Doctor has no schedule blocks for this date")
                    android.util.Log.w("ApiRepository", "    2. All slots are booked")
                    android.util.Log.w("ApiRepository", "    3. All slots are in the past")
                    android.util.Log.w("ApiRepository", "    4. Backend returned empty slots array")
                }
                
                // Backend returns availableSlots, map to TimeSlot list
                val slotsList = availabilityResponse.availableSlots 
                    ?: availabilityResponse.slots 
                    ?: emptyList()
                
                android.util.Log.d("ApiRepository", "Processing ${slotsList.size} slots from response")
                
                val slots = slotsList
                    .filter { slotInfo ->
                        // Filter only available slots - check available field (backend uses "available")
                        // The isAvailable field might be default true, so check available first
                        val isAvailable = slotInfo.available
                        
                        android.util.Log.d("ApiRepository", "Checking slot: ${slotInfo.startTs}, available=$isAvailable")
                        
                        // Filter out past slots
                        val slotTime = try {
                            // Handle different date formats from backend
                            val dateStr = slotInfo.startTs
                            val instant = when {
                                // ISO format: "2025-11-09T10:00:00.000Z" or "2025-11-09T10:00:00Z"
                                dateStr.contains("T") -> {
                                    try {
                                        java.time.Instant.parse(dateStr)
                                    } catch (e: Exception) {
                                        // Try with Z appended if missing
                                        try {
                                            java.time.Instant.parse("${dateStr}Z")
                                        } catch (e2: Exception) {
                                            // Try parsing as local datetime
                                            java.time.LocalDateTime.parse(dateStr.substringBefore("."), java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                                                .atZone(java.time.ZoneId.systemDefault())
                                                .toInstant()
                                        }
                                    }
                                }
                                else -> {
                                    // Try to parse as date and convert to instant
                                    java.time.LocalDate.parse(dateStr)
                                        .atStartOfDay(java.time.ZoneId.systemDefault())
                                        .toInstant()
                                }
                            }
                            instant.toEpochMilli()
                        } catch (e: Exception) {
                            android.util.Log.w("ApiRepository", "Failed to parse slot time: ${slotInfo.startTs}", e)
                            // If we can't parse, include it (might be valid, just unusual format)
                            System.currentTimeMillis() + 86400000L // Tomorrow, so it's not filtered out
                        }
                        
                        val now = System.currentTimeMillis()
                        val isPast = slotTime < now
                        
                        if (isPast) {
                            android.util.Log.d("ApiRepository", "Filtering out past slot: ${slotInfo.startTs} (${java.util.Date(slotTime)} < ${java.util.Date(now)})")
                        }
                        
                        if (!isAvailable) {
                            android.util.Log.d("ApiRepository", "Filtering out unavailable slot: ${slotInfo.startTs}")
                        }
                        
                        val shouldInclude = isAvailable && !isPast
                        if (shouldInclude) {
                            android.util.Log.d("ApiRepository", "✅ Including slot: ${slotInfo.startTs}")
                        }
                        
                        shouldInclude
                    }
                    .map { slotInfo ->
                        // Parse ISO datetime string and extract time portion
                        val timeStr = try {
                            val dateStr = slotInfo.startTs
                            when {
                                // ISO format: "2025-11-09T10:00:00.000Z" or "2025-11-09T10:00:00Z"
                                dateStr.contains("T") -> {
                                    // Extract HH:MM from "YYYY-MM-DDTHH:MM:SS" or "YYYY-MM-DDTHH:MM:SS.SSSZ"
                                    val timePart = dateStr.substringAfter("T").substringBefore(".")
                                    if (timePart.length >= 5) {
                                        timePart.substring(0, 5) // HH:MM
                                    } else {
                                        // Fallback: parse and format
                                        val instant = java.time.Instant.parse(dateStr)
                                        val localTime = java.time.ZoneId.systemDefault()
                                            .let { instant.atZone(it).toLocalTime() }
                                        String.format("%02d:%02d", localTime.hour, localTime.minute)
                                    }
                                }
                                else -> {
                                    // Fallback: try to parse as date and format
                                    val instant = java.time.Instant.parse(dateStr)
                                    val localTime = java.time.ZoneId.systemDefault()
                                        .let { instant.atZone(it).toLocalTime() }
                                    String.format("%02d:%02d", localTime.hour, localTime.minute)
                                }
                            }
                        } catch (e: Exception) {
                            android.util.Log.e("ApiRepository", "Error parsing slot time: ${slotInfo.startTs}", e)
                            "00:00" // Fallback
                        }
                        
                    TimeSlot(
                            time = timeStr,
                            isAvailable = true, // Already filtered
                            startTs = slotInfo.startTs,
                            endTs = slotInfo.endTs
                    )
                }
                    .sortedBy { it.time } // Sort by time
                
                android.util.Log.d("ApiRepository", "Processed ${slots.size} available slots")
                
                // Cache the results
                if (cacheManager != null) {
                    cacheManager.cacheSlots(doctorId, clinicId, date, slots)
                }
                
                NetworkResult.Success(slots)
            } else {
                val errorMessage = try {
                    val errorBody = response.errorBody()?.string()
                    android.util.Log.e("ApiRepository", "API error: ${response.code()}, body: $errorBody")
                    errorBody ?: "Failed to get slots (${response.code()})"
                } catch (e: Exception) {
                    "Failed to get slots: ${response.message()}"
                }
                NetworkResult.Error(errorMessage, response.code())
            }
        } catch (e: Exception) {
            android.util.Log.e("ApiRepository", "Exception getting slots", e)
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    // Step 1: Create Slot Hold
    suspend fun createSlotHold(request: SlotHoldRequest): NetworkResult<SlotHoldResponse> {
        return try {
            val response = apiService.createSlotHold(request)
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                val errorMessage = try {
                    response.errorBody()?.string() ?: "Failed to hold slot"
                } catch (e: Exception) {
                    "Failed to hold slot: ${response.message()}"
                }
                NetworkResult.Error(errorMessage, response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    // Step 2: Confirm Appointment
    suspend fun confirmAppointment(request: ConfirmAppointmentRequest): NetworkResult<AppointmentResponse> {
        return try {
            val response = apiService.confirmAppointment(request)
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                val errorMessage = try {
                    response.errorBody()?.string() ?: "Failed to confirm appointment"
                } catch (e: Exception) {
                    "Failed to confirm appointment: ${response.message()}"
                }
                NetworkResult.Error(errorMessage, response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    // Get Appointments
    suspend fun getAppointments(status: String? = null, maxRetries: Int = 2): NetworkResult<AppointmentsResponse> {
        var lastException: Exception? = null
        repeat(maxRetries + 1) { attempt ->
            try {
            val response = apiService.getAppointments(status)
            if (response.isSuccessful && response.body() != null) {
                    return NetworkResult.Success(response.body()!!)
                } else {
                    val errorMsg = response.errorBody()?.string() ?: "Failed to get appointments"
                    return NetworkResult.Error("Failed to load appointments: $errorMsg", response.code())
                }
            } catch (e: java.net.SocketTimeoutException) {
                lastException = e
                if (attempt < maxRetries) {
                    android.util.Log.w("ApiRepository", "Timeout loading appointments, retrying... (attempt ${attempt + 1}/${maxRetries + 1})")
                    kotlinx.coroutines.delay((attempt + 1) * 1000L) // Exponential backoff
                } else {
                    return NetworkResult.Error("Request timed out. The server may be slow. Please check your connection and try again.", 0)
                }
            } catch (e: Exception) {
                lastException = e
                if (attempt < maxRetries && (e.message?.contains("timeout", ignoreCase = true) == true || e is java.net.UnknownHostException)) {
                    android.util.Log.w("ApiRepository", "Network error loading appointments, retrying... (attempt ${attempt + 1}/${maxRetries + 1})")
                    kotlinx.coroutines.delay((attempt + 1) * 1000L)
            } else {
                    val errorMsg = when {
                        e.message?.contains("timeout", ignoreCase = true) == true -> "Request timed out. Please check your connection."
                        e is java.net.UnknownHostException -> "Cannot reach server. Please check your internet connection."
                        else -> e.message ?: "Network error: ${e.javaClass.simpleName}"
                    }
                    return NetworkResult.Error(errorMsg)
                }
            }
        }
        return NetworkResult.Error(lastException?.message ?: "Failed to load appointments after $maxRetries retries")
    }
    
    // Check-in
    suspend fun checkIn(appointmentId: String): NetworkResult<AppointmentResponse> {
        return try {
            val response = apiService.checkIn(appointmentId)
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Failed to check-in", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    // Cancel Appointment
    suspend fun cancelAppointment(appointmentId: String): NetworkResult<AppointmentResponse> {
        return try {
            val response = apiService.cancelAppointment(appointmentId)
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Failed to cancel appointment", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    // Wait Time
    suspend fun getWaitTime(appointmentId: String): NetworkResult<WaitTimeResponse> {
        return try {
            val response = apiService.getWaitTime(appointmentId)
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Failed to get wait time", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    // Profile
    suspend fun getPatientProfile(): NetworkResult<ProfileResponse> {
        return try {
            val response = apiService.getPatientProfile()
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Failed to get profile", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    suspend fun updatePatientProfile(profile: com.example.healbridge.data.models.UpdatePatientProfileRequest): NetworkResult<ProfileResponse> {
        return try {
            val response = apiService.updatePatientProfile(profile)
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                // Parse error response
                val errorBody = response.errorBody()?.string()
                val errorMessage = parseErrorMessage(errorBody, response.code(), "update profile")
                NetworkResult.Error(errorMessage, response.code())
            }
        } catch (e: Exception) {
            android.util.Log.e("ApiRepository", "Error updating patient profile", e)
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    suspend fun createPatientProfile(profile: com.example.healbridge.data.models.CreatePatientProfileRequest): NetworkResult<ProfileResponse> {
        return try {
            val response = apiService.createPatientProfile(profile)
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                // Parse error response
                val errorBody = response.errorBody()?.string()
                val errorMessage = parseErrorMessage(errorBody, response.code(), "create profile")
                NetworkResult.Error(errorMessage, response.code())
            }
        } catch (e: Exception) {
            android.util.Log.e("ApiRepository", "Error creating patient profile", e)
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    private fun parseErrorMessage(errorBody: String?, statusCode: Int, operation: String): String {
        if (errorBody == null) {
            return "Failed to $operation (Status: $statusCode)"
        }
        
        return try {
            val jsonObject = org.json.JSONObject(errorBody)
            val error = jsonObject.optString("error", "")
            val details = jsonObject.optJSONArray("details")
            
            if (details != null && details.length() > 0) {
                // Format validation errors
                val detailMessages = (0 until details.length()).mapNotNull { i ->
                    val detailObj = details.optJSONObject(i)
                    if (detailObj != null) {
                        val field = detailObj.optString("field", "")
                        val message = detailObj.optString("message", "")
                        if (field.isNotEmpty() && message.isNotEmpty()) {
                            "$field: $message"
                        } else null
                    } else null
                }.joinToString(", ")
                
                if (detailMessages.isNotEmpty()) {
                    if (error.isNotEmpty()) "$error: $detailMessages" else detailMessages
                } else {
                    error.ifEmpty { errorBody }
                }
            } else {
                jsonObject.optString("message", error).ifEmpty { errorBody }
            }
        } catch (e: Exception) {
            // If JSON parsing fails, return the raw error body
            errorBody
        }
    }
    
    // Triage with retry logic
    suspend fun analyzeSymptoms(request: TriageRequest, maxRetries: Int = 2): NetworkResult<TriageResponse> {
        var lastException: Exception? = null
        repeat(maxRetries + 1) { attempt ->
            try {
            val response = apiService.analyzeSymptoms(request)
            if (response.isSuccessful && response.body() != null) {
                    return NetworkResult.Success(response.body()!!)
                } else {
                    val errorMsg = response.errorBody()?.string() ?: "Failed to analyze symptoms"
                    return NetworkResult.Error("Failed to analyze symptoms: $errorMsg", response.code())
                }
            } catch (e: java.net.SocketTimeoutException) {
                lastException = e
                if (attempt < maxRetries) {
                    android.util.Log.w("ApiRepository", "Timeout analyzing symptoms, retrying... (attempt ${attempt + 1}/${maxRetries + 1})")
                    kotlinx.coroutines.delay((attempt + 1) * 1000L) // Exponential backoff
                } else {
                    return NetworkResult.Error("Request timed out. The server may be slow. Please try again.", 0)
                }
            } catch (e: Exception) {
                lastException = e
                if (attempt < maxRetries && e.message?.contains("timeout", ignoreCase = true) == true) {
                    android.util.Log.w("ApiRepository", "Network error analyzing symptoms, retrying... (attempt ${attempt + 1}/${maxRetries + 1})")
                    kotlinx.coroutines.delay((attempt + 1) * 1000L)
            } else {
                    return NetworkResult.Error(e.message ?: "Network error: ${e.javaClass.simpleName}")
                }
            }
        }
        return NetworkResult.Error(lastException?.message ?: "Network error after $maxRetries retries")
    }
    
    suspend fun getTriageCategories(): NetworkResult<CategoriesResponse> {
        return try {
            val response = apiService.getTriageCategories()
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Failed to get categories", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    // Prescriptions
    suspend fun getPrescriptions(): NetworkResult<PrescriptionsResponse> {
        return try {
            val response = apiService.getPrescriptions()
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Failed to get prescriptions", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    // Patient Summary
    suspend fun getPatientSummary(): NetworkResult<PatientSummaryResponse> {
        return try {
            val response = apiService.getPatientSummary()
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Failed to get patient summary", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    // Test endpoints for debugging
    suspend fun testAuth(): NetworkResult<Map<String, Any>> {
        return try {
            val response = apiService.testAuth()
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Auth test failed", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    suspend fun testPatientAuth(): NetworkResult<Map<String, Any>> {
        return try {
            val response = apiService.testPatientAuth()
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Patient auth test failed", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    suspend fun testDatabase(): NetworkResult<Map<String, Any>> {
        return try {
            val response = apiService.testDatabase()
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Database test failed", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    suspend fun healthCheck(): NetworkResult<Map<String, Any>> {
        return try {
            val response = apiService.healthCheck()
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Health check failed", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    // OTP Authentication
    suspend fun sendOTP(phone: String, role: String = "PATIENT"): NetworkResult<OTPResponse> {
        return try {
            val request = OTPRequest(phone, role)
            val response = apiService.sendOTP(request)
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                val errorBody = response.errorBody()?.string()
                NetworkResult.Error(errorBody ?: "Failed to send OTP", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    suspend fun verifyOTP(phone: String, otp: String, role: String = "PATIENT"): NetworkResult<LoginResponse> {
        return try {
            val request = VerifyOTPRequest(phone, otp, role)
            val response = apiService.verifyOTP(request)
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                val errorBody = response.errorBody()?.string()
                NetworkResult.Error(errorBody ?: "Invalid OTP", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
}