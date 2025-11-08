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
import com.google.android.material.tabs.TabLayout
import com.google.android.material.tabs.TabLayoutMediator
import kotlinx.coroutines.launch

class AppointmentsFragment : Fragment() {
    private var _binding: FragmentAppointmentsBinding? = null
    private val binding get() = _binding!!
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
        if (_binding != null) {
            // Show loading indicator
            binding.viewPager.visibility = View.GONE
            binding.emptyState.visibility = View.GONE
            
            lifecycleScope.launch {
                try {
                    when (val result = apiRepository.getAppointments()) {
                        is NetworkResult.Success -> {
                            if (_binding != null) {
                                appointments.clear()
                                appointments.addAll(result.data.appointments)
                                updateUI()
                            }
                        }
                        is NetworkResult.Error -> {
                            if (_binding != null && isAdded && context != null) {
                                // Show user-friendly error message
                                val errorMessage = when {
                                    result.message.contains("timeout", ignoreCase = true) -> 
                                        "Server is taking too long to respond. Please try again."
                                    result.message.contains("connection", ignoreCase = true) -> 
                                        "Cannot connect to server. Please check your internet connection."
                                    else -> "Unable to load appointments. ${result.message}"
                                }
                                
                                // Show error in empty state
                                showEmptyStateWithError(errorMessage)
                                
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
                    if (_binding != null && isAdded && context != null) {
                        showEmptyStateWithError("An unexpected error occurred. Please try again.")
                        Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }
    }
    
    private fun showEmptyStateWithError(errorMessage: String) {
        if (_binding != null) {
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
        if (_binding != null) {
            val upcomingCount = appointments.count { 
                it.status == "CONFIRMED" || it.status == "PENDING" 
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
        if (_binding != null) {
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
        if (_binding != null) {
            binding.emptyState.visibility = View.GONE
            binding.viewPager.visibility = View.VISIBLE
        }
    }
    
    fun onBookAppointmentClick(view: View) {
        startActivity(Intent(requireContext(), DoctorSearchActivity::class.java))
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
        lifecycleScope.launch {
            when (val result = apiRepository.getAppointments()) {
                is NetworkResult.Success -> {
                    val upcoming = result.data.appointments.filter { 
                        it.status == "CONFIRMED" || it.status == "PENDING" 
                    }
                    adapter.updateAppointments(upcoming.map { appointmentDetail ->
                        com.example.healbridge.data.models.Appointment(
                            id = appointmentDetail.id,
                            doctorId = appointmentDetail.doctorId,
                            patientId = appointmentDetail.patientId,
                            doctorName = appointmentDetail.doctor.user.firstName + " " + appointmentDetail.doctor.user.lastName,
                            specialty = appointmentDetail.doctor.specialty ?: "General",
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
        lifecycleScope.launch {
            when (val result = apiRepository.getAppointments()) {
                is NetworkResult.Success -> {
                    val past = result.data.appointments.filter { 
                        it.status == "COMPLETED" || it.status == "CANCELLED" 
                    }
                    adapter.updateAppointments(past.map { appointmentDetail ->
                        com.example.healbridge.data.models.Appointment(
                            id = appointmentDetail.id,
                            doctorId = appointmentDetail.doctorId,
                            patientId = appointmentDetail.patientId,
                            doctorName = appointmentDetail.doctor.user.firstName + " " + appointmentDetail.doctor.user.lastName,
                            specialty = appointmentDetail.doctor.specialty ?: "General",
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
                }
            }
        }
    }
}
