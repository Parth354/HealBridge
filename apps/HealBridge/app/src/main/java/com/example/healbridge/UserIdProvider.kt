package com.example.healbridge

interface UserIdProvider {
    fun currentUserId(): String?
}
