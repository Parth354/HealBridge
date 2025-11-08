package com.example.healbridge.data.models

import com.google.gson.annotations.SerializedName

// Appointment Responses
data class AppointmentResponse(
    val success: Boolean,
    val appointment: AppointmentDetail
)

data class AppointmentsResponse(
    val appointments: List<AppointmentDetail>,
    val count: Int
)

data class AppointmentDetail(
    val id: String,
    @SerializedName("doctor_id") val doctorId: String,
    @SerializedName("clinic_id") val clinicId: String,
    @SerializedName("patient_id") val patientId: String,
    val startTs: String,
    val endTs: String,
    val status: String, // CONFIRMED, STARTED, COMPLETED, CANCELLED, RESCHEDULED
    val visitType: String, // CLINIC, HOUSE
    val address: String?,
    val feeMock: Double,
    val checkedInAt: String?,
    val consultStartedAt: String?,
    val consultEndedAt: String?,
    val doctor: DoctorInfo,
    val clinic: ClinicInfo,
    val prescription: PrescriptionInfo?
)

data class DoctorInfo(
    val id: String,
    val user: UserInfo?,
    val firstName: String? = null,
    val lastName: String? = null,
    val specialty: String? = null,
    val specialties: List<String>? = null,
    val experience: Int?,
    val rating: Double?,
    val consultationFee: Double?
)

data class UserInfo(
    val firstName: String? = null,
    val lastName: String? = null,
    val email: String? = null,
    val phone: String? = null
)

data class ClinicInfo(
    val id: String,
    val name: String,
    val address: String,
    val city: String?,
    val state: String?,
    val pinCode: String?,
    val lat: Double?,
    val lon: Double?
)

data class PrescriptionInfo(
    val id: String,
    val diagnosis: String?,
    val notes: String?
)

// Slot Hold Response
data class SlotHoldResponse(
    val holdId: String,
    val expiresAt: String,
    val expiresInSeconds: Int
)

// Availability Response - matches backend format
data class AvailabilityResponse(
    val date: String,
    val doctorId: String? = null,
    val clinicId: String? = null,
    val totalSlots: Int? = null,
    val availableSlots: List<TimeSlotInfo>, // Backend returns availableSlots
    val bookedCount: Int? = null,
    // Legacy field for backwards compatibility
    val slots: List<TimeSlotInfo>? = null
)

data class TimeSlotInfo(
    val startTs: String,
    val endTs: String,
    val available: Boolean = true, // Backend uses "available" field
    // Legacy field for backwards compatibility
    val isAvailable: Boolean = true
) {
    // Helper to get availability status (supports both field names)
    fun getIsAvailable(): Boolean = isAvailable && available
}

// Wait Time Response
data class WaitTimeResponse(
    val estimatedWaitMinutes: Int,
    val queuePosition: Int,
    val message: String
)

// Profile Response
data class ProfileResponse(
    val success: Boolean,
    val profile: ProfileData?,
    val hasProfile: Boolean? = null,
    val synced: Boolean? = null,
    val message: String? = null
)

data class ProfileData(
    val firstName: String?,
    val lastName: String?,
    val email: String?,
    val phoneNumber: String?,
    val dob: String?,
    val gender: String?,
    val allergies: List<String>? = null,
    val conditions: List<String>? = null,
    val emergencyContactName: String? = null,
    val emergencyContactPhone: String? = null,
    val address: AddressData? = null,
    val language: String? = null,
    val consentDataUse: Boolean? = null,
    val consentNotifications: Boolean? = null
)

data class AddressData(
    val houseNo: String?,
    val locality: String?,
    val city: String?,
    val state: String?,
    val pinCode: String?
)

// Triage Response (updated)
data class CategoriesResponse(
    val categories: List<CategoryInfo>
)

data class CategoryInfo(
    val name: String,
    val symptoms: List<String>
)

// Prescriptions Response
data class PrescriptionsResponse(
    val prescriptions: List<PrescriptionDetail>,
    val count: Int
)

data class PrescriptionDetail(
    val id: String,
    val appointmentId: String,
    val diagnosis: String?,
    val medications: List<MedicationDetail>
)

data class MedicationDetail(
    val name: String,
    val dosage: String,
    val frequency: String,
    val duration: String
)

// Patient Summary Response
data class PatientSummaryResponse(
    val summary: String,
    val lastUpdated: String
)

// OTP Request/Response
data class OTPRequest(
    val phone: String,
    val role: String = "PATIENT"
)

data class OTPResponse(
    val success: Boolean,
    val message: String
)

data class VerifyOTPRequest(
    val phone: String,
    val otp: String,
    val role: String = "PATIENT"
)

data class LoginResponse(
    val token: String,
    val user: LoginUser
)

data class LoginUser(
    val id: String,
    val phone: String?,
    val role: String,
    val verified: Boolean,
    val hasProfile: Boolean
)

// Generic Success Response
data class SuccessResponse(
    val success: Boolean,
    val message: String
)

// Error Response
data class ErrorResponse(
    val error: String,
    val message: String?,
    val details: String?
)

// Schedule Block Response - matches backend format
data class ScheduleBlockResponse(
    val scheduleBlocks: List<ScheduleBlock>,
    val appointments: List<AppointmentDetail>? = null,
    val summary: ScheduleSummary? = null
)

data class ScheduleBlock(
    val id: String,
    @SerializedName("doctor_id") val doctorId: String,
    @SerializedName("clinic_id") val clinicId: String,
    @SerializedName("startTs") val startTs: String, // ISO 8601 format
    @SerializedName("endTs") val endTs: String, // ISO 8601 format
    @SerializedName("slotMinutes") val slotMinutes: Int = 15,
    @SerializedName("bufferMinutes") val bufferMinutes: Int = 0,
    val type: String = "work", // "work", "break", "holiday"
    val clinic: ClinicInfo? = null
)

data class ScheduleSummary(
    @SerializedName("workingBlocks") val workingBlocks: Int = 0,
    val breaks: Int = 0,
    val holidays: Int = 0,
    @SerializedName("totalAppointments") val totalAppointments: Int = 0,
    @SerializedName("confirmedAppointments") val confirmedAppointments: Int = 0
)
