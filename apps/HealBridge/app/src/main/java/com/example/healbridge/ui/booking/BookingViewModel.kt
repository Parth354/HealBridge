package com.example.healbridge.ui.booking

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.example.healbridge.api.ApiRepository
import com.example.healbridge.data.NetworkResult
import com.example.healbridge.data.models.*
import kotlinx.coroutines.launch

class BookingViewModel(application: Application) : AndroidViewModel(application) {
    
    private val apiRepository = ApiRepository(application.applicationContext)
    
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
    private var _houseVisitAddress: String? = null // Address for HOUSE visits
    
    fun getHouseVisitAddress(): String? = _houseVisitAddress
    
    // Filter data
    var userLat: Double? = null
    var userLon: Double? = null
    var sortBy: String = "distance"
    var maxDistance: Int = 50
    var minRating: Double = 0.0
    var maxFee: Double? = null
    
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
            when (val result = apiRepository.searchDoctors(
                specialty = specialty,
                lat = userLat,
                lon = userLon,
                sortBy = sortBy,
                maxDistance = maxDistance,
                minRating = minRating
            )) {
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
    
    private fun loadTimeSlots(doctorId: String, forceRefresh: Boolean = false) {
        val doctor = _selectedDoctor.value
        val clinicId = doctor?.clinicId
        if (clinicId == null || clinicId.isBlank()) {
            _error.value = "Doctor clinic information is missing. Please select another doctor."
            _availableSlots.value = emptyList()
            android.util.Log.w("BookingViewModel", "Cannot load slots: clinicId is null or blank for doctor $doctorId")
            return
        }
        
        val date = _selectedDate.value ?: getCurrentDate()
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            
            android.util.Log.d("BookingViewModel", "Loading slots for doctor=$doctorId, clinic=$clinicId, date=$date, forceRefresh=$forceRefresh")
            
            when (val result = apiRepository.getDoctorSlots(doctorId, clinicId, date, useCache = !forceRefresh)) {
                is NetworkResult.Success -> {
                    _availableSlots.value = result.data
                    android.util.Log.d("BookingViewModel", "Loaded ${result.data.size} slots")
                    if (result.data.isEmpty()) {
                        _error.value = "No available slots for this date. The doctor may not have schedule blocks configured, or all slots are booked. Please try another date."
                        android.util.Log.w("BookingViewModel", "No slots available for doctor $doctorId on $date - check if doctor has schedule blocks")
                    } else {
                        _error.value = null // Clear any previous errors
                    }
                }
                is NetworkResult.Error -> {
                    val errorMsg = parseErrorMessage(result.message ?: "Failed to load time slots")
                    _error.value = errorMsg
                    _availableSlots.value = emptyList()
                    android.util.Log.e("BookingViewModel", "Error loading slots: $errorMsg")
                }
                is NetworkResult.Loading -> {
                    // Handle loading
                }
            }
            _isLoading.value = false
        }
    }
    
    fun refreshSlots() {
        _selectedDoctor.value?.let { doctor ->
            loadTimeSlots(doctor.id, forceRefresh = true)
        }
    }
    
    fun selectTimeSlot(slot: TimeSlot) {
        _selectedSlot.value = slot
        _canProceed.value = true
    }
    
    fun selectDate(date: String, forceRefresh: Boolean = false) {
        _selectedDate.value = date
        _selectedSlot.value = null
        _selectedDoctor.value?.let { doctor ->
            loadTimeSlots(doctor.id, forceRefresh = forceRefresh)
        }
    }
    
