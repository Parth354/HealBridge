package com.example.healbridge.api

import com.example.healbridge.data.NetworkResult
import com.example.healbridge.data.models.*

class ApiRepository {
    private val apiService = ApiClient.apiService
    
    // Doctor Search
    suspend fun searchDoctors(
        specialty: String? = null,
        lat: Double? = null,
        lon: Double? = null,
        visitType: String? = null,
        sortBy: String? = "distance",
        maxDistance: Int? = 50,
        minRating: Double? = 0.0,
        limit: Int = 20
    ): NetworkResult<DoctorSearchResponse> {
        return try {
            val response = apiService.searchDoctors(specialty, lat, lon, visitType, sortBy, maxDistance, minRating, limit)
            if (response.isSuccessful && response.body() != null) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Failed to search doctors", response.code())
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
    
    // Get Doctor Slots (wrapper for availability)
    suspend fun getDoctorSlots(doctorId: String, date: String): NetworkResult<List<TimeSlot>> {
        return try {
            // Use first clinic for now - you may need to get this from doctor data
            val response = apiService.getDoctorAvailability(doctorId, "default", date)
            if (response.isSuccessful && response.body() != null) {
                val slots = response.body()!!.slots.filter { it.isAvailable }.map { slot ->
                    TimeSlot(
                        time = slot.startTs.substring(11, 16), // Extract HH:MM from datetime
                        isAvailable = slot.isAvailable,
                        startTs = slot.startTs,
                        endTs = slot.endTs
                    )
                }
                NetworkResult.Success(slots)
            } else {
                NetworkResult.Error("Failed to get slots", response.code())
            }
        } catch (e: Exception) {
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
                NetworkResult.Error("Failed to hold slot", response.code())
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
                NetworkResult.Error("Failed to confirm appointment", response.code())
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