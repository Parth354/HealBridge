package com.example.healbridge.ui.map

import android.Manifest
import android.annotation.SuppressLint
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
import com.example.healbridge.data.models.Doctor
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
            }
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentMapBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        apiRepository = ApiRepository()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(requireActivity())
        
        setupWebView()
        setupSearch()
        checkLocationPermission()
        loadDoctors()
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
        }.addOnFailureListener {
            loadMap()
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
                                'Rating: ' + doctor.rating + '/5<br>' +
                                'Fee: ₹' + doctor.fee + '<br>' +
                                doctor.clinic
                            );
                        
                        marker.on('click', function() {
                            Android.onDoctorSelected(doctor.id);
                        });
                        
                        markers.push(marker);
                    });
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
    
    private fun loadDoctors() {
        lifecycleScope.launch {
            try {
                when (val result = apiRepository.searchDoctors()) {
                    is NetworkResult.Success -> {
                        if (_binding != null) {
                            doctors.clear()
                            doctors.addAll(result.data.doctors)
                            updateDoctorsCount()
                            addDoctorsToMap()
                        }
                    }
                    is NetworkResult.Error -> {
                        if (_binding != null) {
                            showSampleDoctors()
                        }
                    }
                    is NetworkResult.Loading -> {}
                }
            } catch (e: Exception) {
                if (_binding != null) {
                    showSampleDoctors()
                }
            }
        }
    }
    
    private fun showSampleDoctors() {
        val sampleDoctors = listOf(
            Doctor("1", "Dr. John Smith", "Cardiologist", "john@example.com", "+91-9876543210", 10, 4.5, null, "Apollo Hospital", "Delhi", 500.0, true, "Experienced cardiologist"),
            Doctor("2", "Dr. Sarah Johnson", "Dermatologist", "sarah@example.com", "+91-9876543211", 8, 4.8, null, "Max Hospital", "Delhi", 400.0, true, "Skin specialist"),
            Doctor("3", "Dr. Mike Wilson", "Orthopedic", "mike@example.com", "+91-9876543212", 12, 4.3, null, "Fortis Hospital", "Delhi", 600.0, true, "Bone and joint expert")
        )
        doctors.clear()
        doctors.addAll(sampleDoctors)
        updateDoctorsCount()
        addDoctorsToMap()
    }
    
    private fun updateDoctorsCount() {
        if (_binding != null) {
            binding.tvDoctorsCount.text = "${doctors.size} doctors found nearby"
        }
    }
    
    private fun addDoctorsToMap() {
        if (_binding == null) return
        
        val doctorsJson = doctors.mapIndexed { index, doctor ->
            val lat = userLatitude + (index * 0.01) // Sample locations near user
            val lng = userLongitude + (index * 0.01)
            """
            {
                "id": "${doctor.id}",
                "name": "${doctor.name}",
                "specialty": "${doctor.specialty}",
                "rating": ${doctor.rating},
                "fee": ${doctor.consultationFee},
                "clinic": "${doctor.clinicName}",
                "lat": $lat,
                "lng": $lng
            }
            """.trimIndent()
        }.joinToString(",")
        
        binding.webviewMap.evaluateJavascript("addDoctors([$doctorsJson]);", null)
    }
    
    private fun filterDoctors(query: String) {
        if (_binding == null) return
        
        val filteredDoctors = if (query.isEmpty()) {
            doctors
        } else {
            doctors.filter { 
                it.name.contains(query, ignoreCase = true) || 
                it.specialty.contains(query, ignoreCase = true)
            }
        }
        
        val doctorsJson = filteredDoctors.mapIndexed { index, doctor ->
            val lat = userLatitude + (index * 0.01) // Sample locations near user
            val lng = userLongitude + (index * 0.01)
            """
            {
                "id": "${doctor.id}",
                "name": "${doctor.name}",
                "specialty": "${doctor.specialty}",
                "rating": ${doctor.rating},
                "fee": ${doctor.consultationFee},
                "clinic": "${doctor.clinicName}",
                "lat": $lat,
                "lng": $lng
            }
            """.trimIndent()
        }.joinToString(",")
        
        binding.webviewMap.evaluateJavascript("clearMarkers(); addDoctors([$doctorsJson]);", null)
    }
    
    private fun showDoctorInfo(doctorId: String) {
        val doctor = doctors.find { it.id == doctorId }
        if (doctor != null && _binding != null) {
            binding.cardSelectedDoctor.visibility = View.VISIBLE
            binding.tvSelectedDoctorName.text = doctor.name
            binding.tvSelectedDoctorSpecialty.text = doctor.specialty
            
            val doctorLat = userLatitude + 0.01 // Sample location
            val doctorLng = userLongitude + 0.01
            val distance = calculateDistance(userLatitude, userLongitude, doctorLat, doctorLng)
            binding.tvSelectedDoctorDistance.text = "%.1f km away".format(distance)
            
            binding.btnBookAppointment.setOnClickListener {
                Toast.makeText(context, "Booking appointment with ${doctor.name}", Toast.LENGTH_SHORT).show()
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