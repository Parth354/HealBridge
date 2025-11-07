package com.example.healbridge.api

import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import okhttp3.Interceptor
import okhttp3.Response

class TokenInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val token = runBlocking {
            try {
                FirebaseAuth.getInstance().currentUser?.getIdToken(false)?.await()?.token
            } catch (e: Exception) {
                null
            }
        }
        
        val newRequest = if (token != null) {
            request.newBuilder()
                .addHeader("Authorization", "Bearer $token")
                .build()
        } else {
            request
        }
        
        val response = chain.proceed(newRequest)
        
        // Handle 401 "User not found" for Firebase users
        if (response.code == 401 && token != null) {
            val responseBody = response.peekBody(2048).string()
            if (responseBody.contains("User not found") && responseBody.contains("Firebase")) {
                // Try to register Firebase user in backend
                runBlocking {
                    try {
                        val firebaseAuthService = FirebaseAuthService()
                        firebaseAuthService.registerFirebaseUserInBackend()
                    } catch (e: Exception) {
                        // Registration failed, continue with original response
                    }
                }
            }
        }
        
        return response
    }
}