package com.example.healbridge.ui.booking

import android.app.Dialog
import android.os.Bundle
import androidx.fragment.app.DialogFragment
import androidx.lifecycle.ViewModelProvider
import com.example.healbridge.databinding.DialogDoctorFilterBinding
import com.google.android.material.dialog.MaterialAlertDialogBuilder

class DoctorFilterDialog : DialogFragment() {
    
    private var _binding: DialogDoctorFilterBinding? = null
    private val binding get() = _binding!!
    
    private lateinit var viewModel: BookingViewModel
    
    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        _binding = DialogDoctorFilterBinding.inflate(layoutInflater)
        viewModel = ViewModelProvider(requireActivity())[BookingViewModel::class.java]
        
        setupUI()
        
        return MaterialAlertDialogBuilder(requireContext())
            .setTitle("Filter Doctors")
            .setView(binding.root)
            .setPositiveButton("Apply") { _, _ ->
                applyFilters()
            }
            .setNegativeButton("Cancel", null)
            .setNeutralButton("Reset") { _, _ ->
                resetFilters()
            }
            .create()
    }
    
    private fun setupUI() {
        // Sort by options
        binding.sortByGroup.setOnCheckedChangeListener { _, checkedId ->
            // Handle sort by selection
        }
        
        // Distance slider
        binding.distanceSlider.addOnChangeListener { _, value, _ ->
            binding.distanceText.text = "${value.toInt()} km"
        }
        
        // Rating slider
        binding.ratingSlider.addOnChangeListener { _, value, _ ->
            binding.ratingText.text = "${value} stars & above"
        }
        
        // Fee range slider
        binding.feeSlider.addOnChangeListener { _, value, _ ->
            binding.feeText.text = "Up to ₹${value.toInt()}"
        }
        
        // Set current values
        binding.distanceSlider.value = viewModel.maxDistance.toFloat()
        binding.ratingSlider.value = viewModel.minRating.toFloat()
        binding.feeSlider.value = viewModel.maxFee?.toFloat() ?: 2000f
    }
    
    private fun applyFilters() {
        val sortBy = when (binding.sortByGroup.checkedRadioButtonId) {
            binding.sortDistance.id -> "distance"
            binding.sortRating.id -> "rating"
            binding.sortFee.id -> "fee"
            else -> "distance"
        }
        
        viewModel.updateFilters(
            sortBy = sortBy,
            maxDistance = binding.distanceSlider.value.toInt(),
            minRating = binding.ratingSlider.value.toDouble(),
            maxFee = binding.feeSlider.value.toDouble()
        )
    }
    
    private fun resetFilters() {
        viewModel.updateFilters(
            sortBy = "distance",
            maxDistance = 50,
            minRating = 0.0,
            maxFee = null
        )
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}