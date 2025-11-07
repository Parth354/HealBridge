package com.example.healbridge.ui.booking

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.healbridge.databinding.FragmentDoctorSelectionBinding
import com.example.healbridge.data.models.Doctor

class DoctorSelectionFragment : Fragment() {
    
    private var _binding: FragmentDoctorSelectionBinding? = null
    private val binding get() = _binding!!
    
    private lateinit var viewModel: BookingViewModel
    private lateinit var doctorsAdapter: DoctorSelectionAdapter
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentDoctorSelectionBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        viewModel = ViewModelProvider(requireActivity())[BookingViewModel::class.java]
        
        setupRecyclerView()
        setupFilters()
        observeViewModel()
    }
    
    private fun setupRecyclerView() {
        doctorsAdapter = DoctorSelectionAdapter { doctor ->
            viewModel.selectDoctor(doctor)
        }
        
        binding.doctorsRecyclerView.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = doctorsAdapter
        }
    }
    
    private fun setupFilters() {
        binding.filterButton.setOnClickListener {
            showFilterDialog()
        }
        
        binding.mapToggle.setOnClickListener {
            toggleMapView()
        }
        
        binding.nearbyButton.setOnClickListener {
            searchNearbyDoctors()
        }
    }
    
    private fun showFilterDialog() {
        val filterDialog = DoctorFilterDialog()
        filterDialog.show(parentFragmentManager, "DoctorFilterDialog")
    }
    
    private fun toggleMapView() {
        val mapFragment = DoctorMapFragment()
        parentFragmentManager.beginTransaction()
            .replace(android.R.id.content, mapFragment)
            .addToBackStack(null)
            .commit()
    }
    
    private fun searchNearbyDoctors() {
        // Get user location and search nearby doctors
        viewModel.searchDoctorsNearby()
    }
    
    private fun observeViewModel() {
        viewModel.triageResult.observe(viewLifecycleOwner) { result ->
            result?.let {
                binding.selectedSpecialty.text = "Specialty: ${it.specialty}"
            }
        }
        
        viewModel.availableDoctors.observe(viewLifecycleOwner) { doctors ->
            doctorsAdapter.submitList(doctors)
            
            if (doctors.isEmpty()) {
                binding.emptyState.visibility = View.VISIBLE
                binding.doctorsRecyclerView.visibility = View.GONE
            } else {
                binding.emptyState.visibility = View.GONE
                binding.doctorsRecyclerView.visibility = View.VISIBLE
            }
        }
        
        viewModel.selectedDoctor.observe(viewLifecycleOwner) { doctor ->
            doctor?.let {
                doctorsAdapter.setSelectedDoctor(it.id)
            }
        }
        
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.loadingProgress.visibility = if (isLoading) View.VISIBLE else View.GONE
        }
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}