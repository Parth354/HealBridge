package com.example.healbridge.ui.booking

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.ViewModelProvider
import androidx.viewpager2.adapter.FragmentStateAdapter
import com.example.healbridge.databinding.ActivityBookAppointmentBinding

class BookAppointmentActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityBookAppointmentBinding
    private lateinit var viewModel: BookingViewModel
    private lateinit var pagerAdapter: BookingPagerAdapter
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityBookAppointmentBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        viewModel = ViewModelProvider(this)[BookingViewModel::class.java]
        
        // Handle intent extras if coming from map
        handleIntentExtras()
        
        setupToolbar()
        setupViewPager()
        setupObservers()
        setupClickListeners()
    }
    
    private fun handleIntentExtras() {
        val doctorId = intent.getStringExtra("doctor_id")
        val doctorName = intent.getStringExtra("doctor_name")
        val doctorSpecialty = intent.getStringExtra("doctor_specialty")
        val clinicId = intent.getStringExtra("clinic_id")
        val clinicName = intent.getStringExtra("clinic_name")
        
        if (doctorId != null) {
            // Create a Doctor object from intent extras
            val doctor = com.example.healbridge.data.models.Doctor(
                id = doctorId,
                name = doctorName ?: "Dr. Unknown",
                specialty = doctorSpecialty ?: "General",
                email = "",
                phone = "",
                experience = 0,
                rating = 0.0,
                profileImage = null,
                clinicId = clinicId ?: "",
                clinicName = clinicName ?: "Unknown Clinic",
                clinicAddress = "",
                consultationFee = 500.0,
                isAvailable = true,
                bio = ""
            )
            
            // Select the doctor and skip to time slot selection
            viewModel.selectDoctor(doctor)
            viewModel.nextStep() // Go to doctor selection step (will show selected)
            viewModel.nextStep() // Skip to time slot selection
        }
    }
    
    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            onBackPressed()
        }
    }
    
    private fun setupViewPager() {
        pagerAdapter = BookingPagerAdapter(this)
        binding.viewPager.adapter = pagerAdapter
        binding.viewPager.isUserInputEnabled = false // Disable swipe
    }
    
    private fun setupObservers() {
        viewModel.currentStep.observe(this) { step ->
            binding.viewPager.currentItem = step
            updateNavigationButtons(step)
        }
        
        viewModel.isLoading.observe(this) { isLoading ->
            binding.progressBar.visibility = if (isLoading) 
                android.view.View.VISIBLE else android.view.View.GONE
        }
        
        viewModel.canProceed.observe(this) { canProceed ->
            binding.nextButton.isEnabled = canProceed
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
    
    private class BookingPagerAdapter(activity: FragmentActivity) : FragmentStateAdapter(activity) {
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