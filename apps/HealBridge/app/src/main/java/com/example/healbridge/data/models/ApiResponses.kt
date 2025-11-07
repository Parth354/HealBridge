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
    val user: UserInfo,
    val specialty: String,
    val experience: Int?,
    val rating: Double?,
    val consultationFee: Double?
)

data class UserInfo(
    val firstName: String,
    val lastName: String,
    val email: String?,
    val phone: String?
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

// Availability Response
data class AvailabilityResponse(
    val date: String,
    val slots: List<TimeSlotInfo>
)

data class TimeSlotInfo(
    val startTs: String,
    val endTs: String,
    val isAvailable: Boolean
)

// Wait Time Response
data class WaitTimeResponse(
    val estimatedWaitMinutes: Int,
    val queuePosition: Int,
    val message: String
)

// Profile Response
data class ProfileResponse(
    val success: Boolean,
    val profile: ProfileData,
    val synced: Boolean
)

data class ProfileData(
    val uid: String,
    val firstName: String?,
    val lastName: String?,
    val phoneNumber: String?,
    val dob: String?,
    val gender: String?,
    val address: AddressData?,
    val language: String?,
    val consentDataUse: Boolean?,
    val consentNotifications: Boolean?
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
