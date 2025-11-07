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
import com.example.healbridge.api.ApiRepository
import com.example.healbridge.data.NetworkResult
import com.example.healbridge.databinding.FragmentAppointmentsBinding
import com.example.healbridge.ui.search.DoctorSearchActivity
import kotlinx.coroutines.launch

class AppointmentsFragment : Fragment() {
    private var _binding: FragmentAppointmentsBinding? = null
    private val binding get() = _binding!!
    private lateinit var apiRepository: ApiRepository
    private lateinit var appointmentsAdapter: AppointmentsAdapter
    private val appointments = mutableListOf<com.example.healbridge.data.models.Appointment>()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentAppointmentsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        apiRepository = ApiRepository()
        setupTabs()
        setupFAB()
        loadAppointments()
    }
    
    private fun setupTabs() {
        // Setup tab layout with ViewPager2 for Upcoming/Past appointments
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText("Upcoming"))
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText("Past"))
    }
    
    private fun setupFAB() {
        binding.fabBookAppointment.setOnClickListener {
            startActivity(Intent(requireContext(), DoctorSearchActivity::class.java))
        }
    }
    
    private fun loadAppointments() {
        if (_binding != null) {
            lifecycleScope.launch {
                try {
                    when (val result = apiRepository.getAppointments()) {
                        is NetworkResult.Success -> {
                            if (_binding != null) {
                                appointments.clear()
                                appointments.addAll(result.data)
                                updateUI()
                            }
                        }
                        is NetworkResult.Error -> {
                            if (_binding != null) {
                                Toast.makeText(context, "Error loading appointments: ${result.message}", Toast.LENGTH_SHORT).show()
                                showSampleAppointments()
                            }
                        }
                        is NetworkResult.Loading -> {}
                    }
                } catch (e: Exception) {
                    if (_binding != null) {
                        showSampleAppointments()
                    }
                }
            }
        }
    }
    
    private fun updateUI() {
        if (_binding != null) {
            val upcomingCount = appointments.size
            binding.tvAppointmentsCount.text = "$upcomingCount upcoming appointments"
        }
    }
    
    private fun showSampleAppointments() {
        if (_binding != null) {
            binding.tvAppointmentsCount.text = "No appointments yet"
            Toast.makeText(context, "Book your first appointment!", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
