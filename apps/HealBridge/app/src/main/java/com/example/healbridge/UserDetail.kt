package com.example.healbridge

import android.Manifest
import android.app.DatePickerDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Address
import android.location.Geocoder
import android.location.Location
import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.example.healbridge.api.ApiClient
import com.example.healbridge.api.ApiRepository
import com.example.healbridge.data.NetworkResult
import com.example.healbridge.databinding.ActivityUserDetailsBinding
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.launch
import java.util.*

class UserDetails : AppCompatActivity() {
    private lateinit var binding: ActivityUserDetailsBinding
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var apiRepository: ApiRepository
    
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
                Toast.makeText(this, "Location permission denied", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityUserDetailsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Initialize ApiClient
        ApiClient.initialize(this)
        
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        apiRepository = ApiRepository(this)
        
        // Check authentication
        val token = SecurePreferences.getAuthToken(this)
        if (token == null) {
            startActivity(Intent(this, Login::class.java))
            finish()
            return
        }
        
        loadExistingUserData()
        setupDropdowns()
        setupClickListeners()
    }
    
    private fun loadExistingUserData() {
        lifecycleScope.launch {
            try {
                val result = apiRepository.getPatientProfile()
                when (result) {
                    is NetworkResult.Success -> {
                        val profile = result.data.profile
                        if (profile != null) {
                            populateFields(profile)
                        }
                    }
                    is NetworkResult.Error -> {
                        // Continue with empty form if data loading fails
                        android.util.Log.e("UserDetails", "Error loading profile: ${result.message}")
                    }
                    is NetworkResult.Loading -> {
                        // Show loading state if needed
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("UserDetails", "Error loading profile", e)
            }
        }
    }
    
    private fun populateFields(profile: com.example.healbridge.data.models.ProfileData) {
        binding.etFirstName.setText(profile.firstName ?: "")
        binding.etLastName.setText(profile.lastName ?: "")
        binding.etPhone.setText(profile.phoneNumber ?: "")
        binding.etDob.setText(profile.dob ?: "")
        binding.etGender.setText(profile.gender ?: "")
        binding.etLanguage.setText(profile.language ?: "")
        
        // Handle address
        profile.address?.let { addr ->
            binding.etHouse.setText(addr.houseNo ?: "")
            binding.etLocality.setText(addr.locality ?: "")
            binding.etCity.setText(addr.city ?: "")
            binding.etState.setText(addr.state ?: "")
            binding.etPin.setText(addr.pinCode ?: "")
        }
        
        // Handle consent checkboxes
        binding.cbConsentData.isChecked = profile.consentDataUse ?: false
        binding.cbConsentNotif.isChecked = profile.consentNotifications ?: false
    }
    
    private fun setupDropdowns() {
        // Gender dropdown
        val genderOptions = arrayOf("Male", "Female", "Other", "Prefer not to say")
        val genderAdapter = ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, genderOptions)
        binding.etGender.setAdapter(genderAdapter)
        
        // Language dropdown
        val languageOptions = arrayOf("English", "Hindi", "Bengali", "Telugu", "Marathi", "Tamil", "Gujarati", "Urdu", "Kannada", "Malayalam", "Punjabi", "Odia")
        val languageAdapter = ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, languageOptions)
        binding.etLanguage.setAdapter(languageAdapter)
    }
    
    private fun setupClickListeners() {
        // Date picker for DOB
        binding.etDob.setOnClickListener {
            showDatePicker()
        }
        
        // Location detection
        binding.btnDetectLocation.setOnClickListener {
            checkLocationPermission()
        }
        
        binding.btnSave.setOnClickListener {
            saveUserData()
        }
    }
    
