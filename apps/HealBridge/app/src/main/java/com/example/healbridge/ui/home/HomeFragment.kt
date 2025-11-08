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
import com.example.healbridge.SecurePreferences
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import java.text.SimpleDateFormat
import java.util.*

class HomeFragment : Fragment() {
    
    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!
    
    private lateinit var viewModel: HomeViewModel
    private lateinit var appointmentsAdapter: HomeAppointmentsAdapter
    private val firestore = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()
    
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
        viewModel.loadUpcomingAppointments()
    }
    
    override fun onResume() {
        super.onResume()
        // Refresh user name when fragment resumes (in case profile was updated)
        loadUserNameFromFirebase()
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
        
        // Load user name from Firebase Firestore
        loadUserNameFromFirebase()
    }
    
    private fun loadUserNameFromFirebase() {
        val uid = SecurePreferences.getUserId(requireContext()) ?: auth.currentUser?.uid
        if (uid != null) {
            binding.userNameText.text = "Loading..."
            
            firestore.collection("users").document(uid).get()
                .addOnSuccessListener { document ->
                    if (_binding != null) {
                        if (document.exists()) {
                            val firstName = document.getString("firstName") ?: ""
                            val lastName = document.getString("lastName") ?: ""
                            val fullName = "$firstName $lastName".trim()
                            
                            // Use firstName if available, otherwise use fullName, otherwise fallback
                            binding.userNameText.text = when {
                                firstName.isNotEmpty() -> firstName
                                fullName.isNotEmpty() -> fullName
                                else -> "User"
                            }
                        } else {
                            // User document doesn't exist, try to get from Firebase Auth
                            val currentUser = auth.currentUser
                            binding.userNameText.text = currentUser?.displayName ?: "User"
                        }
                    }
                }
                .addOnFailureListener { exception ->
                    android.util.Log.e("HomeFragment", "Failed to load user name: ${exception.message}")
                    if (_binding != null) {
                        // Fallback to Firebase Auth displayName
                        val currentUser = auth.currentUser
                        binding.userNameText.text = currentUser?.displayName ?: "User"
                    }
                }
        } else {
            binding.userNameText.text = "User"
        }
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
        // User profile is now loaded directly from Firestore in setupUI()
        // No need to observe viewModel.userProfile anymore
        
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