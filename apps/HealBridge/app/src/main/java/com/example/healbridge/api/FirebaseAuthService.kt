package com.example.healbridge.api

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import kotlinx.coroutines.tasks.await

class FirebaseAuthService {
    
    private val auth = FirebaseAuth.getInstance()
    private val apiService = ApiClient.apiService
    
    suspend fun registerFirebaseUserInBackend(): Boolean {
        return try {
            val currentUser = auth.currentUser ?: return false
            val token = currentUser.getIdToken(false).await().token ?: return false
            
            val response = apiService.registerFirebaseUser(
                mapOf(
                    "firebaseToken" to token,
                    "role" to "PATIENT"
                )
            )
            
            response.isSuccessful
        } catch (e: Exception) {
            false
        }
    }
    
    suspend fun getCurrentFirebaseToken(): String? {
        return try {
            val currentUser = auth.currentUser ?: return null
            currentUser.getIdToken(false).await().token
        } catch (e: Exception) {
            null
        }
    }
}