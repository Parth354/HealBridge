package com.example.healbridge.data.models

data class TriageRequest(
    val symptoms: String,
    val severity: String? = null,
    val duration: String? = null
)

data class TriageResponse(
    val specialty: String,
    val urgency: String, // IMMEDIATE, SCHEDULED, HOUSE_VISIT
    val confidence: String, // HIGH, LOW
    val suggestedCondition: String,
    val recommendations: List<String>
)

data class SymptomCategory(
    val id: String,
    val name: String,
    val description: String,
    val icon: String,
    val color: String
)

data class SlotHold(
    val holdId: String,
    val expiresAt: String,
    val expiresInSeconds: Int
)

data class BookingConfirmation(
    val appointment: Appointment,
    val message: String
)