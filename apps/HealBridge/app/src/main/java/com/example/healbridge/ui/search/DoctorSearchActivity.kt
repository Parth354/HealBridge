package com.example.healbridge.ui.search

import android.content.Intent
import android.location.Location
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.healbridge.api.ApiRepository
import com.example.healbridge.data.NetworkResult
import com.example.healbridge.databinding.ActivityDoctorSearchBinding
import com.example.healbridge.ui.booking.BookAppointmentActivity
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.launch

class DoctorSearchActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityDoctorSearchBinding
    private lateinit var apiRepository: ApiRepository
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var userLatitude: Double = 28.6139 // Default: Delhi
    private var userLongitude: Double = 77.2090 // Default: Delhi
    private lateinit var doctorsAdapter: DoctorSearchAdapter
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityDoctorSearchBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        apiRepository = ApiRepository(this)
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        
        setupToolbar()
        setupRecyclerView()
        setupSearch()
        getCurrentLocation()
    }
    
    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Search Doctors"
        binding.toolbar.setNavigationOnClickListener {
            finish()
        }
    }
    
    private fun setupRecyclerView() {
        doctorsAdapter = DoctorSearchAdapter { doctor ->
            // Navigate to booking with selected doctor
            val intent = Intent(this, BookAppointmentActivity::class.java).apply {
                putExtra("doctor_id", doctor.id)
                putExtra("doctor_name", doctor.name)
                putExtra("doctor_specialty", doctor.specialty)
                putExtra("clinic_id", doctor.clinicId)
                putExtra("clinic_name", doctor.clinicName)
            }
            startActivity(intent)
            finish()
        }
        
        binding.recyclerViewDoctors.apply {
            layoutManager = LinearLayoutManager(this@DoctorSearchActivity)
            adapter = doctorsAdapter
        }
    }
    
    private fun setupSearch() {
        binding.searchEditText.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val query = s.toString().trim()
                if (query.length >= 2) {
                    searchDoctors(query)
                } else if (query.isEmpty()) {
                    // Clear results when search is empty
                    doctorsAdapter.submitList(emptyList())
                    binding.emptyState.visibility = View.GONE
                    binding.recyclerViewDoctors.visibility = View.GONE
                }
            }
        })
        
        // Load initial doctors when activity starts
        searchDoctors("")
    }
    
    private fun getCurrentLocation() {
        try {
            if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) == 
                android.content.pm.PackageManager.PERMISSION_GRANTED) {
                fusedLocationClient.lastLocation.addOnSuccessListener { location: Location? ->
                    location?.let {
                        userLatitude = it.latitude
                        userLongitude = it.longitude
                        // If search is already active, refresh results with new location
                        val query = binding.searchEditText.text.toString().trim()
                        if (query.isNotEmpty()) {
                            searchDoctors(query)
                        }
                    }
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("DoctorSearchActivity", "Error getting location: ${e.message}")
        }
    }
    
    private fun searchDoctors(query: String) {
        binding.progressBar.visibility = View.VISIBLE
        binding.emptyState.visibility = View.GONE
        binding.recyclerViewDoctors.visibility = View.GONE
        
        lifecycleScope.launch {
            try {
                // Parse query - could be doctor name or specialty
                val specialty = if (query.isNotEmpty() && isLikelySpecialty(query)) {
                    query
                } else {
                    null
                }
                
                when (val result = apiRepository.searchDoctors(
                    specialty = specialty,
                    lat = userLatitude,
                    lon = userLongitude,
                    sortBy = "distance",
                    maxDistance = 50, // 50 km radius
                    minRating = 0.0
                )) {
                    is NetworkResult.Success -> {
                        val doctors = result.data.doctors
                        
                        // If query is not a specialty, filter by doctor name
                        val filteredDoctors = if (query.isNotEmpty() && specialty == null) {
                            doctors.filter { doctor ->
                                doctor.name.contains(query, ignoreCase = true) ||
                                doctor.specialty.contains(query, ignoreCase = true) ||
                                doctor.clinicName.contains(query, ignoreCase = true)
                            }
                        } else {
                            doctors
                        }
                        
                        if (filteredDoctors.isEmpty()) {
                            binding.emptyState.visibility = View.VISIBLE
                            binding.recyclerViewDoctors.visibility = View.GONE
                            binding.emptyStateText.text = if (query.isNotEmpty()) {
                                "No doctors found for \"$query\""
                            } else {
                                "No doctors available"
                            }
                        } else {
                            binding.emptyState.visibility = View.GONE
                            binding.recyclerViewDoctors.visibility = View.VISIBLE
                            doctorsAdapter.submitList(filteredDoctors)
                        }
                    }
                    is NetworkResult.Error -> {
                        binding.emptyState.visibility = View.VISIBLE
                        binding.recyclerViewDoctors.visibility = View.GONE
                        binding.emptyStateText.text = "Error: ${result.message}"
                        Toast.makeText(this@DoctorSearchActivity, "Error searching doctors: ${result.message}", Toast.LENGTH_SHORT).show()
                    }
                    is NetworkResult.Loading -> {
                        // Loading state already handled
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("DoctorSearchActivity", "Error searching doctors: ${e.message}", e)
                binding.emptyState.visibility = View.VISIBLE
                binding.recyclerViewDoctors.visibility = View.GONE
                binding.emptyStateText.text = "Error: ${e.message}"
                Toast.makeText(this@DoctorSearchActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }
    
    private fun isLikelySpecialty(query: String): Boolean {
        // Common medical specialties
        val specialties = listOf(
            "cardiology", "cardiac", "heart",
            "orthopedics", "orthopedic", "bone",
            "neurology", "neurologist", "brain",
            "pediatrics", "pediatric", "child",
            "dermatology", "dermatologist", "skin",
            "gynecology", "gynecologist", "obstetrics",
            "psychiatry", "psychiatrist", "mental",
            "oncology", "cancer",
            "urology", "urologist",
            "ophthalmology", "ophthalmologist", "eye",
            "ent", "ear", "nose", "throat",
            "general", "medicine", "physician"
        )
        return specialties.any { specialty ->
            query.contains(specialty, ignoreCase = true)
        }
    }
}
