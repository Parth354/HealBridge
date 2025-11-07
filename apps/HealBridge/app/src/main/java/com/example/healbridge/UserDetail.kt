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
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityUserDetailsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val uid = Firebase.auth.currentUser?.uid ?: SecurePreferences.getUserId(this)
        if (uid == null) {
            startActivity(Intent(this, Login::class.java))
            finish()
            return
        }

        binding.btnSave.setOnClickListener {
            val data = hashMapOf(
                "uid" to uid,
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

            Firebase.firestore.collection("users").document(uid)
                .set(data, com.google.firebase.firestore.SetOptions.merge())
                .addOnSuccessListener {
                    SecurePreferences.saveUserId(this, uid)
                    startActivity(Intent(this, Home::class.java))
                    finish()
                }
        }
    }
}
