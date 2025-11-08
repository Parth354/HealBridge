package com.example.healbridge.ui.home

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.healbridge.R
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
        // Set greeting to Welcome Back
        binding.greetingText.text = "Welcome Back"
        
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
                            // Capitalize first letter properly
                            val displayName = when {
                                firstName.isNotEmpty() -> firstName.replaceFirstChar { 
                                    if (it.isLowerCase()) it.titlecase() else it.toString() 
                                }
                                fullName.isNotEmpty() -> fullName.replaceFirstChar { 
                                    if (it.isLowerCase()) it.titlecase() else it.toString() 
                                }
                                else -> "User"
                            }
                            binding.userNameText.text = displayName
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
            // Navigate to doctor search activity which will search from backend
            startActivity(Intent(requireContext(), DoctorSearchActivity::class.java))
        }
        
        binding.bookAppointmentCard.setOnClickListener {
            startActivity(Intent(requireContext(), DoctorSearchActivity::class.java))
        }
        
        binding.emergencyCard.setOnClickListener {
            // Call ambulance - dial emergency number
            callAmbulance()
        }
        
        binding.viewAllAppointments.setOnClickListener {
            // Navigate to appointments fragment using NavController
            try {
                findNavController().navigate(R.id.tab_appointments)
            } catch (e: Exception) {
                android.util.Log.e("HomeFragment", "Error navigating to appointments: ${e.message}")
            }
        }
        
        
        binding.notificationIcon.setOnClickListener {
            // Handle notifications - show notifications screen
            // TODO: Implement notifications screen
        }
    }
    
    private fun callAmbulance() {
        // Determine emergency number based on region (108 for India, 911 for US/others)
        // For now, using 108 (India emergency number)
        val emergencyNumber = "108" // Can be made configurable based on user location
        
        val intent = Intent(Intent.ACTION_DIAL).apply {
            data = Uri.parse("tel:$emergencyNumber")
        }
        
        try {
            startActivity(intent)
        } catch (e: Exception) {
            android.util.Log.e("HomeFragment", "Error calling ambulance: ${e.message}")
            // Show error message to user
            android.widget.Toast.makeText(
                requireContext(),
                "Unable to make emergency call. Please dial $emergencyNumber manually.",
                android.widget.Toast.LENGTH_LONG
            ).show()
        }
    }
    
    private fun observeViewModel() {
        // User profile is now loaded directly from Firestore in setupUI()
        // No need to observe viewModel.userProfile anymore
        
        viewModel.upcomingAppointments.observe(viewLifecycleOwner) { appointments ->
            appointmentsAdapter.submitList(appointments.map { appointmentDetail ->
                // Get doctor name from Doctor model (firstName/lastName) or fallback to "Doctor"
                val doctorFirstName = appointmentDetail.doctor.firstName?.takeIf { it.isNotBlank() } ?: ""
                val doctorLastName = appointmentDetail.doctor.lastName?.takeIf { it.isNotBlank() } ?: ""
                val doctorName = when {
                    doctorFirstName.isNotEmpty() && doctorLastName.isNotEmpty() -> "Dr. $doctorFirstName $doctorLastName"
                    doctorFirstName.isNotEmpty() -> "Dr. $doctorFirstName"
                    doctorLastName.isNotEmpty() -> "Dr. $doctorLastName"
                    else -> "Dr. ${appointmentDetail.doctor.user?.email?.split("@")?.get(0) ?: "Unknown"}"
                }
                
                com.example.healbridge.data.models.Appointment(
                    id = appointmentDetail.id,
                    doctorId = appointmentDetail.doctorId,
                    patientId = appointmentDetail.patientId,
                    doctorName = doctorName,
                    specialty = appointmentDetail.doctor.specialties?.firstOrNull() ?: "General",
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