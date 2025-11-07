package com.example.healbridge.api

import com.example.healbridge.data.NetworkResult
import com.example.healbridge.data.models.*

class ApiRepository {
    private val apiService = ApiClient.apiService
    
    suspend fun searchDoctors(
        specialty: String? = null,
        location: String? = null,
        page: Int = 1
    ): NetworkResult<DoctorSearchResponse> {
        return try {
            val response = apiService.searchDoctors(specialty, location, page)
            if (response.isSuccessful) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Failed to search doctors", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    suspend fun getDoctorById(doctorId: String): NetworkResult<Doctor> {
        return try {
            val response = apiService.getDoctorById(doctorId)
            if (response.isSuccessful) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Failed to get doctor details", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    suspend fun getDoctorSlots(doctorId: String, date: String): NetworkResult<List<TimeSlot>> {
        return try {
            val response = apiService.getDoctorSlots(doctorId, date)
            if (response.isSuccessful) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Failed to get available slots", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    suspend fun bookAppointment(request: BookingRequest): NetworkResult<Appointment> {
        return try {
            val response = apiService.bookAppointment(request)
            if (response.isSuccessful) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Failed to book appointment", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    suspend fun getAppointments(): NetworkResult<List<Appointment>> {
        return try {
            val response = apiService.getAppointments()
            if (response.isSuccessful) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Failed to get appointments", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    suspend fun getPatientProfile(): NetworkResult<Patient> {
        return try {
            val response = apiService.getPatientProfile()
            if (response.isSuccessful) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Failed to get profile", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    suspend fun analyzeSymptoms(request: TriageRequest): NetworkResult<TriageResponse> {
        return try {
            val response = apiService.analyzeSymptoms(request)
            if (response.isSuccessful) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Failed to analyze symptoms", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    suspend fun createSlotHold(request: SlotHoldRequest): NetworkResult<SlotHold> {
        return try {
            val response = apiService.createSlotHold(request)
            if (response.isSuccessful) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Failed to hold slot", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    
    suspend fun confirmBooking(request: BookingConfirmRequest): NetworkResult<BookingConfirmation> {
        return try {
            val response = apiService.confirmBooking(request)
            if (response.isSuccessful) {
                NetworkResult.Success(response.body()!!)
            } else {
                NetworkResult.Error("Failed to confirm booking", response.code())
            }
        } catch (e: Exception) {
            NetworkResult.Error(e.message ?: "Network error")
        }
    }
    

}