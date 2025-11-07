package com.example.healbridge.ui.booking

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.healbridge.api.ApiRepository
import com.example.healbridge.data.NetworkResult
import com.example.healbridge.data.models.*
import kotlinx.coroutines.launch

class BookingViewModel : ViewModel() {
    
    private val apiRepository = ApiRepository()
    
    private val _currentStep = MutableLiveData(0)
    val currentStep: LiveData<Int> = _currentStep
    
    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading
    
    private val _canProceed = MutableLiveData(false)
    val canProceed: LiveData<Boolean> = _canProceed
    
    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error
    
    // Triage data
    private val _triageResult = MutableLiveData<TriageResponse?>()
    val triageResult: LiveData<TriageResponse?> = _triageResult
    
    // Doctor selection data
    private val _availableDoctors = MutableLiveData<List<Doctor>>()
    val availableDoctors: LiveData<List<Doctor>> = _availableDoctors
    
    private val _selectedDoctor = MutableLiveData<Doctor?>()
    val selectedDoctor: LiveData<Doctor?> = _selectedDoctor
    
    // Time slot data
    private val _availableSlots = MutableLiveData<List<TimeSlot>>()
    val availableSlots: LiveData<List<TimeSlot>> = _availableSlots
    
    private val _selectedSlot = MutableLiveData<TimeSlot?>()
    val selectedSlot: LiveData<TimeSlot?> = _selectedSlot
    
    private val _selectedDate = MutableLiveData<String?>()
    val selectedDate: LiveData<String?> = _selectedDate
    
    // Booking data
    private val _slotHold = MutableLiveData<SlotHold?>()
    val slotHold: LiveData<SlotHold?> = _slotHold
    
    private val _bookingConfirmation = MutableLiveData<BookingConfirmation?>()
    val bookingConfirmation: LiveData<BookingConfirmation?> = _bookingConfirmation
    
    // User input data
    var symptoms: String = ""
    var severity: String = ""
    var duration: String = ""
    var visitType: String = "CLINIC"
    var notes: String = ""
    
    fun nextStep() {
        when (_currentStep.value) {
            0 -> {
                if (symptoms.isNotEmpty()) {
                    analyzeSymptoms()
                }
            }
            1 -> {
                _selectedDoctor.value?.let {
                    _currentStep.value = 2
                    loadTimeSlots(it.id)
                }
            }
            2 -> {
                _selectedSlot.value?.let {
                    createSlotHold()
                }
            }
            3 -> {
                confirmBooking()
            }
        }
    }
    
    fun previousStep() {
        val current = _currentStep.value ?: 0
        if (current > 0) {
            _currentStep.value = current - 1
        }
    }
    
    fun analyzeSymptoms() {
        viewModelScope.launch {
            _isLoading.value = true
            val request = TriageRequest(symptoms, severity, duration)
            
            when (val result = apiRepository.analyzeSymptoms(request)) {
                is NetworkResult.Success -> {
                    _triageResult.value = result.data
                    _currentStep.value = 1
                    loadDoctorsBySpecialty(result.data.specialty)
                }
                is NetworkResult.Error -> {
                    _error.value = result.message
                }
                is NetworkResult.Loading -> {
                    // Handle loading
                }
            }
            _isLoading.value = false
        }
    }
    
    private fun loadDoctorsBySpecialty(specialty: String) {
        viewModelScope.launch {
            _isLoading.value = true
            when (val result = apiRepository.searchDoctors(specialty = specialty)) {
                is NetworkResult.Success -> {
                    _availableDoctors.value = result.data.doctors
                }
                is NetworkResult.Error -> {
                    _error.value = result.message
                    _availableDoctors.value = emptyList()
                }
                is NetworkResult.Loading -> {
                    // Handle loading
                }
            }
            _isLoading.value = false
        }
    }
    
    fun selectDoctor(doctor: Doctor) {
        _selectedDoctor.value = doctor
        _canProceed.value = true
    }
    
    private fun loadTimeSlots(doctorId: String) {
        val date = _selectedDate.value ?: getCurrentDate()
        viewModelScope.launch {
            _isLoading.value = true
            when (val result = apiRepository.getDoctorSlots(doctorId, date)) {
                is NetworkResult.Success -> {
                    _availableSlots.value = result.data
                }
                is NetworkResult.Error -> {
                    _error.value = result.message
                    _availableSlots.value = emptyList()
                }
                is NetworkResult.Loading -> {
                    // Handle loading
                }
            }
            _isLoading.value = false
        }
    }
    
    fun selectTimeSlot(slot: TimeSlot) {
        _selectedSlot.value = slot
        _canProceed.value = true
    }
    
    fun selectDate(date: String) {
        _selectedDate.value = date
        _selectedSlot.value = null
        _selectedDoctor.value?.let { loadTimeSlots(it.id) }
    }
    
    private fun createSlotHold() {
        val doctor = _selectedDoctor.value ?: return
        val slot = _selectedSlot.value ?: return
        val date = _selectedDate.value ?: return
        
        viewModelScope.launch {
            _isLoading.value = true
            val request = SlotHoldRequest(
                doctorId = doctor.id,
                clinicId = "default", // You might need to get this from doctor data
                startTs = "$date ${slot.time}",
                endTs = "$date ${getEndTime(slot.time)}"
            )
            
            when (val result = apiRepository.createSlotHold(request)) {
                is NetworkResult.Success -> {
                    _slotHold.value = result.data
                    _currentStep.value = 3
                }
                is NetworkResult.Error -> {
                    _error.value = result.message
                }
                is NetworkResult.Loading -> {
                    // Handle loading
                }
            }
            _isLoading.value = false
        }
    }
    
    private fun confirmBooking() {
        val hold = _slotHold.value ?: return
        
        viewModelScope.launch {
            _isLoading.value = true
            val request = BookingConfirmRequest(
                holdId = hold.holdId,
                visitType = visitType,
                symptoms = symptoms,
                notes = notes
            )
            
            when (val result = apiRepository.confirmBooking(request)) {
                is NetworkResult.Success -> {
                    _bookingConfirmation.value = result.data
                    // Navigate to success screen or finish activity
                }
                is NetworkResult.Error -> {
                    _error.value = result.message
                }
                is NetworkResult.Loading -> {
                    // Handle loading
                }
            }
            _isLoading.value = false
        }
    }
    
    fun updateSymptoms(symptoms: String) {
        this.symptoms = symptoms
        _canProceed.value = symptoms.isNotEmpty()
    }
    
    fun updateSeverity(severity: String) {
        this.severity = severity
    }
    
    fun updateDuration(duration: String) {
        this.duration = duration
    }
    
    private fun getCurrentDate(): String {
        val calendar = java.util.Calendar.getInstance()
        return "${calendar.get(java.util.Calendar.YEAR)}-${
            String.format("%02d", calendar.get(java.util.Calendar.MONTH) + 1)
        }-${String.format("%02d", calendar.get(java.util.Calendar.DAY_OF_MONTH))}"
    }
    
    private fun getEndTime(startTime: String): String {
        // Simple implementation - add 30 minutes
        val parts = startTime.split(":")
        val hour = parts[0].toInt()
        val minute = parts[1].toInt()
        val endMinute = minute + 30
        val endHour = if (endMinute >= 60) hour + 1 else hour
        val finalMinute = if (endMinute >= 60) endMinute - 60 else endMinute
        return "${String.format("%02d", endHour)}:${String.format("%02d", finalMinute)}"
    }
}