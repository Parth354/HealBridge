package com.example.healbridge

import android.content.Context

fun getAuthToken(context: Context): String? {
    return SecurePreferences.getAuthToken(context)
}

fun saveAuthToken(context: Context, token: String) {
    SecurePreferences.saveAuthToken(context, token)
}

fun clearAuthToken(context: Context) {
    SecurePreferences.clearAuthToken(context)
}

