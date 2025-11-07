package com.example.healbridge.api

import com.example.healbridge.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    
    // Doctor endpoints
    @GET("api/doctors/search")
    suspend fun searchDoctors(
        @Query("specialty") specialty: String? = null,
        @Query("location") location: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 10
    ): Response<DoctorSearchResponse>
    
    @GET("api/doctors/{id}")
    suspend fun getDoctorById(@Path("id") doctorId: String): Response<Doctor>
    
    @GET("api/doctors/{id}/slots")
    suspend fun getDoctorSlots(
        @Path("id") doctorId: String,
        @Query("date") date: String
    ): Response<List<TimeSlot>>
    
    // Appointment endpoints
    @POST("api/appointments")
    suspend fun bookAppointment(@Body request: BookingRequest): Response<Appointment>
    
    @GET("api/appointments")
    suspend fun getAppointments(): Response<List<Appointment>>
    
    @GET("api/appointments/{id}")
    suspend fun getAppointmentById(@Path("id") appointmentId: String): Response<Appointment>
    
    @PUT("api/appointments/{id}/reschedule")
    suspend fun rescheduleAppointment(
        @Path("id") appointmentId: String,
        @Body request: RescheduleRequest
    ): Response<Appointment>
    
    @DELETE("api/appointments/{id}")
    suspend fun cancelAppointment(@Path("id") appointmentId: String): Response<Unit>
    
    // Patient endpoints
    @GET("api/patients/profile")
    suspend fun getPatientProfile(): Response<Patient>
    
    @PUT("api/patients/profile")
    suspend fun updatePatientProfile(@Body patient: Patient): Response<Patient>
    
    // Prescription endpoints
    @GET("api/prescriptions")
    suspend fun getPrescriptions(): Response<List<Prescription>>
    
    @GET("api/prescriptions/{id}")
    suspend fun getPrescriptionById(@Path("id") prescriptionId: String): Response<Prescription>
    
    // Triage endpoints
    @POST("api/triage/analyze")
    suspend fun analyzeSymptoms(@Body request: TriageRequest): Response<TriageResponse>
    
    @GET("api/triage/categories")
    suspend fun getTriageCategories(): Response<List<SymptomCategory>>
    
    // Booking endpoints
    @POST("api/booking/hold")
    suspend fun createSlotHold(@Body request: SlotHoldRequest): Response<SlotHold>
    
    @POST("api/booking/confirm")
    suspend fun confirmBooking(@Body request: BookingConfirmRequest): Response<BookingConfirmation>
}