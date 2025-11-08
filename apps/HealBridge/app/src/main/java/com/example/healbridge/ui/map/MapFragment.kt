package com.example.healbridge.ui.map

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.example.healbridge.api.ApiRepository
import com.example.healbridge.data.NetworkResult
import com.example.healbridge.data.models.BackendDoctorResponse
import com.example.healbridge.data.models.Doctor
import com.example.healbridge.data.models.toDoctor
import com.example.healbridge.databinding.FragmentMapBinding
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.launch

class MapFragment : Fragment() {
    private var _binding: FragmentMapBinding? = null
    private val binding get() = _binding!!
    private lateinit var apiRepository: ApiRepository
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private val doctors = mutableListOf<Doctor>()
    private var userLatitude = 28.6139
    private var userLongitude = 77.2090
    private var maxDistance = 50 // Default search radius in km
    
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
                loadMap()
                // Load doctors even without location permission (uses default location)
                loadDoctorsWithCoordinates()
            }
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentMapBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        apiRepository = ApiRepository(requireContext())
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(requireActivity())
        
        setupWebView()
        setupSearch()
        setupDistanceFilter()
        checkLocationPermission()
        // Don't call loadDoctors() here - it will be called after location is obtained
    }
    
    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        binding.webviewMap.apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            addJavascriptInterface(MapInterface(), "Android")
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    if (_binding != null) {
                        binding.progressBar.visibility = View.GONE
                    }
                }
            }
        }
    }
    
    private fun setupSearch() {
        binding.etSearchDoctors.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                filterDoctors(s.toString())
            }
        })
    }
    
    private fun setupDistanceFilter() {
        binding.distanceChipGroup.setOnCheckedStateChangeListener { group, checkedIds ->
            val checkedId = checkedIds.firstOrNull()
            if (checkedId != null) {
                // Use resource IDs directly to avoid view binding naming issues
                maxDistance = when (checkedId) {
                    com.example.healbridge.R.id.chip_5km -> 5
                    com.example.healbridge.R.id.chip_10km -> 10
                    com.example.healbridge.R.id.chip_25km -> 25
                    com.example.healbridge.R.id.chip_50km -> 50
                    com.example.healbridge.R.id.chip_100km -> 100
                    else -> 50
                }
                android.util.Log.d("MapFragment", "Distance filter changed to $maxDistance km")
                // Reload doctors with new distance filter
                loadDoctorsWithCoordinates()
            }
        }
    }
    
    private fun checkLocationPermission() {
        when {
            ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED -> {
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
    
    @SuppressLint("MissingPermission")
    private fun getCurrentLocation() {
        fusedLocationClient.lastLocation.addOnSuccessListener { location: Location? ->
            location?.let {
                userLatitude = it.latitude
                userLongitude = it.longitude
            }
            loadMap()
            // Load doctors after getting location
            loadDoctorsWithCoordinates()
        }.addOnFailureListener {
            loadMap()
            // Still try to load doctors with default location
            loadDoctorsWithCoordinates()
        }
    }
    
    private fun loadMap() {
        val mapHtml = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
            <style>
                body { margin: 0; padding: 0; }
                #map { height: 100vh; width: 100%; }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <script>
                var map = L.map('map').setView([$userLatitude, $userLongitude], 13);
                var markers = [];
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);
                
                L.marker([$userLatitude, $userLongitude])
                    .addTo(map)
                    .bindPopup('Your Location')
                    .openPopup();
                
                function addDoctors(doctors) {
                    doctors.forEach(function(doctor) {
                        var marker = L.marker([doctor.lat, doctor.lng])
                            .addTo(map)
                            .bindPopup(
                                '<b>' + doctor.name + '</b><br>' +
                                doctor.specialty + '<br>' +
                                'Rating: ' + doctor.rating.toFixed(1) + '/5<br>' +
                                'Fee: ₹' + doctor.fee + '<br>' +
                                doctor.clinic + '<br>' +
                                (doctor.address ? doctor.address + '<br>' : '') +
                                (doctor.distance ? doctor.distance : '')
                            );
                        
                        marker.on('click', function() {
                            Android.onDoctorSelected(doctor.id);
                        });
                        
                        markers.push(marker);
                    });
                    
                    // Fit map to show all markers if there are any
                    if (doctors.length > 0) {
                        var group = new L.featureGroup(markers);
                        map.fitBounds(group.getBounds().pad(0.1));
                    }
                }
                
                function clearMarkers() {
                    markers.forEach(function(marker) {
                        map.removeLayer(marker);
                    });
                    markers = [];
                }
            </script>
        </body>
        </html>
        """.trimIndent()
        
        binding.webviewMap.loadDataWithBaseURL(null, mapHtml, "text/html", "UTF-8", null)
    }
    
    // Removed loadDoctors() - now using loadDoctorsWithCoordinates() which fetches raw backend response with clinic coordinates
    // Removed showSampleDoctors() - we now always fetch from backend
    
    private fun updateDoctorsCount() {
        if (_binding != null) {
            binding.tvDoctorsCount.text = "${doctors.size} doctors found within $maxDistance km"
        }
    }
    
    // This method is no longer needed - we use loadDoctorsWithCoordinates() directly
    // Keeping for backwards compatibility but it now just calls loadDoctorsWithCoordinates
    private fun addDoctorsToMap() {
        if (_binding == null) return
        addDoctorsToMapWithCoordinates()
    }
    
    // Store doctor with clinic coordinates
    private data class DoctorWithLocation(
        val doctor: Doctor,
        val lat: Double,
        val lng: Double,
        val distance: Double?
    )
    
    private val doctorsWithLocation = mutableListOf<DoctorWithLocation>()
    
    private fun loadDoctorsWithCoordinates() {
        lifecycleScope.launch {
            try {
                binding.progressBar.visibility = View.VISIBLE
                
                // Fetch raw backend response to get clinic coordinates
                when (val result = apiRepository.searchDoctorsRaw(
                    specialty = null,
                    lat = userLatitude,
                    lon = userLongitude,
                    visitType = null,
                    sortBy = "distance",
                    maxDistance = maxDistance,
                    minRating = 0.0,
                    limit = 50
                )) {
                    is NetworkResult.Success -> {
                        if (_binding != null) {
                            doctors.clear()
                            doctorsWithLocation.clear()
                            
                            // Process backend response and extract clinic coordinates
                            // For doctors with multiple clinics, we'll show the nearest clinic on the map
                            result.data.doctors.forEach { backendDoctor ->
                                // Use nearest clinic if available, otherwise use first clinic
                                val clinic = backendDoctor.nearestClinic ?: backendDoctor.clinics.firstOrNull()
                                
                                // Only add doctors that have valid clinic with coordinates
                                if (clinic != null && clinic.lat != null && clinic.lon != null) {
                                    // Convert backend doctor to app Doctor model
                                    val doctor = com.example.healbridge.data.models.toDoctor(
                                        backendDoctor,
                                        userEmail = backendDoctor.user?.email,
                                        userPhone = backendDoctor.user?.phone
                                    )
                                    
                                    doctors.add(doctor)
                                    doctorsWithLocation.add(
                                        DoctorWithLocation(
                                            doctor = doctor,
                                            lat = clinic.lat,
                                            lng = clinic.lon,
                                            distance = clinic.distance
                                        )
                                    )
                                } else {
                                    android.util.Log.w("MapFragment", "Skipping doctor ${backendDoctor.doctorId} - no valid clinic coordinates")
                                }
                            }
                            
                            android.util.Log.d("MapFragment", "Processed ${doctors.size} doctors from ${result.data.doctors.size} backend results")
                            
                            updateDoctorsCount()
                            addDoctorsToMapWithCoordinates()
                            binding.progressBar.visibility = View.GONE
                            
                            if (doctors.isEmpty() && isAdded && context != null) {
                                Toast.makeText(context, "No doctors found within $maxDistance km radius", Toast.LENGTH_SHORT).show()
                            } else {
                                android.util.Log.d("MapFragment", "Loaded ${doctors.size} doctors with coordinates")
                            }
                        }
                    }
                    is NetworkResult.Error -> {
                        if (_binding != null && isAdded && context != null) {
                            binding.progressBar.visibility = View.GONE
                            android.util.Log.e("MapFragment", "Error loading doctors: ${result.message}")
                            val errorMessage = if (result.message?.contains("timeout", ignoreCase = true) == true) {
                                "Request timed out. Please check your internet connection and try again."
                            } else {
                                "Failed to load doctors: ${result.message}"
                            }
                            Toast.makeText(context, errorMessage, Toast.LENGTH_LONG).show()
                        }
                    }
                    is NetworkResult.Loading -> {
                        binding.progressBar.visibility = View.VISIBLE
                    }
                }
            } catch (e: Exception) {
                if (_binding != null && isAdded && context != null) {
                    binding.progressBar.visibility = View.GONE
                    android.util.Log.e("MapFragment", "Exception loading doctors", e)
                    val errorMessage = if (e.message?.contains("timeout", ignoreCase = true) == true || 
                                           e is java.net.SocketTimeoutException) {
                        "Request timed out. Please check your internet connection and try again."
                    } else {
                        "Error: ${e.message}"
                    }
                    Toast.makeText(context, errorMessage, Toast.LENGTH_LONG).show()
                }
            }
        }
    }
    
    private fun addDoctorsToMapWithCoordinates() {
        if (_binding == null) return
        
        if (doctorsWithLocation.isEmpty()) {
            android.util.Log.d("MapFragment", "No doctors with valid coordinates to display")
            return
        }
        
        val doctorsJson = doctorsWithLocation.map { docWithLoc ->
            val distanceText = docWithLoc.distance?.let { "%.1f km".format(it) } ?: "Unknown distance"
            """
            {
                "id": "${docWithLoc.doctor.id}",
                "name": "${docWithLoc.doctor.name.escapeJson()}",
                "specialty": "${docWithLoc.doctor.specialty.escapeJson()}",
                "rating": ${docWithLoc.doctor.rating},
                "fee": ${docWithLoc.doctor.consultationFee.toInt()},
                "clinic": "${docWithLoc.doctor.clinicName.escapeJson()}",
                "address": "${docWithLoc.doctor.clinicAddress.escapeJson()}",
                "distance": "$distanceText",
                "lat": ${docWithLoc.lat},
                "lng": ${docWithLoc.lng}
            }
            """.trimIndent()
        }.joinToString(",")
        
        android.util.Log.d("MapFragment", "Adding ${doctorsWithLocation.size} doctors to map")
        binding.webviewMap.evaluateJavascript("clearMarkers(); addDoctors([$doctorsJson]);", null)
    }
    
    private fun String.escapeJson(): String {
        return this.replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t")
    }
    
    private fun filterDoctors(query: String) {
        if (_binding == null) return
        
        val filteredDoctorsWithLocation = if (query.isEmpty()) {
            doctorsWithLocation
        } else {
            doctorsWithLocation.filter { 
                it.doctor.name.contains(query, ignoreCase = true) || 
                it.doctor.specialty.contains(query, ignoreCase = true) ||
                it.doctor.clinicName.contains(query, ignoreCase = true)
            }
        }
        
        val doctorsJson = filteredDoctorsWithLocation.map { docWithLoc ->
            val distanceText = docWithLoc.distance?.let { "%.1f km".format(it) } ?: "Unknown distance"
            """
            {
                "id": "${docWithLoc.doctor.id}",
                "name": "${docWithLoc.doctor.name.escapeJson()}",
                "specialty": "${docWithLoc.doctor.specialty.escapeJson()}",
                "rating": ${docWithLoc.doctor.rating},
                "fee": ${docWithLoc.doctor.consultationFee.toInt()},
                "clinic": "${docWithLoc.doctor.clinicName.escapeJson()}",
                "address": "${docWithLoc.doctor.clinicAddress.escapeJson()}",
                "distance": "$distanceText",
                "lat": ${docWithLoc.lat},
                "lng": ${docWithLoc.lng}
            }
            """.trimIndent()
        }.joinToString(",")
        
        binding.webviewMap.evaluateJavascript("clearMarkers(); addDoctors([$doctorsJson]);", null)
    }
    
    private fun showDoctorInfo(doctorId: String) {
        val doctorWithLoc = doctorsWithLocation.find { it.doctor.id == doctorId }
        if (doctorWithLoc != null && _binding != null) {
            val doctor = doctorWithLoc.doctor
            binding.cardSelectedDoctor.visibility = View.VISIBLE
            binding.tvSelectedDoctorName.text = doctor.name
            binding.tvSelectedDoctorSpecialty.text = doctor.specialty
            
            val distance = doctorWithLoc.distance ?: calculateDistance(
                userLatitude, 
                userLongitude, 
                doctorWithLoc.lat, 
                doctorWithLoc.lng
            )
            binding.tvSelectedDoctorDistance.text = "%.1f km away".format(distance)
            
            binding.btnBookAppointment.setOnClickListener {
                // Navigate to booking flow with selected doctor
                val intent = Intent(requireContext(), com.example.healbridge.ui.booking.BookAppointmentActivity::class.java).apply {
                    putExtra("doctor_id", doctor.id)
                    putExtra("doctor_name", doctor.name)
                    putExtra("doctor_specialty", doctor.specialty)
                    putExtra("clinic_id", doctor.clinicId)
                    putExtra("clinic_name", doctor.clinicName)
                }
                startActivity(intent)
            }
        }
    }
    
    private fun calculateDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val earthRadius = 6371.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
        val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return earthRadius * c
    }
    
    inner class MapInterface {
        @JavascriptInterface
        fun onDoctorSelected(doctorId: String) {
            requireActivity().runOnUiThread {
                showDoctorInfo(doctorId)
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}