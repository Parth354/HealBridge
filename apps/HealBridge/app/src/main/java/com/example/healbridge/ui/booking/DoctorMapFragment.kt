package com.example.healbridge.ui.booking

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import com.example.healbridge.databinding.FragmentDoctorMapBinding
import com.example.healbridge.data.models.Doctor

class DoctorMapFragment : Fragment() {
    
    private var _binding: FragmentDoctorMapBinding? = null
    private val binding get() = _binding!!
    
    private lateinit var viewModel: BookingViewModel
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentDoctorMapBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        viewModel = ViewModelProvider(requireActivity())[BookingViewModel::class.java]
        
        setupMapView()
        observeViewModel()
    }
    
    private fun setupMapView() {
        // Initialize map (using Google Maps or similar)
        // For now, show a simple list with location info
        binding.mapPlaceholder.text = "Map View - Doctors Near You"
    }
    
    private fun observeViewModel() {
        viewModel.availableDoctors.observe(viewLifecycleOwner) { doctors ->
            displayDoctorsOnMap(doctors)
        }
        
        viewModel.selectedDoctor.observe(viewLifecycleOwner) { doctor ->
            doctor?.let {
                highlightDoctorOnMap(it)
            }
        }
    }
    
    private fun displayDoctorsOnMap(doctors: List<Doctor>) {
        // Add markers for each doctor on the map
        // Show clinic locations with doctor info
        binding.doctorCount.text = "${doctors.size} doctors found nearby"
    }
    
    private fun highlightDoctorOnMap(doctor: Doctor) {
        // Highlight selected doctor on map
        // Show detailed info window
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}