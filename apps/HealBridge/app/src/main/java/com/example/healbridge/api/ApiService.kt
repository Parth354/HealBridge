package com.example.healbridge.api

import com.example.healbridge.data.models.*
import com.example.healbridge.data.models.OTPRequest
import com.example.healbridge.data.models.OTPResponse
import com.example.healbridge.data.models.VerifyOTPRequest
import com.example.healbridge.data.models.LoginResponse
import com.example.healbridge.data.models.CreatePatientProfileRequest
import com.example.healbridge.data.models.UpdatePatientProfileRequest
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    
    // Health check
    @GET("health")
    suspend fun healthCheck(): Response<Map<String, Any>>
    
    // Doctor Search - returns backend format
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
    ): Response<com.example.healbridge.data.models.BackendDoctorSearchResponse>
    
    // Doctor Availability
    @GET("api/patient/doctors/{doctorId}/clinics/{clinicId}/availability")
    suspend fun getDoctorAvailability(
        @Path("doctorId") doctorId: String,
        @Path("clinicId") clinicId: String,
        @Query("date") date: String
    ): Response<AvailabilityResponse>
    
    // Get Doctor Schedule Blocks (for displaying doctor's schedule)
    @GET("api/patient/doctors/{doctorId}/schedule")
    suspend fun getDoctorSchedule(
        @Path("doctorId") doctorId: String,
        @Query("startDate") startDate: String,
        @Query("endDate") endDate: String
    ): Response<ScheduleBlockResponse>
    
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
    suspend fun updatePatientProfile(@Body profile: UpdatePatientProfileRequest): Response<ProfileResponse>
    
    // Create Patient Profile (via auth routes)
    @POST("api/auth/patient/profile")
    suspend fun createPatientProfile(@Body profile: CreatePatientProfileRequest): Response<ProfileResponse>
    
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
    
    // OTP Authentication
    @POST("api/auth/otp/send")
    suspend fun sendOTP(@Body request: OTPRequest): Response<OTPResponse>
    
    @POST("api/auth/otp/verify")
    suspend fun verifyOTP(@Body request: VerifyOTPRequest): Response<LoginResponse>
    
    // Test endpoints
    @GET("api/test/auth")
    suspend fun testAuth(): Response<Map<String, Any>>
    
    @GET("api/test/db")
    suspend fun testDatabase(): Response<Map<String, Any>>
    
    @GET("api/patient/test/auth")
    suspend fun testPatientAuth(): Response<Map<String, Any>>
}