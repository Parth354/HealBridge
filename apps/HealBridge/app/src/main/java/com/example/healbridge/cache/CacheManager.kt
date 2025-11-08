package com.example.healbridge.cache

import android.content.Context
import android.content.SharedPreferences
import com.example.healbridge.data.models.Doctor
import com.example.healbridge.data.models.TimeSlot
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

/**
 * Cache manager for storing API responses locally
 * Uses SharedPreferences for simple key-value storage with TTL
 */
class CacheManager(private val context: Context) {
    
    private val prefs: SharedPreferences = context.getSharedPreferences(
        "healbridge_cache",
        Context.MODE_PRIVATE
    )
    
    private val gson = Gson()
    
    companion object {
        // Cache TTLs
        private const val DOCTOR_SEARCH_TTL_MINUTES = 30L // 30 minutes
        private const val SLOT_AVAILABILITY_TTL_MINUTES = 5L // 5 minutes (slots change frequently)
        private const val DOCTOR_DETAILS_TTL_HOURS = 24L // 24 hours
        
        // Cache keys
        private const val KEY_DOCTOR_SEARCH_PREFIX = "doctor_search_"
        private const val KEY_SLOTS_PREFIX = "slots_"
        private const val KEY_TIMESTAMP_SUFFIX = "_timestamp"
        
        // Helper to create cache key
        private fun getDoctorSearchKey(lat: Double?, lon: Double?, specialty: String?, maxDistance: Int): String {
            return "${KEY_DOCTOR_SEARCH_PREFIX}${lat}_${lon}_${specialty}_${maxDistance}"
        }
        
        private fun getSlotsKey(doctorId: String, clinicId: String, date: String): String {
            return "${KEY_SLOTS_PREFIX}${doctorId}_${clinicId}_${date}"
        }
    }
    
    /**
     * Cache doctor search results
     */
    suspend fun cacheDoctors(
        doctors: List<Doctor>,
        lat: Double?,
        lon: Double?,
        specialty: String?,
        maxDistance: Int
    ) = withContext(Dispatchers.IO) {
        val key = getDoctorSearchKey(lat, lon, specialty, maxDistance)
        val json = gson.toJson(doctors)
        val timestamp = System.currentTimeMillis()
        
        prefs.edit()
            .putString(key, json)
            .putLong("${key}${KEY_TIMESTAMP_SUFFIX}", timestamp)
            .apply()
        
        android.util.Log.d("CacheManager", "Cached ${doctors.size} doctors with key: $key")
    }
    
    /**
     * Get cached doctor search results
     */
    suspend fun getCachedDoctors(
        lat: Double?,
        lon: Double?,
        specialty: String?,
        maxDistance: Int
    ): List<Doctor>? = withContext(Dispatchers.IO) {
        val key = getDoctorSearchKey(lat, lon, specialty, maxDistance)
        val json = prefs.getString(key, null) ?: return@withContext null
        val timestamp = prefs.getLong("${key}${KEY_TIMESTAMP_SUFFIX}", 0)
        
        // Check if cache is expired
        val cacheAgeMinutes = TimeUnit.MILLISECONDS.toMinutes(System.currentTimeMillis() - timestamp)
        if (cacheAgeMinutes > DOCTOR_SEARCH_TTL_MINUTES) {
            android.util.Log.d("CacheManager", "Cache expired for key: $key (age: $cacheAgeMinutes minutes)")
            clearCache(key)
            return@withContext null
        }
        
        try {
            val type = object : TypeToken<List<Doctor>>() {}.type
            val doctors = gson.fromJson<List<Doctor>>(json, type)
            android.util.Log.d("CacheManager", "Retrieved ${doctors.size} doctors from cache")
            doctors
        } catch (e: Exception) {
            android.util.Log.e("CacheManager", "Error parsing cached doctors", e)
            clearCache(key)
            null
        }
    }
    
    /**
     * Cache time slots for a doctor-clinic-date
     */
    suspend fun cacheSlots(
        doctorId: String,
        clinicId: String,
        date: String,
        slots: List<TimeSlot>
    ) = withContext(Dispatchers.IO) {
        val key = getSlotsKey(doctorId, clinicId, date)
        val json = gson.toJson(slots)
        val timestamp = System.currentTimeMillis()
        
        prefs.edit()
            .putString(key, json)
            .putLong("${key}${KEY_TIMESTAMP_SUFFIX}", timestamp)
            .apply()
        
        android.util.Log.d("CacheManager", "Cached ${slots.size} slots for $doctorId/$clinicId on $date")
    }
    
    /**
     * Get cached time slots
     */
    suspend fun getCachedSlots(
        doctorId: String,
        clinicId: String,
        date: String
    ): List<TimeSlot>? = withContext(Dispatchers.IO) {
        val key = getSlotsKey(doctorId, clinicId, date)
        val json = prefs.getString(key, null) ?: return@withContext null
        val timestamp = prefs.getLong("${key}${KEY_TIMESTAMP_SUFFIX}", 0)
        
        // Check if cache is expired
        val cacheAgeMinutes = TimeUnit.MILLISECONDS.toMinutes(System.currentTimeMillis() - timestamp)
        if (cacheAgeMinutes > SLOT_AVAILABILITY_TTL_MINUTES) {
            android.util.Log.d("CacheManager", "Cache expired for slots: $key (age: $cacheAgeMinutes minutes)")
            clearCache(key)
            return@withContext null
        }
        
        try {
            val type = object : TypeToken<List<TimeSlot>>() {}.type
            val slots = gson.fromJson<List<TimeSlot>>(json, type)
            android.util.Log.d("CacheManager", "Retrieved ${slots.size} slots from cache")
            slots
        } catch (e: Exception) {
            android.util.Log.e("CacheManager", "Error parsing cached slots", e)
            clearCache(key)
            null
        }
    }
    
    /**
     * Clear cache for a specific key
     */
    private fun clearCache(key: String) {
        prefs.edit()
            .remove(key)
            .remove("${key}${KEY_TIMESTAMP_SUFFIX}")
            .apply()
    }
    
    /**
     * Clear all cache
     */
    fun clearAllCache() {
        prefs.edit().clear().apply()
        android.util.Log.d("CacheManager", "Cleared all cache")
    }
    
    /**
     * Clear expired cache entries
     */
    fun clearExpiredCache() {
        val editor = prefs.edit()
        val allEntries = prefs.all
        
        val now = System.currentTimeMillis()
        var clearedCount = 0
        
        allEntries.forEach { (key, _) ->
            if (key.endsWith(KEY_TIMESTAMP_SUFFIX)) {
                val timestamp = prefs.getLong(key, 0)
                val cacheKey = key.removeSuffix(KEY_TIMESTAMP_SUFFIX)
                
                // Determine TTL based on key prefix
                val ttlMinutes = when {
                    cacheKey.startsWith(KEY_DOCTOR_SEARCH_PREFIX) -> DOCTOR_SEARCH_TTL_MINUTES
                    cacheKey.startsWith(KEY_SLOTS_PREFIX) -> SLOT_AVAILABILITY_TTL_MINUTES
                    else -> return@forEach
                }
                
                val cacheAgeMinutes = TimeUnit.MILLISECONDS.toMinutes(now - timestamp)
                if (cacheAgeMinutes > ttlMinutes) {
                    editor.remove(cacheKey)
                    editor.remove(key)
                    clearedCount++
                }
            }
        }
        
        editor.apply()
        if (clearedCount > 0) {
            android.util.Log.d("CacheManager", "Cleared $clearedCount expired cache entries")
        }
    }
}

