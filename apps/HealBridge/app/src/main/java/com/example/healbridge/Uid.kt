package com.example.healbridge

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

object SecurePreferences {
    private const val PREFS_FILE_NAME = "secure_prefs"
    private const val KEY_USER_ID = "USER_ID"
    private const val KEY_AUTH_TOKEN = "AUTH_TOKEN"

    private fun getEncryptedSharedPreferences(context: Context): EncryptedSharedPreferences {
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)

        return EncryptedSharedPreferences.create(
            PREFS_FILE_NAME,
            masterKeyAlias,
            context,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        ) as EncryptedSharedPreferences
    }

    fun saveUserId(context: Context, userId: String) {
        try {
            val prefs = getEncryptedSharedPreferences(context)
            prefs.edit().putString(KEY_USER_ID, userId).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    fun clearUserId(context: Context) {
        try {
            val prefs = getEncryptedSharedPreferences(context)
            prefs.edit().remove(KEY_USER_ID).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun getUserId(context: Context): String? {
        return try {
            val prefs = getEncryptedSharedPreferences(context)
            prefs.getString(KEY_USER_ID, null)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
    
    fun saveAuthToken(context: Context, token: String) {
        try {
            val prefs = getEncryptedSharedPreferences(context)
            prefs.edit().putString(KEY_AUTH_TOKEN, token).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    fun getAuthToken(context: Context): String? {
        return try {
            val prefs = getEncryptedSharedPreferences(context)
            prefs.getString(KEY_AUTH_TOKEN, null)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
    
    fun clearAuthToken(context: Context) {
        try {
            val prefs = getEncryptedSharedPreferences(context)
            prefs.edit().remove(KEY_AUTH_TOKEN).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    fun clearAll(context: Context) {
        try {
            val prefs = getEncryptedSharedPreferences(context)
            prefs.edit().clear().apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}