package com.example.healbridge.ui.booking

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import com.example.healbridge.databinding.FragmentTriageBinding
import com.google.android.material.chip.Chip

class TriageFragment : Fragment() {
    
    private var _binding: FragmentTriageBinding? = null
    private val binding get() = _binding!!
    
    private lateinit var viewModel: BookingViewModel
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentTriageBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        viewModel = ViewModelProvider(requireActivity())[BookingViewModel::class.java]
        
        setupUI()
        observeViewModel()
    }
    
    private fun setupUI() {
        // Symptoms input
        binding.symptomsInput.addTextChangedListener { text ->
            viewModel.updateSymptoms(text.toString())
        }
        
        // Severity selection
        binding.severityChipGroup.setOnCheckedStateChangeListener { group, checkedIds ->
            if (checkedIds.isNotEmpty()) {
                val chip = group.findViewById<Chip>(checkedIds[0])
                viewModel.updateSeverity(chip.text.toString())
            }
        }
        
        // Duration selection
        binding.durationChipGroup.setOnCheckedStateChangeListener { group, checkedIds ->
            if (checkedIds.isNotEmpty()) {
                val chip = group.findViewById<Chip>(checkedIds[0])
                viewModel.updateDuration(chip.text.toString())
            }
        }
    }
    
    private fun observeViewModel() {
        viewModel.triageResult.observe(viewLifecycleOwner) { result ->
            result?.let {
                showTriageResult(it)
            }
        }
        
        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                // Show error message
            }
        }
    }
    
    private fun showTriageResult(result: com.example.healbridge.data.models.TriageResponse) {
        binding.triageResultCard.visibility = View.VISIBLE
        binding.recommendedSpecialty.text = result.specialty
        
        val urgencyText = when (result.urgency) {
            "IMMEDIATE" -> "Immediate attention required"
            "SCHEDULED" -> "Scheduled appointment recommended"
            "HOUSE_VISIT" -> "Home visit recommended"
            else -> "Consultation recommended"
        }
        binding.urgencyLevel.text = urgencyText
        
        val recommendationsText = result.recommendations.joinToString("\n") { "• $it" }
        binding.recommendations.text = recommendationsText
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}