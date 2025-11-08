package com.example.healbridge

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.inputmethod.InputMethodManager
import androidx.activity.addCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.isVisible
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.example.healbridge.api.ApiClient
import com.example.healbridge.api.ApiRepository
import com.example.healbridge.databinding.ActivityHomeBinding
import com.example.healbridge.services.AppointmentNotificationService
import com.example.healbridge.services.NotificationScheduler
import kotlinx.coroutines.launch

class Home : AppCompatActivity() {
    private lateinit var binding: ActivityHomeBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize ApiClient
        ApiClient.initialize(this)
        
        // Create notification channel for appointment reminders
        AppointmentNotificationService.createNotificationChannel(this)
        
        binding = ActivityHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        // Check authentication
        val token = SecurePreferences.getAuthToken(this)
        val userId = SecurePreferences.getUserId(this)
        if (token == null || userId == null) {
            startActivity(Intent(this, Login::class.java))
            finish()
            return
        }
        
        // Schedule notifications for upcoming appointments
        val apiRepository = ApiRepository(this)
        NotificationScheduler.scheduleAllAppointments(this, apiRepository)
        
        // Check if user has profile
        lifecycleScope.launch {
            try {
                val profileResult = apiRepository.getPatientProfile()
                if (profileResult is com.example.healbridge.data.NetworkResult.Success) {
                        val profile = profileResult.data.profile
                        if (profile == null || profile.firstName.isNullOrEmpty()) {
                            // No profile, navigate to user details
                            val intent = Intent(this@Home, UserDetails::class.java)
                            startActivity(intent)
                            finish()
                            return@launch
                        }
                }
            } catch (e: Exception) {
                // Error checking profile, continue to home
                android.util.Log.e("Home", "Error checking profile", e)
            }
        }

        // Get NavController from NavHostFragment
        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        val navController = navHostFragment.navController

        // Setup BottomNavigationView with NavController
        binding.mainNav.setupWithNavController(navController)

        // Handle deep links
        navController.handleDeepLink(intent)

        // Hide keyboard on touch
        binding.homeRoot.setOnTouchListener { v, _ ->
            currentFocus?.let {
                (getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager)
                    .hideSoftInputFromWindow(it.windowToken, 0)
                it.clearFocus()
            }
            v.performClick()
            false
        }

        // Handle back press
        onBackPressedDispatcher.addCallback(this) {
            if (!navController.popBackStack()) finish()
        }

        // Show/hide bottom navigation based on destination
        navController.addOnDestinationChangedListener { _, dest, _ ->
            binding.mainNav.isVisible = dest.id in setOf(
                R.id.tab_home,
                R.id.tab_appointments,
                R.id.tab_map,
                R.id.tab_records,
                R.id.tab_profile
            )
        }
    }
}