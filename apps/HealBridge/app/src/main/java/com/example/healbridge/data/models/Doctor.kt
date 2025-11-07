package com.example.healbridge.data.models

data class Doctor(
    val id: String,
    val name: String,
    val specialty: String,
    val email: String,
    val phone: String,
    val experience: Int,
    val rating: Double,
    val profileImage: String?,
    val clinicName: String,
    val clinicAddress: String,
    val consultationFee: Double,
    val isAvailable: Boolean,
    val bio: String?
)

data class DoctorSearchResponse(
    val doctors: List<Doctor>,
    val totalCount: Int,
    val currentPage: Int,
    val totalPages: Int
)