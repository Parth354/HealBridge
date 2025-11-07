package com.example.healbridge.data.models

data class Patient(
    val id: String,
    val firebaseUid: String,
    val name: String,
    val email: String,
    val phone: String,
    val dateOfBirth: String?,
    val gender: String?,
    val address: String?,
    val emergencyContact: String?,
    val bloodGroup: String?,
    val allergies: List<String>?,
    val medicalHistory: List<String>?
)

data class Prescription(
    val id: String,
    val appointmentId: String,
    val doctorName: String,
    val prescriptionDate: String,
    val medications: List<Medication>,
    val instructions: String?,
    val followUpDate: String?
)

data class Medication(
    val name: String,
    val dosage: String,
    val frequency: String,
    val duration: String,
    val instructions: String?
)