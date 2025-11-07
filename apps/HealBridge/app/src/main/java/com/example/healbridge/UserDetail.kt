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
import com.example.healbridge.databinding.ActivityUserDetailsBinding
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.firebase.Firebase
import com.google.firebase.auth.auth
import com.google.firebase.firestore.firestore
import java.util.*

class UserDetails : AppCompatActivity() {
    private lateinit var binding: ActivityUserDetailsBinding
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var uid: String? = null
    
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

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        
        uid = Firebase.auth.currentUser?.uid ?: getUserId(this)
        if (uid == null) {
            startActivity(Intent(this, Login::class.java))
            finish()
            return
        }
        
        loadExistingUserData()
        setupDropdowns()
        setupClickListeners()
    }
    
    private fun loadExistingUserData() {
        uid?.let { userId ->
            Firebase.firestore.collection("users").document(userId)
                .get()
                .addOnSuccessListener { document ->
                    if (document.exists()) {
                        populateFields(document.data)
                    }
                }
                .addOnFailureListener {
                    // Continue with empty form if data loading fails
                }
        }
    }
    
    private fun populateFields(data: Map<String, Any>?) {
        data?.let {
            binding.etFirstName.setText(it["firstName"]?.toString() ?: "")
            binding.etLastName.setText(it["lastName"]?.toString() ?: "")
            binding.etPhone.setText(it["phoneNumber"]?.toString() ?: "")
            binding.etDob.setText(it["dob"]?.toString() ?: "")
            binding.etGender.setText(it["gender"]?.toString() ?: "")
            binding.etLanguage.setText(it["language"]?.toString() ?: "")
            
            // Handle address object
            val address = it["address"] as? Map<String, Any>
            address?.let { addr ->
                binding.etHouse.setText(addr["houseNo"]?.toString() ?: "")
                binding.etLocality.setText(addr["locality"]?.toString() ?: "")
                binding.etCity.setText(addr["city"]?.toString() ?: "")
                binding.etState.setText(addr["state"]?.toString() ?: "")
                binding.etPin.setText(addr["pinCode"]?.toString() ?: "")
            }
            
            // Handle consent checkboxes
            binding.cbConsentData.isChecked = it["consentDataUse"] as? Boolean ?: false
            binding.cbConsentNotif.isChecked = it["consentNotifications"] as? Boolean ?: false
        }
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
        uid?.let { userId ->
            val data = hashMapOf(
                "uid" to userId,
                "firstName" to binding.etFirstName.text.toString().trim(),
                "lastName" to binding.etLastName.text.toString().trim(),
                "phoneNumber" to binding.etPhone.text.toString().trim(),
                "dob" to binding.etDob.text.toString().trim().ifEmpty { null },
                "gender" to binding.etGender.text.toString().trim().ifEmpty { null },
                "address" to mapOf(
                    "houseNo" to binding.etHouse.text.toString().trim().ifEmpty { null },
                    "locality" to binding.etLocality.text.toString().trim().ifEmpty { null },
                    "city" to binding.etCity.text.toString().trim().ifEmpty { null },
                    "state" to binding.etState.text.toString().trim().ifEmpty { null },
                    "pinCode" to binding.etPin.text.toString().trim().ifEmpty { null }
                ),
                "language" to binding.etLanguage.text.toString().trim().ifEmpty { null },
                "consentDataUse" to binding.cbConsentData.isChecked,
                "consentNotifications" to binding.cbConsentNotif.isChecked,
                "updatedAt" to System.currentTimeMillis()
            )

            Firebase.firestore.collection("users").document(userId)
                .set(data, com.google.firebase.firestore.SetOptions.merge())
                .addOnSuccessListener {
                    startActivity(Intent(this, Home::class.java))
                    finish()
                }
                .addOnFailureListener {
                    // Handle error
                }
        }
    }
}
