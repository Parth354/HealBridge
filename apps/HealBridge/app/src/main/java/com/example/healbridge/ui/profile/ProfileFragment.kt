package com.example.healbridge.ui.profile

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.example.healbridge.Login
import com.example.healbridge.UserDetails
import com.example.healbridge.clearAll
import com.example.healbridge.databinding.FragmentProfileBinding
import com.example.healbridge.getUserId
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.launch

class ProfileFragment : Fragment() {
    private var _binding: FragmentProfileBinding? = null
    private val binding get() = _binding!!
    private lateinit var firestore: FirebaseFirestore
    private lateinit var auth: FirebaseAuth

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        firestore = FirebaseFirestore.getInstance()
        auth = FirebaseAuth.getInstance()
        
        loadUserProfile()
        setupClickListeners()
    }
    
    private fun setupClickListeners() {
        binding.btnEditProfile.setOnClickListener {
            startActivity(Intent(requireContext(), UserDetails::class.java))
        }
        
        binding.btnMedicalInfo.setOnClickListener {
            showMedicalInfo()
        }
        
        binding.btnSettings.setOnClickListener {
            showSettings()
        }
        
        binding.btnLogout.setOnClickListener {
            showLogoutConfirmation()
        }
    }
    
    private fun loadUserProfile() {
        val uid = getUserId(requireContext())
        if (uid != null) {
            firestore.collection("users").document(uid).get()
                .addOnSuccessListener { document ->
                    if (document.exists()) {
                        val firstName = document.getString("firstName") ?: ""
                        val lastName = document.getString("lastName") ?: ""
                        val fullName = "$firstName $lastName".trim()
                        
                        binding.tvName.text = if (fullName.isNotEmpty()) fullName else "Name not set"
                        binding.tvPhone.text = document.getString("phoneNumber") ?: "Phone not set"
                    } else {
                        binding.tvName.text = "Complete your profile"
                        binding.tvPhone.text = "Add your details"
                    }
                }
                .addOnFailureListener {
                    binding.tvName.text = "Error loading profile"
                    binding.tvPhone.text = "Please try again"
                }
        }
    }
    
    override fun onResume() {
        super.onResume()
        loadUserProfile() // Refresh profile data when returning from edit
    }
    
    private fun showMedicalInfo() {
        androidx.appcompat.app.AlertDialog.Builder(requireContext())
            .setTitle("Medical Information")
            .setMessage("View and manage your medical conditions, allergies, and emergency contacts.")
            .setPositiveButton("OK", null)
            .show()
    }
    
    private fun showSettings() {
        androidx.appcompat.app.AlertDialog.Builder(requireContext())
            .setTitle("Settings")
            .setMessage("Notification preferences, privacy settings, and app preferences.")
            .setPositiveButton("OK", null)
            .show()
    }
    
    private fun showLogoutConfirmation() {
        androidx.appcompat.app.AlertDialog.Builder(requireContext())
            .setTitle("Logout")
            .setMessage("Are you sure you want to logout?")
            .setPositiveButton("Logout") { _, _ -> logout() }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun logout() {
        auth.signOut()
        lifecycleScope.launch {
            clearAll(requireContext())
        }
        startActivity(Intent(requireContext(), Login::class.java))
        requireActivity().finish()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
