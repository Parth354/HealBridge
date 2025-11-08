package com.example.healbridge.data.models

import com.google.gson.annotations.SerializedName

// Backend doctor search response structure
data class BackendDoctorResponse(
    @SerializedName("doctorId") val doctorId: String,
    @SerializedName("userId") val userId: String,
    @SerializedName("firstName") val firstName: String? = null,
    @SerializedName("lastName") val lastName: String? = null,
    @SerializedName("name") val name: String? = null,
    @SerializedName("specialties") val specialties: List<String>,
    @SerializedName("rating") val rating: Double,
    @SerializedName("avgConsultMin") val avgConsultMin: Int?,
    @SerializedName("clinics") val clinics: List<BackendClinic>,
    @SerializedName("nearestClinic") val nearestClinic: BackendClinic?,
    @SerializedName("nextSlots") val nextSlots: List<BackendSlot>?,
    @SerializedName("nextAvailable") val nextAvailable: String?,
    @SerializedName("distance") val distance: Double?,
    // User info (backend may include user object)
    @SerializedName("user") val user: BackendUserInfo? = null
)

data class BackendUserInfo(
    @SerializedName("id") val id: String?,
    @SerializedName("email") val email: String?,
    @SerializedName("phone") val phone: String?,
    @SerializedName("language") val language: String?
)

data class BackendClinic(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("address") val address: String,
    @SerializedName("lat") val lat: Double,
    @SerializedName("lon") val lon: Double,
    @SerializedName("distance") val distance: Double?,
    @SerializedName("visitTypes") val visitTypes: List<String>?,
    @SerializedName("contactNo") val contactNo: String?
)

data class BackendSlot(
    @SerializedName("startTs") val startTs: String,
    @SerializedName("endTs") val endTs: String
)

// Backend doctor search API response wrapper
data class BackendDoctorSearchResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("doctors") val doctors: List<BackendDoctorResponse>,
    @SerializedName("count") val count: Int,
    @SerializedName("filters") val filters: Map<String, Any>?
)

// Helper function to convert backend response to app Doctor model
fun BackendDoctorResponse.toDoctor(userEmail: String? = null, userPhone: String? = null): Doctor {
    val clinic = nearestClinic ?: clinics.firstOrNull()
    
    // Use name from backend response, with fallbacks
    val doctorName = when {
        !name.isNullOrBlank() -> name
        !firstName.isNullOrBlank() && !lastName.isNullOrBlank() -> "$firstName $lastName".trim()
        !firstName.isNullOrBlank() -> firstName
        !lastName.isNullOrBlank() -> lastName
        !userEmail.isNullOrBlank() -> {
            val emailName = userEmail.substringBefore("@").replace(".", " ").replace("_", " ")
            emailName.split(" ").joinToString(" ") { it.replaceFirstChar { char -> char.uppercaseChar() } }
        }
        else -> "Dr. $userId"
    }
    
    // Ensure name starts with "Dr." if not already
    val finalName = if (doctorName.startsWith("Dr.", ignoreCase = true)) {
        doctorName
    } else {
        "Dr. $doctorName"
    }

    return Doctor(
        id = doctorId,
        name = finalName,
        specialty = specialties.firstOrNull() ?: "General",
        email = user?.email ?: userEmail ?: "",
        phone = user?.phone ?: userPhone ?: "",
        experience = (avgConsultMin ?: 15) / 2, // Rough estimate: divide avg consult time by 2
        rating = rating,
        profileImage = null,
        clinicId = clinic?.id ?: "",
        clinicName = clinic?.name ?: "Unknown Clinic",
        clinicAddress = clinic?.address ?: "",
        consultationFee = 500.0, // Default fee - backend doesn't provide this
        isAvailable = nextAvailable != null,
        bio = "Specializes in ${specialties.joinToString(", ")}"
    )
}

