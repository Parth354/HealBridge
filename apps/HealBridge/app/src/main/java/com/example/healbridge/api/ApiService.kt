package com.example.healbridge.api

import com.example.healbridge.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    
    // Doctor Search
    @GET("api/patient/doctors/search")
    suspend fun searchDoctors(
        @Query("specialty") specialty: String? = null,
        @Query("lat") lat: Double? = null,
        @Query("lon") lon: Double? = null,
        @Query("visitType") visitType: String? = null,
        @Query("sortBy") sortBy: String? = "distance",
        @Query("maxDistance") maxDistance: Int? = 50,
        @Query("minRating") minRating: Double? = 0.0,
        @Query("limit") limit: Int = 20
    ): Response<DoctorSearchResponse>
    
    // Doctor Availability
    @GET("api/patient/doctors/{doctorId}/clinics/{clinicId}/availability")
    suspend fun getDoctorAvailability(
        @Path("doctorId") doctorId: String,
        @Path("clinicId") clinicId: String,
        @Query("date") date: String
    ): Response<AvailabilityResponse>
    
    // Slot Hold (Step 1: Reserve slot for 2 minutes)
    @POST("api/patient/bookings/hold")
    suspend fun createSlotHold(@Body request: SlotHoldRequest): Response<SlotHoldResponse>
    
    // Confirm Appointment (Step 2: Convert hold to confirmed appointment)
    @POST("api/patient/bookings/confirm")
    suspend fun confirmAppointment(@Body request: ConfirmAppointmentRequest): Response<AppointmentResponse>
    
    // Get Appointments
    @GET("api/patient/appointments")
    suspend fun getAppointments(
        @Query("status") status: String? = null
    ): Response<AppointmentsResponse>
    
    // Check-in
    @POST("api/patient/appointments/{appointmentId}/checkin")
    suspend fun checkIn(@Path("appointmentId") appointmentId: String): Response<AppointmentResponse>
    
    // Cancel Appointment
    @DELETE("api/patient/appointments/{appointmentId}")
    suspend fun cancelAppointment(@Path("appointmentId") appointmentId: String): Response<AppointmentResponse>
    
    // Wait Time
    @GET("api/patient/appointments/{appointmentId}/waittime")
    suspend fun getWaitTime(@Path("appointmentId") appointmentId: String): Response<WaitTimeResponse>
    
    // Patient Profile
    @GET("api/patient/profile")
    suspend fun getPatientProfile(): Response<ProfileResponse>
    
    @PUT("api/patient/profile")
    suspend fun updatePatientProfile(@Body profile: Map<String, Any>): Response<ProfileResponse>
    
    // Triage
    @POST("api/patient/triage/analyze")
    suspend fun analyzeSymptoms(@Body request: TriageRequest): Response<TriageResponse>
    
    @GET("api/patient/triage/categories")
    suspend fun getTriageCategories(): Response<CategoriesResponse>
    
    // Prescriptions
    @GET("api/patient/prescriptions")
    suspend fun getPrescriptions(): Response<PrescriptionsResponse>
    
    // Patient Summary
    @GET("api/patient/summary")
    suspend fun getPatientSummary(): Response<PatientSummaryResponse>
    
    // Firebase authentication
    @POST("api/auth/firebase/login")
    suspend fun registerFirebaseUser(@Body request: Map<String, String>): Response<SuccessResponse>
}