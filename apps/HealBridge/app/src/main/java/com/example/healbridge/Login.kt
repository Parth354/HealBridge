package com.example.healbridge

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.healbridge.databinding.ActivityLoginBinding
import com.example.healbridge.api.ApiRepository
import com.example.healbridge.api.ApiClient
import com.example.healbridge.data.NetworkResult
import kotlinx.coroutines.launch

class Login : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private lateinit var apiRepository: ApiRepository
    private var phoneNumber: String = ""
    private var isOtpSent = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        // Initialize ApiClient
        ApiClient.initialize(this)
        
        apiRepository = ApiRepository(this)
        
        setupClickListeners()
    }
    
    private fun setupClickListeners() {
        binding.btnSendOtp.setOnClickListener {
            if (!isOtpSent) {
                sendOTP()
            } else {
                verifyOTP()
            }
        }
        
        binding.btnChangePhone.setOnClickListener {
            isOtpSent = false
            binding.etPhoneNumber.isEnabled = true
            binding.phoneInputLayout.visibility = View.VISIBLE
            binding.otpInputLayout.visibility = View.GONE
            binding.btnSendOtp.text = "Send OTP"
            binding.btnChangePhone.visibility = View.GONE
            binding.etOtp.setText("")
        }
    }
    
    private fun sendOTP() {
        phoneNumber = binding.etPhoneNumber.text?.toString()?.trim() ?: ""
        
        if (phoneNumber.length != 10) {
            showError("Please enter a valid 10-digit phone number")
            return
        }
        
        binding.loadingIndicator.visibility = View.VISIBLE
        binding.btnSendOtp.isEnabled = false
        binding.tvError.visibility = View.GONE
        
        lifecycleScope.launch {
            try {
                val result = apiRepository.sendOTP(phoneNumber, "PATIENT")
                
                when (result) {
                    is NetworkResult.Success -> {
                        isOtpSent = true
                        binding.etPhoneNumber.isEnabled = false
                        binding.phoneInputLayout.isEnabled = false
                        binding.otpInputLayout.visibility = View.VISIBLE
                        binding.btnSendOtp.text = "Verify OTP"
                        binding.btnChangePhone.visibility = View.VISIBLE
                        binding.loadingIndicator.visibility = View.GONE
                        binding.btnSendOtp.isEnabled = true
                        Toast.makeText(this@Login, "OTP sent successfully", Toast.LENGTH_SHORT).show()
                    }
                    is NetworkResult.Error -> {
                        binding.loadingIndicator.visibility = View.GONE
                        binding.btnSendOtp.isEnabled = true
                        showError("Failed to send OTP: ${result.message}")
                    }
                    is NetworkResult.Loading -> {
                        // Loading state already shown
                    }
                }
            } catch (e: Exception) {
                binding.loadingIndicator.visibility = View.GONE
                binding.btnSendOtp.isEnabled = true
                Log.e("Login", "Error sending OTP", e)
                showError("Error: ${e.message}")
            }
        }
    }
    
    private fun verifyOTP() {
        val otp = binding.etOtp.text?.toString()?.trim() ?: ""
        
        if (otp.length != 6) {
            showError("Please enter a valid 6-digit OTP")
            return
        }
        
        binding.loadingIndicator.visibility = View.VISIBLE
        binding.btnSendOtp.isEnabled = false
        binding.tvError.visibility = View.GONE
        
        lifecycleScope.launch {
            try {
                val result = apiRepository.verifyOTP(phoneNumber, otp, "PATIENT")
                
                when (result) {
                    is NetworkResult.Success -> {
                        val response = result.data
                        
                        // Save token and user ID
                        SecurePreferences.saveAuthToken(this@Login, response.token)
                        SecurePreferences.saveUserId(this@Login, response.user.id)
                        
                        Log.d("Login", "✅ Login successful")
                        Log.d("Login", "User ID: ${response.user.id}")
                        Log.d("Login", "Has Profile: ${response.user.hasProfile}")
                        
                        binding.loadingIndicator.visibility = View.GONE
                        
                        // Check if user has profile
                        if (response.user.hasProfile) {
                            navigateToHome()
                        } else {
                            navigateToUserDetails()
                        }
                    }
                    is NetworkResult.Error -> {
                        binding.loadingIndicator.visibility = View.GONE
                        binding.btnSendOtp.isEnabled = true
                        showError("Invalid OTP: ${result.message}")
                    }
                    is NetworkResult.Loading -> {
                        // Loading state already shown
                    }
                }
            } catch (e: Exception) {
                binding.loadingIndicator.visibility = View.GONE
                binding.btnSendOtp.isEnabled = true
                Log.e("Login", "Error verifying OTP", e)
                showError("Error: ${e.message}")
            }
        }
    }
    
    private fun showError(message: String) {
        binding.tvError.text = message
        binding.tvError.visibility = View.VISIBLE
    }
    
    private fun navigateToHome() {
        val intent = Intent(this, Home::class.java)
        startActivity(intent)
        finish()
    }
    
    private fun navigateToUserDetails() {
        val intent = Intent(this, UserDetails::class.java)
        startActivity(intent)
        finish()
    }
}
