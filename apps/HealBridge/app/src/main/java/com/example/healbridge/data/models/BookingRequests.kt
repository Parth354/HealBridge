package com.example.healbridge.data.models

data class SlotHoldRequest(
    val doctorId: String,
    val clinicId: String,
    val startTs: String,
    val endTs: String
)

data class ConfirmAppointmentRequest(
    val holdId: String,
    val visitType: String = "CLINIC", // CLINIC, HOUSE, TELE
    val address: String? = null,
    val feeMock: Double = 500.0
)

data class BookingConfirmRequest(
    val holdId: String,
    val visitType: String, // CLINIC, HOUSE
    val address: String? = null,
    val feeMock: Double? = null,
    val symptoms: String? = null,
    val notes: String? = null
)