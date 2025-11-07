package com.example.healbridge.data.models

data class Appointment(
    val id: String,
    val doctorId: String,
    val patientId: String,
    val doctorName: String,
    val specialty: String,
    val appointmentDate: String,
    val appointmentTime: String,
    val status: String, // scheduled, confirmed, completed, cancelled
    val consultationFee: Double,
    val clinicName: String,
    val clinicAddress: String,
    val notes: String?
)

data class BookingRequest(
    val doctorId: String,
    val appointmentDate: String,
    val appointmentTime: String,
    val notes: String?
)

data class RescheduleRequest(
    val newDate: String,
    val newTime: String
)

