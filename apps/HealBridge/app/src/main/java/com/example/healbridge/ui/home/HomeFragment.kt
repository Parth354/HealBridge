package com.example.healbridge.ui.home

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.healbridge.databinding.FragmentHomeBinding
import com.example.healbridge.ui.search.DoctorSearchActivity
import com.google.firebase.auth.FirebaseAuth
import java.text.SimpleDateFormat
import java.util.*

class HomeFragment : Fragment() {
    
    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!
    
    private lateinit var viewModel: HomeViewModel
    private lateinit var appointmentsAdapter: HomeAppointmentsAdapter
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        viewModel = ViewModelProvider(this)[HomeViewModel::class.java]
        
        setupUI()
        setupRecyclerView()
        setupClickListeners()
        observeViewModel()
        
        // Load data
        viewModel.loadUserProfile()
        viewModel.loadUpcomingAppointments()
    }
    
    private fun setupUI() {
        // Set greeting based on time
        val calendar = Calendar.getInstance()
        val hour = calendar.get(Calendar.HOUR_OF_DAY)
        val greeting = when (hour) {
            in 0..11 -> "Good Morning"
            in 12..16 -> "Good Afternoon"
            else -> "Good Evening"
        }
        binding.greetingText.text = greeting
        
        // Set user name from Firebase
        val currentUser = FirebaseAuth.getInstance().currentUser
        binding.userNameText.text = currentUser?.displayName ?: "User"
    }
    
    private fun setupRecyclerView() {
        appointmentsAdapter = HomeAppointmentsAdapter { appointment ->
            // Handle appointment click - navigate to appointment details
        }
        
        binding.upcomingAppointmentsRecycler.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = appointmentsAdapter
        }
    }
    
    private fun setupClickListeners() {
        binding.searchContainer.setOnClickListener {
            startActivity(Intent(requireContext(), DoctorSearchActivity::class.java))
        }
        
        binding.bookAppointmentCard.setOnClickListener {
            startActivity(Intent(requireContext(), DoctorSearchActivity::class.java))
        }
        
        binding.emergencyCard.setOnClickListener {
            // Handle emergency - call emergency services or show emergency contacts
            viewModel.handleEmergency()
        }
        
        binding.viewAllAppointments.setOnClickListener {
            // Navigate to appointments tab
            // This would typically use NavController to navigate to appointments fragment
        }
        
        binding.notificationIcon.setOnClickListener {
            // Handle notifications - show notifications screen
        }
    }
    
    private fun observeViewModel() {
        viewModel.userProfile.observe(viewLifecycleOwner) { profile ->
            profile?.let {
                val firstName = it.profile.firstName ?: "User"
                binding.userNameText.text = firstName
            }
        }
        
        viewModel.upcomingAppointments.observe(viewLifecycleOwner) { appointments ->
            appointmentsAdapter.submitList(appointments.map { appointmentDetail ->
                com.example.healbridge.data.models.Appointment(
                    id = appointmentDetail.id,
                    doctorId = appointmentDetail.doctorId,
                    patientId = appointmentDetail.patientId,
                    doctorName = "Dr. ${appointmentDetail.doctor.user.firstName} ${appointmentDetail.doctor.user.lastName}",
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
            
            // Show/hide empty state
            if (appointments.isEmpty()) {
                binding.upcomingAppointmentsRecycler.visibility = View.GONE
                // Could add empty state view here
            } else {
                binding.upcomingAppointmentsRecycler.visibility = View.VISIBLE
            }
        }
        
        viewModel.healthTip.observe(viewLifecycleOwner) { tip ->
            tip?.let {
                binding.healthTipTitle.text = it.title
                binding.healthTipContent.text = it.content
            }
        }
        
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            // Handle loading state - show/hide progress indicators
        }
        
        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                // Show error message to user
            }
        }
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}