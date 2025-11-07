package com.example.healbridge.ui.records

data class MedicalRecord(
    val id: String,
    val title: String,
    val type: String, // "Lab Report", "Imaging", "Medication", "Prescription"
    val date: String,
    val description: String,
    val fileUrl: String? = null,
    val thumbnailUrl: String? = null,
    val extractedText: String? = null
)