    private fun createSlotHold() {
        val doctor = _selectedDoctor.value ?: run {
            _error.value = "Doctor not selected. Please go back and select a doctor."
            return
        }
        val slot = _selectedSlot.value ?: run {
            _error.value = "Time slot not selected. Please select a time slot."
            return
        }
        val clinicId = doctor.clinicId
        if (clinicId.isBlank()) {
            _error.value = "Doctor clinic information is missing. Please select another doctor."
            return
        }
        
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            val request = SlotHoldRequest(
                doctorId = doctor.id,
                clinicId = clinicId,
                startTs = slot.startTs,
                endTs = slot.endTs
            )
            
            when (val result = apiRepository.createSlotHold(request)) {
                is NetworkResult.Success -> {
                    _slotHold.value = SlotHold(
                        holdId = result.data.holdId,
                        expiresAt = result.data.expiresAt,
                        expiresInSeconds = result.data.expiresInSeconds
                    )
                    _currentStep.value = 3
                }
                is NetworkResult.Error -> {
                    _error.value = parseErrorMessage(result.message ?: "Failed to hold slot")
                    // If slot is already booked, refresh available slots
                    if (result.message?.contains("already booked", ignoreCase = true) == true ||
                        result.message?.contains("currently held", ignoreCase = true) == true) {
                        // Refresh slots to show updated availability
                        loadTimeSlots(doctor.id)
                    }
                }
                is NetworkResult.Loading -> {
                    // Handle loading
                }
            }
            _isLoading.value = false
        }
    }
    
    fun confirmBooking() {
        val hold = _slotHold.value ?: run {
            _error.value = "Slot hold not found. Please select a time slot again."
            return
        }
        
        // Validate hold hasn't expired
        val expiresAt = try {
            java.time.Instant.parse(hold.expiresAt).toEpochMilli()
        } catch (e: Exception) {
            _error.value = "Invalid hold expiration time. Please select a new slot."
            return
        }
        
        val now = System.currentTimeMillis()
        if (now >= expiresAt) {
            _error.value = "Slot hold has expired. Please select a new time slot."
            _slotHold.value = null
            _selectedSlot.value = null
            // Go back to time slot selection
            _currentStep.value = 2
            _selectedDoctor.value?.let { loadTimeSlots(it.id) }
            return
        }
        
        // Validate address for HOUSE visits
        if (visitType == "HOUSE" && (_houseVisitAddress.isNullOrBlank())) {
            _error.value = "Please provide an address for home visit."
            return
        }
        
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            
            val doctor = _selectedDoctor.value
            val baseFee = doctor?.consultationFee ?: 500.0
            val fee = when (visitType) {
                "HOUSE" -> baseFee + 200 // Add home visit charge
                "TELE" -> baseFee - 100  // Discount for telemedicine
                else -> baseFee
            }
            
            val request = ConfirmAppointmentRequest(
                holdId = hold.holdId,
                visitType = visitType,
                address = if (visitType == "HOUSE") _houseVisitAddress else null,
                feeMock = fee
            )
            
            when (val result = apiRepository.confirmAppointment(request)) {
                is NetworkResult.Success -> {
                    _bookingConfirmation.value = BookingConfirmation(
                        success = result.data.success,
                        appointment = result.data.appointment
                    )
                    // Clear hold after successful booking
                    _slotHold.value = null
                }
                is NetworkResult.Error -> {
                    val errorMsg = result.message ?: "Failed to confirm appointment"
                    _error.value = parseErrorMessage(errorMsg)
                    
                    // Handle specific error cases
                    if (errorMsg.contains("expired", ignoreCase = true)) {
                        _slotHold.value = null
                        _selectedSlot.value = null
                        _currentStep.value = 2
                        _selectedDoctor.value?.let { loadTimeSlots(it.id) }
                    } else if (errorMsg.contains("booked by another user", ignoreCase = true) ||
                               errorMsg.contains("slot was booked", ignoreCase = true)) {
                        _slotHold.value = null
                        _selectedSlot.value = null
                        _currentStep.value = 2
                        _selectedDoctor.value?.let { loadTimeSlots(it.id) }
                    }
                }
                is NetworkResult.Loading -> {
                    // Handle loading
                }
            }
            _isLoading.value = false
        }
    }
    
    // Helper function to parse and format error messages
    private fun parseErrorMessage(error: String): String {
        return when {
            error.contains("already booked", ignoreCase = true) -> 
                "This slot was just booked by another user. Please select a different time."
            error.contains("currently held", ignoreCase = true) -> 
                "This slot is currently being reserved. Please select another time."
            error.contains("expired", ignoreCase = true) -> 
                "The slot reservation has expired. Please select a new time slot."
            error.contains("not found", ignoreCase = true) -> 
                "Slot hold not found. Please select a time slot again."
            error.contains("belongs to another user", ignoreCase = true) -> 
                "This slot reservation belongs to another user. Please select a new slot."
            error.contains("booked by another user", ignoreCase = true) -> 
                "This slot was booked by another user while you were confirming. Please select a different time."
            error.contains("Unauthorized", ignoreCase = true) -> 
                "Your session has expired. Please log in again."
            else -> error
        }
    }
    
    fun setHouseVisitAddress(address: String?) {
        _houseVisitAddress = address
    }
    
    fun refreshSlotHoldIfNeeded() {
        val hold = _slotHold.value ?: return
        val expiresAt = try {
            java.time.Instant.parse(hold.expiresAt).toEpochMilli()
        } catch (e: Exception) {
            return
        }
        
        val now = System.currentTimeMillis()
        val timeRemaining = (expiresAt - now) / 1000
        
        // If less than 30 seconds remaining, refresh the hold by going back to slot selection
        if (timeRemaining < 30) {
            _error.value = "Slot hold is about to expire. Please select a new time slot."
            _slotHold.value = null
            _selectedSlot.value = null
            _currentStep.value = 2
            _selectedDoctor.value?.let { loadTimeSlots(it.id) }
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
    
    fun updateLocation(lat: Double, lon: Double) {
        this.userLat = lat
        this.userLon = lon
    }
    
    fun updateFilters(sortBy: String? = null, maxDistance: Int? = null, minRating: Double? = null, maxFee: Double? = null) {
        sortBy?.let { this.sortBy = it }
        maxDistance?.let { this.maxDistance = it }
        minRating?.let { this.minRating = it }
        maxFee?.let { this.maxFee = it }
        
        // Reload doctors with new filters
        _triageResult.value?.let { result ->
            loadDoctorsBySpecialty(result.specialty)
        }
    }
    
    fun searchDoctorsNearby() {
        viewModelScope.launch {
            _isLoading.value = true
            when (val result = apiRepository.searchDoctors(
                lat = userLat,
                lon = userLon,
                sortBy = sortBy,
                maxDistance = maxDistance,
                minRating = minRating
            )) {
                is NetworkResult.Success -> {
                    _availableDoctors.value = result.data.doctors.filter { doctor ->
                        maxFee?.let { doctor.consultationFee <= it } ?: true
                    }
                }
                is NetworkResult.Error -> {
                    _error.value = result.message
                    _availableDoctors.value = emptyList()
                }
                is NetworkResult.Loading -> {}
            }
            _isLoading.value = false
        }
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