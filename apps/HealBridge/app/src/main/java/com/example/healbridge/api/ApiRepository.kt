package com.example.healbridge.api

import android.content.Context
import com.example.healbridge.cache.CacheManager
import com.example.healbridge.data.NetworkResult
import com.example.healbridge.data.models.*

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
                    // Use the toDoctor extension function which handles name extraction properly
                    backendDoctor.toDoctor(
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
                        // Filter only available slots - check both available field and isAvailable
                        val isAvailable = slotInfo.available && slotInfo.isAvailable
                        // Also filter out past slots
                        val slotTime = try {
                            // Handle different date formats from backend
                            val dateStr = slotInfo.startTs
                            when {
                                // ISO format: "2025-11-09T10:00:00.000Z" or "2025-11-09T10:00:00Z"
                                dateStr.contains("T") -> {
                                    java.time.Instant.parse(dateStr).toEpochMilli()
                                }
                                // Try parsing as other formats
                                else -> {
                                    // Try to parse as ISO without Z
                                    java.time.LocalDateTime.parse(dateStr, java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                                        .atZone(java.time.ZoneId.systemDefault())
                                        .toInstant()
                                        .toEpochMilli()
                                }
                            }
                        } catch (e: Exception) {
                            android.util.Log.w("ApiRepository", "Failed to parse slot time: ${slotInfo.startTs}", e)
                            Long.MAX_VALUE // Include if we can't parse (shouldn't happen)
                        }
                        val isPast = slotTime < System.currentTimeMillis()
                        
                        if (isPast) {
                            android.util.Log.d("ApiRepository", "Filtering out past slot: ${slotInfo.startTs}")
                        }
                        
                        isAvailable && !isPast
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
    suspend fun getAppointments(status: String? = null): NetworkResult<AppointmentsResponse> {
        return try {
            val response = apiService.getAppointments(status)
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Failed to get appointments", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
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
    
    suspend fun updatePatientProfile(profile: Map<String, Any>): NetworkResult<ProfileResponse> {
        return try {
            val response = apiService.updatePatientProfile(profile)
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Failed to update profile", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    // Triage
    suspend fun analyzeSymptoms(request: TriageRequest): NetworkResult<TriageResponse> {
        return try {
            val response = apiService.analyzeSymptoms(request)
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Failed to analyze symptoms", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
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
}