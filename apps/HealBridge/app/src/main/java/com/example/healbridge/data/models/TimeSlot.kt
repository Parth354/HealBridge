package com.example.healbridge.data.models

data class TimeSlot(
    val time: String, // "10:00"
    val isAvailable: Boolean,
    val startTs: String, // Full datetime string
    val endTs: String    // Full datetime string
)

data class SlotHold(
    val holdId: String,
    val expiresAt: String,
    val expiresInSeconds: Int
)

data class BookingConfirmation(
    val success: Boolean,
    val appointment: AppointmentDetail
)