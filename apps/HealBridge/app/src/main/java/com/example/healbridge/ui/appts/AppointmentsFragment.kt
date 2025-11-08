package com.example.healbridge.ui.appts

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.viewpager2.adapter.FragmentStateAdapter
import androidx.viewpager2.widget.ViewPager2
import com.example.healbridge.api.ApiRepository
import com.example.healbridge.data.NetworkResult
import com.example.healbridge.databinding.FragmentAppointmentsBinding
import com.example.healbridge.ui.search.DoctorSearchActivity
import com.example.healbridge.services.NotificationScheduler
import com.google.android.material.tabs.TabLayout
import com.google.android.material.tabs.TabLayoutMediator
import kotlinx.coroutines.launch

class AppointmentsFragment : Fragment() {
    private var _binding: FragmentAppointmentsBinding? = null
    private val binding get() = _binding ?: throw IllegalStateException("Binding is null. Fragment view may have been destroyed.")
    private lateinit var apiRepository: ApiRepository
    private val appointments = mutableListOf<com.example.healbridge.data.models.AppointmentDetail>()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentAppointmentsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        apiRepository = ApiRepository(requireContext())
        setupTabs()
        setupFAB()
        loadAppointments()
        
        // Schedule notifications when appointments are loaded
        NotificationScheduler.scheduleAllAppointments(requireContext(), apiRepository)
    }
    
    private fun setupTabs() {
        // Create ViewPager2 adapter
        val adapter = AppointmentsPagerAdapter(this)
        binding.viewPager.adapter = adapter
        
        // Connect TabLayout with ViewPager2
        TabLayoutMediator(binding.tabLayout, binding.viewPager) { tab, position ->
            tab.text = when (position) {
                0 -> "Upcoming"
                1 -> "Past"
                else -> "Upcoming"
            }
        }.attach()
    }
    
    private fun setupFAB() {
        binding.fabBookAppointment.setOnClickListener {
            startActivity(Intent(requireContext(), DoctorSearchActivity::class.java))
        }
    }
    
    
    private fun loadAppointments() {
        val binding = _binding ?: return
        // Show loading indicator
        binding.viewPager.visibility = View.GONE
        binding.emptyState.visibility = View.GONE
        
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                when (val result = apiRepository.getAppointments()) {
                    is NetworkResult.Success -> {
                        _binding?.let {
                            appointments.clear()
                            appointments.addAll(result.data.appointments)
                            updateUI()
                        }
                    }
                    is NetworkResult.Error -> {
                        if (isAdded && context != null) {
                            // Show user-friendly error message
                            val errorMessage = when {
                                result.message.contains("timeout", ignoreCase = true) -> 
                                    "Server is taking too long to respond. Please try again."
                                result.message.contains("connection", ignoreCase = true) -> 
                                    "Cannot connect to server. Please check your internet connection."
                                else -> "Unable to load appointments. ${result.message}"
                            }
                            
                            // Show error in empty state
                            _binding?.let { showEmptyStateWithError(errorMessage) }
                            
                            // Also show toast for immediate feedback
                            Toast.makeText(context, errorMessage, Toast.LENGTH_LONG).show()
                        }
                    }
                    is NetworkResult.Loading -> {
                        // Loading state handled by visibility changes
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("AppointmentsFragment", "Error loading appointments", e)
                if (isAdded && context != null) {
                    _binding?.let { showEmptyStateWithError("An unexpected error occurred. Please try again.") }
                    Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    
    private fun showEmptyStateWithError(errorMessage: String) {
        _binding?.let { binding ->
            binding.emptyState.visibility = View.VISIBLE
            binding.viewPager.visibility = View.GONE
            
            // Update empty state message to show error
            val emptyStateTitle = binding.emptyState.findViewById<android.widget.TextView>(
                com.example.healbridge.R.id.emptyStateTitle
            )
            val emptyStateMessage = binding.emptyState.findViewById<android.widget.TextView>(
                com.example.healbridge.R.id.emptyStateMessage
            )
            
            emptyStateTitle?.text = "Unable to Load Appointments"
            emptyStateMessage?.text = errorMessage
        }
    }
    
    private fun updateUI() {
        _binding?.let { binding ->
            // Count upcoming appointments based on date/time, not just status
            val upcomingCount = appointments.count { appointmentDetail ->
                !isAppointmentPast(appointmentDetail.startTs)
            }
            
            binding.tvAppointmentsCount.text = when {
                upcomingCount == 0 -> "No upcoming appointments"
                upcomingCount == 1 -> "1 upcoming appointment"
                else -> "$upcomingCount upcoming appointments"
            }
            
            // Show/hide empty state
            if (appointments.isEmpty()) {
                showEmptyState()
            } else {
                hideEmptyState()
            }
        }
    }
    
    private fun showEmptyState() {
        _binding?.let { binding ->
            binding.emptyState.visibility = View.VISIBLE
            binding.viewPager.visibility = View.GONE
            
            // Reset empty state to default message
            val emptyStateTitle = binding.emptyState.findViewById<android.widget.TextView>(
                com.example.healbridge.R.id.emptyStateTitle
            )
            val emptyStateMessage = binding.emptyState.findViewById<android.widget.TextView>(
                com.example.healbridge.R.id.emptyStateMessage
            )
            
            emptyStateTitle?.text = "No Appointments"
            emptyStateMessage?.text = "You don't have any appointments yet.\nBook your first appointment now!"
        }
    }
    
    private fun hideEmptyState() {
        _binding?.let { binding ->
            binding.emptyState.visibility = View.GONE
            binding.viewPager.visibility = View.VISIBLE
        }
    }
    

    override fun onResume() {
        super.onResume()
        // Refresh appointments when fragment resumes
        loadAppointments()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
    
    // ViewPager2 adapter for appointments tabs
    private class AppointmentsPagerAdapter(fragment: Fragment) : FragmentStateAdapter(fragment) {
        override fun getItemCount(): Int = 2
        
        override fun createFragment(position: Int): Fragment {
            return when (position) {
                0 -> UpcomingAppointmentsFragment()
                1 -> PastAppointmentsFragment()
                else -> UpcomingAppointmentsFragment()
            }
        }
    }
}

// Helper function to get doctor name with proper fallbacks - shared by both fragments
private fun getDoctorName(appointmentDetail: com.example.healbridge.data.models.AppointmentDetail): String {
    // Try 1: Doctor model firstName/lastName (check for non-null, non-blank, not empty string, not "null")
    val doctorFirstName = appointmentDetail.doctor.firstName
        ?.takeIf { it.isNotBlank() && it.trim().lowercase() != "null" && it.trim() != "" }
    val doctorLastName = appointmentDetail.doctor.lastName
        ?.takeIf { it.isNotBlank() && it.trim().lowercase() != "null" && it.trim() != "" }
    
    // Debug logging (remove in production)
    android.util.Log.d("AppointmentsFragment", "Doctor firstName: '$doctorFirstName', lastName: '$doctorLastName'")
    android.util.Log.d("AppointmentsFragment", "Doctor user: ${appointmentDetail.doctor.user?.email}")
    
    if (doctorFirstName != null && doctorLastName != null) {
        return "Dr. $doctorFirstName $doctorLastName"
    }
    if (doctorFirstName != null) {
        return "Dr. $doctorFirstName"
    }
    if (doctorLastName != null) {
        return "Dr. $doctorLastName"
    }
    
    // Try 2: User model firstName/lastName (these shouldn't exist but check anyway)
    val user = appointmentDetail.doctor.user
    if (user != null) {
        val userFirstName = user.firstName?.takeIf { 
            it.isNotBlank() && it.trim().lowercase() != "null" && it.trim() != "" 
        }
        val userLastName = user.lastName?.takeIf { 
            it.isNotBlank() && it.trim().lowercase() != "null" && it.trim() != "" 
        }
        
        if (userFirstName != null && userLastName != null) {
            return "Dr. $userFirstName $userLastName"
        }
        if (userFirstName != null) {
            return "Dr. $userFirstName"
        }
        if (userLastName != null) {
            return "Dr. $userLastName"
        }
        
        // Try 3: Extract name from email (most reliable fallback)
        val email = user.email?.takeIf { it.isNotBlank() }
        if (email != null && email.contains("@")) {
            val emailName = email.substringBefore("@")
                .replace(".", " ")
                .replace("_", " ")
                .replace("-", " ")
                .split(" ")
                .filter { it.isNotBlank() }
                .joinToString(" ") { it.replaceFirstChar { char -> char.uppercaseChar() } }
            if (emailName.isNotBlank()) {
                return "Dr. $emailName"
            }
        }
        
        // Try 4: Use phone number last 4 digits if available
        val phone = user.phone?.takeIf { it.isNotBlank() && it.length >= 4 }
        if (phone != null) {
            return "Dr. ${phone.takeLast(4)}"
        }
    }
    
    // Final fallback - use doctor ID last 6 characters or specialty
    val specialty = appointmentDetail.doctor.specialties?.firstOrNull() 
        ?: appointmentDetail.doctor.specialty
    return if (specialty != null && specialty.isNotBlank()) {
        "Dr. $specialty"
    } else {
        "Dr. ${appointmentDetail.doctor.id.takeLast(6)}"
    }
}

// Helper function to check if appointment is in the past based on date/time
private fun isAppointmentPast(startTs: String): Boolean {
    return try {
        // Handle various ISO 8601 formats:
        // "2024-01-15T10:30:00Z"
        // "2024-01-15T10:30:00.000Z"
        // "2024-01-15T10:30:00+00:00"
        // "2024-01-15T10:30:00"
        val normalizedTs = startTs.trim()
        val appointmentDateTime = when {
            // Standard ISO 8601 with Z
            normalizedTs.endsWith("Z") -> java.time.Instant.parse(normalizedTs)
            // ISO 8601 with timezone offset
            normalizedTs.contains("+") || normalizedTs.matches(Regex(".*-\\d{2}:\\d{2}$")) -> 
                java.time.Instant.parse(normalizedTs)
            // Local datetime without timezone - assume UTC
            normalizedTs.contains("T") -> {
                val localDateTime = java.time.LocalDateTime.parse(normalizedTs.substring(0, 19))
                localDateTime.atZone(java.time.ZoneId.systemDefault()).toInstant()
            }
            // Just date - assume start of day in system timezone
            else -> {
                val date = java.time.LocalDate.parse(normalizedTs.substring(0, 10))
                date.atStartOfDay(java.time.ZoneId.systemDefault()).toInstant()
            }
        }
        val currentDateTime = java.time.Instant.now()
        appointmentDateTime.isBefore(currentDateTime)
    } catch (e: Exception) {
        android.util.Log.e("AppointmentsFragment", "Error parsing appointment date: $startTs", e)
        // If parsing fails, try a simpler approach with date comparison
        try {
            // Fallback: Compare date strings (YYYY-MM-DD)
            if (startTs.length >= 10) {
                val appointmentDate = startTs.substring(0, 10)
                val currentDate = java.time.LocalDate.now().toString()
                appointmentDate < currentDate
            } else {
                false
            }
        } catch (e2: Exception) {
            android.util.Log.e("AppointmentsFragment", "Error in fallback date comparison", e2)
            // If all parsing fails, assume it's not in the past to be safe
            false
        }
    }
}

// Upcoming Appointments Fragment
class UpcomingAppointmentsFragment : Fragment() {
    private lateinit var apiRepository: ApiRepository
    private lateinit var adapter: AppointmentsAdapter
    
    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        val recyclerView = androidx.recyclerview.widget.RecyclerView(requireContext()).apply {
            layoutManager = LinearLayoutManager(requireContext())
        }
        
        adapter = AppointmentsAdapter(emptyList()) { appointment ->
            // Handle appointment click - navigate to appointment details
            android.util.Log.d("UpcomingAppointmentsFragment", "Appointment clicked: ${appointment.id}")
        }
        recyclerView.adapter = adapter
        
        apiRepository = ApiRepository(requireContext())
        loadAppointments()
        
        return recyclerView
    }
    
    private fun loadAppointments() {
        viewLifecycleOwner.lifecycleScope.launch {
            when (val result = apiRepository.getAppointments()) {
                is NetworkResult.Success -> {
                    // Filter appointments that are in the future (not in the past)
                    val upcoming = result.data.appointments.filter { appointmentDetail ->
                        !isAppointmentPast(appointmentDetail.startTs)
                    }
                    adapter.updateAppointments(upcoming.map { appointmentDetail ->
                        // Get doctor name - try multiple sources with proper null/empty handling
                        val doctorName = getDoctorName(appointmentDetail)
                        
                        com.example.healbridge.data.models.Appointment(
                            id = appointmentDetail.id,
                            doctorId = appointmentDetail.doctorId,
                            patientId = appointmentDetail.patientId,
                            doctorName = doctorName,
                            specialty = appointmentDetail.doctor.specialties?.firstOrNull() ?: appointmentDetail.doctor.specialty ?: "General",
                            appointmentDate = appointmentDetail.startTs.substring(0, 10),
                            appointmentTime = appointmentDetail.startTs.substring(11, 16),
                            status = appointmentDetail.status,
                            consultationFee = appointmentDetail.feeMock,
                            clinicName = appointmentDetail.clinic.name,
                            clinicAddress = appointmentDetail.clinic.address,
                            notes = null
                        )
                    })
                }
                else -> {
                    // Handle error
                    android.util.Log.e("UpcomingAppointmentsFragment", "Failed to load appointments")
                }
            }
        }
    }
}

// Past Appointments Fragment
class PastAppointmentsFragment : Fragment() {
    private lateinit var apiRepository: ApiRepository
    private lateinit var adapter: AppointmentsAdapter
    
    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        val recyclerView = androidx.recyclerview.widget.RecyclerView(requireContext()).apply {
            layoutManager = LinearLayoutManager(requireContext())
        }
        
        adapter = AppointmentsAdapter(emptyList()) { appointment ->
            // Handle appointment click
            android.util.Log.d("PastAppointmentsFragment", "Appointment clicked: ${appointment.id}")
        }
        recyclerView.adapter = adapter
        
        apiRepository = ApiRepository(requireContext())
        loadAppointments()
        
        return recyclerView
    }
    
    private fun loadAppointments() {
        viewLifecycleOwner.lifecycleScope.launch {
            when (val result = apiRepository.getAppointments()) {
                is NetworkResult.Success -> {
                    // Filter appointments that are in the past based on date/time
                    val past = result.data.appointments.filter { appointmentDetail ->
                        isAppointmentPast(appointmentDetail.startTs)
                    }
                    adapter.updateAppointments(past.map { appointmentDetail ->
                        // Get doctor name - try multiple sources with proper null/empty handling
                        val doctorName = getDoctorName(appointmentDetail)
                        
                        com.example.healbridge.data.models.Appointment(
                            id = appointmentDetail.id,
                            doctorId = appointmentDetail.doctorId,
                            patientId = appointmentDetail.patientId,
                            doctorName = doctorName,
                            specialty = appointmentDetail.doctor.specialties?.firstOrNull() ?: appointmentDetail.doctor.specialty ?: "General",
                            appointmentDate = appointmentDetail.startTs.substring(0, 10),
                            appointmentTime = appointmentDetail.startTs.substring(11, 16),
                            status = appointmentDetail.status,
                            consultationFee = appointmentDetail.feeMock,
                            clinicName = appointmentDetail.clinic.name,
                            clinicAddress = appointmentDetail.clinic.address,
                            notes = null
                        )
                    })
                }
                else -> {
                    // Handle error
                    android.util.Log.e("PastAppointmentsFragment", "Failed to load appointments")
                }
            }
        }
    }
}