    private fun checkLocationPermission() {
        when {
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED -> {
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
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            return
        }
        
        binding.btnDetectLocation.text = "Detecting..."
        binding.btnDetectLocation.isEnabled = false
        
        fusedLocationClient.lastLocation.addOnSuccessListener { location: Location? ->
            location?.let {
                getAddressFromLocation(it.latitude, it.longitude)
            } ?: run {
                Toast.makeText(this, "Unable to get current location", Toast.LENGTH_SHORT).show()
                resetLocationButton()
            }
        }.addOnFailureListener {
            Toast.makeText(this, "Failed to get location", Toast.LENGTH_SHORT).show()
            resetLocationButton()
        }
    }
    
    private fun getAddressFromLocation(latitude: Double, longitude: Double) {
        try {
            val geocoder = Geocoder(this, Locale.getDefault())
            val addresses: List<Address>? = geocoder.getFromLocation(latitude, longitude, 1)
            
            if (!addresses.isNullOrEmpty()) {
                val address = addresses[0]
                
                // Fill address fields
                binding.etCity.setText(address.locality ?: address.subAdminArea ?: "")
                binding.etState.setText(address.adminArea ?: "")
                binding.etPin.setText(address.postalCode ?: "")
                
                // Try to fill locality from more detailed address components
                val locality = address.subLocality ?: address.thoroughfare ?: address.featureName
                binding.etLocality.setText(locality ?: "")
                
                Toast.makeText(this, "Location detected successfully", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, "Unable to get address from location", Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            Toast.makeText(this, "Error getting address: ${e.message}", Toast.LENGTH_SHORT).show()
        } finally {
            resetLocationButton()
        }
    }
    
    private fun resetLocationButton() {
        binding.btnDetectLocation.text = "Use Current Location"
        binding.btnDetectLocation.isEnabled = true
    }
    
    private fun showDatePicker() {
        val calendar = Calendar.getInstance()
        val year = calendar.get(Calendar.YEAR)
        val month = calendar.get(Calendar.MONTH)
        val day = calendar.get(Calendar.DAY_OF_MONTH)
        
        val datePickerDialog = DatePickerDialog(
            this,
            { _, selectedYear, selectedMonth, selectedDay ->
                val selectedDate = String.format("%04d-%02d-%02d", selectedYear, selectedMonth + 1, selectedDay)
                binding.etDob.setText(selectedDate)
            },
            year, month, day
        )
        
        // Set max date to today (can't be born in future)
        datePickerDialog.datePicker.maxDate = System.currentTimeMillis()
        
        // Set min date to 120 years ago
        calendar.add(Calendar.YEAR, -120)
        datePickerDialog.datePicker.minDate = calendar.timeInMillis
        
        datePickerDialog.show()
    }
    
    private fun saveUserData() {
        val firstName = binding.etFirstName.text.toString().trim()
        val lastName = binding.etLastName.text.toString().trim()
        val phoneNumber = binding.etPhone.text.toString().trim()
        val dob = binding.etDob.text.toString().trim()
        val gender = binding.etGender.text.toString().trim()
        
        // Validate required fields
        if (firstName.isEmpty() || lastName.isEmpty()) {
            Toast.makeText(this, "First name and last name are required", Toast.LENGTH_SHORT).show()
            return
        }
        
        if (dob.isEmpty()) {
            Toast.makeText(this, "Date of birth is required", Toast.LENGTH_SHORT).show()
            return
        }
        
        if (gender.isEmpty()) {
            Toast.makeText(this, "Gender is required", Toast.LENGTH_SHORT).show()
            return
        }
        
        // Build profile data
        val profileData = mutableMapOf<String, Any>(
            "firstName" to firstName,
            "lastName" to lastName,
            "dob" to dob,
            "gender" to gender
        )
        
        if (phoneNumber.isNotEmpty()) {
            profileData["phoneNumber"] = phoneNumber
        }
        
        // Build address if any field is filled
        val houseNo = binding.etHouse.text.toString().trim()
        val locality = binding.etLocality.text.toString().trim()
        val city = binding.etCity.text.toString().trim()
        val state = binding.etState.text.toString().trim()
        val pinCode = binding.etPin.text.toString().trim()
        
        if (houseNo.isNotEmpty() || locality.isNotEmpty() || city.isNotEmpty() || 
            state.isNotEmpty() || pinCode.isNotEmpty()) {
            val addressMap = mutableMapOf<String, String?>()
            if (houseNo.isNotEmpty()) addressMap["houseNo"] = houseNo
            if (locality.isNotEmpty()) addressMap["locality"] = locality
            if (city.isNotEmpty()) addressMap["city"] = city
            if (state.isNotEmpty()) addressMap["state"] = state
            if (pinCode.isNotEmpty()) addressMap["pinCode"] = pinCode
            profileData["address"] = addressMap
        }
        
        val language = binding.etLanguage.text.toString().trim()
        if (language.isNotEmpty()) {
            profileData["language"] = language
        }
        
        profileData["consentDataUse"] = binding.cbConsentData.isChecked
        profileData["consentNotifications"] = binding.cbConsentNotif.isChecked
        
        // Show loading
        binding.btnSave.isEnabled = false
        binding.btnSave.text = "Saving..."
        
        lifecycleScope.launch {
            try {
                // Check if profile exists first
                val profileCheck = apiRepository.getPatientProfile()
                val hasProfile = when (profileCheck) {
                    is NetworkResult.Success -> profileCheck.data.hasProfile == true && profileCheck.data.profile != null
                    else -> false
                }
                
                if (!hasProfile) {
                    // Create new profile - backend expects name, dob, gender, emergencyContact
                    val emergencyContactPhone = if (phoneNumber.length == 10) phoneNumber else "1234567890"
                    val createProfileData = mapOf(
                        "name" to "$firstName $lastName",
                        "dob" to dob,
                        "gender" to gender,
                        "allergies" to "",
                        "chronicConditions" to "",
                        "emergencyContact" to emergencyContactPhone
                    )
                    
                    // Call create profile endpoint
                    val createResult = apiRepository.createPatientProfile(createProfileData)
                    when (createResult) {
                        is NetworkResult.Success -> {
                            // Profile created, now update with additional data if needed
                            if (profileData.size > 4) { // More than just firstName, lastName, dob, gender
                                val updateResult = apiRepository.updatePatientProfile(profileData)
                                when (updateResult) {
                                    is NetworkResult.Success -> {
                                        Toast.makeText(this@UserDetails, "Profile saved successfully", Toast.LENGTH_SHORT).show()
                                        startActivity(Intent(this@UserDetails, Home::class.java))
                                        finish()
                                    }
                                    is NetworkResult.Error -> {
                                        // Profile created but update failed - still navigate
                                        Toast.makeText(this@UserDetails, "Profile created. Some details may need updating.", Toast.LENGTH_SHORT).show()
                                        startActivity(Intent(this@UserDetails, Home::class.java))
                                        finish()
                                    }
                                    is NetworkResult.Loading -> {}
                                }
                            } else {
                                // No additional data to update
                                Toast.makeText(this@UserDetails, "Profile saved successfully", Toast.LENGTH_SHORT).show()
                                startActivity(Intent(this@UserDetails, Home::class.java))
                                finish()
                            }
                        }
                        is NetworkResult.Error -> {
                            binding.btnSave.isEnabled = true
                            binding.btnSave.text = "Save"
                            Toast.makeText(this@UserDetails, "Error creating profile: ${createResult.message}", Toast.LENGTH_LONG).show()
                        }
                        is NetworkResult.Loading -> {}
                    }
                } else {
                    // Update existing profile
                    val result = apiRepository.updatePatientProfile(profileData)
                    when (result) {
                        is NetworkResult.Success -> {
                            Toast.makeText(this@UserDetails, "Profile saved successfully", Toast.LENGTH_SHORT).show()
                            startActivity(Intent(this@UserDetails, Home::class.java))
                            finish()
                        }
                        is NetworkResult.Error -> {
                            binding.btnSave.isEnabled = true
                            binding.btnSave.text = "Save"
                            Toast.makeText(this@UserDetails, "Error: ${result.message}", Toast.LENGTH_LONG).show()
                        }
                        is NetworkResult.Loading -> {
                            // Loading state already shown
                        }
                    }
                }
            } catch (e: Exception) {
                binding.btnSave.isEnabled = true
                binding.btnSave.text = "Save"
                android.util.Log.e("UserDetails", "Error saving profile", e)
                Toast.makeText(this@UserDetails, "Error: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }
}
