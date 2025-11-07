package com.example.healbridge

data class PatientProfile(
    val uid: String,
    val firstName: String,
    val lastName: String,
    val phoneNumber: String,
    val dob: String?,
    val gender: String?,
    val allergies: List<String>,
    val conditions: List<String>,
    val emergencyContactName: String?,
    val emergencyContactPhone: String?,
    val address: Address?,
    val language: String?,
    val consentDataUse: Boolean,
    val consentNotifications: Boolean,
    val fcmToken: String?,
    val updatedAt: Long
)
