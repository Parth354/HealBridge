package com.example.healbridge.ui.home

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.healbridge.api.ApiRepository
import com.example.healbridge.data.NetworkResult
import com.example.healbridge.data.models.Appointment
import com.example.healbridge.data.models.Patient
import kotlinx.coroutines.launch

class HomeViewModel : ViewModel() {
    
    private val apiRepository = ApiRepository()
    
    private val _userProfile = MutableLiveData<com.example.healbridge.data.models.ProfileResponse?>()
    val userProfile: LiveData<com.example.healbridge.data.models.ProfileResponse?> = _userProfile
    
    private val _upcomingAppointments = MutableLiveData<List<com.example.healbridge.data.models.AppointmentDetail>>()
    val upcomingAppointments: LiveData<List<com.example.healbridge.data.models.AppointmentDetail>> = _upcomingAppointments
    
    private val _healthTip = MutableLiveData<HealthTip>()
    val healthTip: LiveData<HealthTip> = _healthTip
    
    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading
    
    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error
    
    init {
        loadHealthTip()
    }
    
    fun loadUserProfile() {
        viewModelScope.launch {
            _isLoading.value = true
            when (val result = apiRepository.getPatientProfile()) {
                is NetworkResult.Success -> {
                    _userProfile.value = result.data
                }
                is NetworkResult.Error -> {
                    _error.value = result.message
                }
                is NetworkResult.Loading -> {
                    // Handle loading state
                }
            }
            _isLoading.value = false
        }
    }
    
    fun loadUpcomingAppointments() {
        viewModelScope.launch {
            _isLoading.value = true
            when (val result = apiRepository.getAppointments()) {
                is NetworkResult.Success -> {
                    // Filter for upcoming appointments (next 7 days)
                    val upcoming = result.data.appointments.filter { appointment: com.example.healbridge.data.models.AppointmentDetail ->
                        appointment.status in listOf("CONFIRMED", "STARTED")
                    }.take(3) // Show only first 3 appointments
                    _upcomingAppointments.value = upcoming
                }
                is NetworkResult.Error -> {
                    _error.value = result.message
                    _upcomingAppointments.value = emptyList()
                }
                is NetworkResult.Loading -> {
                    // Handle loading state
                }
            }
            _isLoading.value = false
        }
    }
    
    private fun loadHealthTip() {
        // For now, use static health tips. Later can be fetched from API
        val tips = listOf(
            HealthTip("Stay Hydrated", "Drink at least 8 glasses of water daily to maintain good health and boost your immune system."),
            HealthTip("Regular Exercise", "Aim for at least 30 minutes of moderate exercise daily to keep your heart healthy."),
            HealthTip("Balanced Diet", "Include fruits, vegetables, and whole grains in your daily meals for optimal nutrition."),
            HealthTip("Quality Sleep", "Get 7-9 hours of quality sleep each night to help your body recover and recharge."),
            HealthTip("Mental Health", "Take time for relaxation and stress management through meditation or hobbies.")
        )
        
        _healthTip.value = tips.random()
    }
    
    fun handleEmergency() {
        // Handle emergency action - could dial emergency number or show emergency contacts
        // For now, just clear any error state
        _error.value = null
    }
    
    fun refreshData() {
        loadUserProfile()
        loadUpcomingAppointments()
        loadHealthTip()
    }
}

data class HealthTip(
    val title: String,
    val content: String
)