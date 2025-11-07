package com.example.healbridge.ui.booking

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.net.Uri
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.viewpager2.adapter.FragmentStateAdapter
import com.example.healbridge.databinding.ActivityAppointmentBookingBinding
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices

class AppointmentBookingActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityAppointmentBookingBinding
    private lateinit var viewModel: BookingViewModel
    private lateinit var pagerAdapter: BookingPagerAdapter
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    
    private val locationPermissionRequest = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        when {
            permissions.getOrDefault(Manifest.permission.ACCESS_FINE_LOCATION, false) -> {
                getCurrentLocation()
            }
            permissions.getOrDefault(Manifest.permission.ACCESS_COARSE_LOCATION, false) -> {
                getCurrentLocation()
            }
            else -> {
                // Location permission denied
            }
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAppointmentBookingBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        viewModel = ViewModelProvider(this)[BookingViewModel::class.java]
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        
        setupToolbar()
        setupViewPager()
        setupObservers()
        setupClickListeners()
        requestLocationPermission()
    }
    
    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            onBackPressedDispatcher.onBackPressed()
        }
    }
    
    private fun setupViewPager() {
        pagerAdapter = BookingPagerAdapter(this)
        binding.viewPager.adapter = pagerAdapter
        binding.viewPager.isUserInputEnabled = false
    }
    
    private fun setupObservers() {
        viewModel.currentStep.observe(this) { step ->
            binding.viewPager.currentItem = step
            updateNavigationButtons(step)
            updateProgressIndicator(step)
        }
        
        viewModel.isLoading.observe(this) { isLoading ->
            binding.progressBar.visibility = if (isLoading) 
                android.view.View.VISIBLE else android.view.View.GONE
        }
        
        viewModel.canProceed.observe(this) { canProceed ->
            binding.nextButton.isEnabled = canProceed
        }
        
        viewModel.bookingConfirmation.observe(this) { confirmation ->
            confirmation?.let {
                showBookingSuccess(it.appointment.id)
            }
        }
        
        viewModel.error.observe(this) { error ->
            error?.let {
                showError(it)
            }
        }
    }
    
    private fun setupClickListeners() {
        binding.previousButton.setOnClickListener {
            viewModel.previousStep()
        }
        
        binding.nextButton.setOnClickListener {
            viewModel.nextStep()
        }
    }
    
    private fun requestLocationPermission() {
        when {
            ContextCompat.checkSelfPermission(
                this, Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED -> {
                getCurrentLocation()
            }
            else -> {
                locationPermissionRequest.launch(arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                ))
            }
        }
    }
    
    private fun getCurrentLocation() {
        if (ContextCompat.checkSelfPermission(
                this, Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED) {
            
            fusedLocationClient.lastLocation.addOnSuccessListener { location: Location? ->
                location?.let {
                    viewModel.updateLocation(it.latitude, it.longitude)
                }
            }
        }
    }
    
    private fun updateNavigationButtons(step: Int) {
        binding.previousButton.visibility = if (step > 0) 
            android.view.View.VISIBLE else android.view.View.GONE
            
        binding.nextButton.text = when (step) {
            0 -> "Analyze Symptoms"
            1 -> "Select Doctor"
            2 -> "Choose Time"
            3 -> "Confirm Booking"
            else -> "Next"
        }
    }
    
    private fun updateProgressIndicator(step: Int) {
        val progress = ((step + 1) * 100) / 4
        binding.progressIndicator.progress = progress
        
        binding.stepIndicator.text = "Step ${step + 1} of 4"
    }
    
    private fun showBookingSuccess(appointmentId: String) {
        // Show success dialog with appointment details and link
        val appointmentLink = "https://healbridge.app/appointment/$appointmentId"
        
        // Option to share appointment link
        val shareIntent = Intent().apply {
            action = Intent.ACTION_SEND
            putExtra(Intent.EXTRA_TEXT, "Your appointment is confirmed! Link: $appointmentLink")
            type = "text/plain"
        }
        
        // Option to open appointment link
        val openIntent = Intent(Intent.ACTION_VIEW, Uri.parse(appointmentLink))
        
        // Show options to user
    }
    
    private fun showError(message: String) {
        // Show error snackbar or dialog
    }
    
    private class BookingPagerAdapter(activity: AppointmentBookingActivity) : FragmentStateAdapter(activity) {
        override fun getItemCount(): Int = 4
        
        override fun createFragment(position: Int): Fragment {
            return when (position) {
                0 -> TriageFragment()
                1 -> DoctorSelectionFragment()
                2 -> TimeSlotFragment()
                3 -> BookingConfirmationFragment()
                else -> TriageFragment()
            }
        }
    }
}