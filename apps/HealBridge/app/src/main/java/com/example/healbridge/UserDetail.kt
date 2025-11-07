package com.example.healbridge

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.example.healbridge.databinding.ActivityUserDetailsBinding
import com.google.firebase.Firebase
import com.google.firebase.auth.auth
import com.google.firebase.firestore.firestore

class UserDetails : AppCompatActivity() {
    private lateinit var binding: ActivityUserDetailsBinding
    private var uid: String? = null
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityUserDetailsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        uid = Firebase.auth.currentUser?.uid ?: getUserId(this)
        if (uid == null) {
            startActivity(Intent(this, Login::class.java))
            finish()
            return
        }
        
        loadExistingUserData()
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
    
    private fun setupClickListeners() {

        binding.btnSave.setOnClickListener {
            saveUserData()
        }
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
