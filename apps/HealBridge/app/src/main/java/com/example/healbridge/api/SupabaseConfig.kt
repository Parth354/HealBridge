package com.example.healbridge.api

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.storage.Storage
import io.github.jan.supabase.functions.Functions
import io.github.jan.supabase.realtime.Realtime

object SupabaseConfig {
    // TODO: Replace with your Supabase anon key
    // Get it from: Supabase Dashboard > Project Settings > API > anon/public key
    const val SUPABASE_URL = "https://pyzgxwziudcssoxtinxz.supabase.co"
    const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5emd4d3ppdWRjc3NveHRpbnh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTE1NjcsImV4cCI6MjA3ODA2NzU2N30.bY4Vk1CNLOoJkUYQen51tUvSA74y-Dumi4nn8GS1drc" // Replace this!
    
    // Edge functions base URL (keep for upload and patient-summary)
    const val SUPABASE_FUNCTIONS_URL = "$SUPABASE_URL/functions/v1"
    
    // PostgREST API URL for direct database queries
    const val POSTGREST_URL = "$SUPABASE_URL/rest/v1"
    
    val client: SupabaseClient by lazy {
        try {
            createSupabaseClient(
                supabaseUrl = SUPABASE_URL,
                supabaseKey = SUPABASE_ANON_KEY
            ) {
                install(Postgrest)
                install(Storage)
                install(Functions)
                install(Realtime)
            }
        } catch (e: Exception) {
            android.util.Log.e("SupabaseConfig", "Error creating Supabase client", e)
            // Return a minimal client or handle error appropriately
            throw e
        }
    }
}


