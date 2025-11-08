package com.example.healbridge.ui.booking

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.GridLayoutManager
import com.example.healbridge.databinding.FragmentTimeSlotBinding
import com.example.healbridge.data.models.TimeSlot
import com.google.android.material.datepicker.MaterialDatePicker
import java.text.SimpleDateFormat
import java.util.*

class TimeSlotFragment : Fragment() {
    
    private var _binding: FragmentTimeSlotBinding? = null
    private val binding get() = _binding!!
    
    private lateinit var viewModel: BookingViewModel
    private lateinit var slotsAdapter: TimeSlotsAdapter
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentTimeSlotBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        viewModel = ViewModelProvider(requireActivity())[BookingViewModel::class.java]
        
        setupUI()
        setupRecyclerView()
        observeViewModel()
        
        // Set default date to today
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        viewModel.selectDate(today)
        binding.selectedDate.text = formatDate(today)
    }
    
    override fun onResume() {
        super.onResume()
        // Refresh slots when fragment becomes visible (uses cache if available)
        viewModel.selectedDoctor.value?.let { doctor ->
            viewModel.selectedDate.value?.let { date ->
                // Trigger slot refresh by selecting date again (will use cache if valid)
                viewModel.selectDate(date, forceRefresh = false)
            } ?: run {
                // If no date selected, set today's date
                val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                viewModel.selectDate(today)
            }
        }
    }
    
    private fun setupUI() {
        binding.selectDateButton.setOnClickListener {
            showDatePicker()
        }
    }
    
    private fun setupRecyclerView() {
        slotsAdapter = TimeSlotsAdapter { slot ->
            viewModel.selectTimeSlot(slot)
        }
        
        binding.slotsRecyclerView.apply {
            layoutManager = GridLayoutManager(context, 3)
            adapter = slotsAdapter
        }
    }
    
    private fun observeViewModel() {
        viewModel.selectedDoctor.observe(viewLifecycleOwner) { doctor ->
            doctor?.let {
                binding.doctorName.text = it.name
                binding.doctorSpecialty.text = it.specialty
                
                // When doctor is selected, load slots for current date
                val currentDate = viewModel.selectedDate.value
                if (currentDate != null) {
                    viewModel.selectDate(currentDate, forceRefresh = false)
                } else {
                    // Set today's date if no date selected
                    val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                    viewModel.selectDate(today)
                }
            } ?: run {
                // No doctor selected - show message
                binding.doctorName.text = "No doctor selected"
                binding.doctorSpecialty.text = "Please go back and select a doctor"
            }
        }
        
        viewModel.availableSlots.observe(viewLifecycleOwner) { slots ->
            slotsAdapter.submitList(slots)
            
            if (slots.isEmpty()) {
                binding.emptyState.visibility = View.VISIBLE
                binding.slotsRecyclerView.visibility = View.GONE
            } else {
                binding.emptyState.visibility = View.GONE
                binding.slotsRecyclerView.visibility = View.VISIBLE
            }
        }
        
        viewModel.selectedSlot.observe(viewLifecycleOwner) { slot ->
            slot?.let {
                slotsAdapter.setSelectedSlot(it)
            }
        }
        
        viewModel.selectedDate.observe(viewLifecycleOwner) { date ->
            date?.let {
                binding.selectedDate.text = formatDate(it)
            }
        }
        
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.loadingProgress.visibility = if (isLoading) View.VISIBLE else View.GONE
        }
        
        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                android.util.Log.e("TimeSlotFragment", "Error: $it")
                // Error is already displayed through the ViewModel's error LiveData
                // Could show a snackbar or toast here if needed
            }
        }
    }
    
    private fun showDatePicker() {
        val datePicker = MaterialDatePicker.Builder.datePicker()
            .setTitleText("Select appointment date")
            .setSelection(MaterialDatePicker.todayInUtcMilliseconds())
            .build()
        
        datePicker.addOnPositiveButtonClickListener { selection ->
            val date = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date(selection))
            viewModel.selectDate(date)
        }
        
        datePicker.show(parentFragmentManager, "DATE_PICKER")
    }
    
    private fun formatDate(dateString: String): String {
        return try {
            val inputFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val outputFormat = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
            val date = inputFormat.parse(dateString)
            outputFormat.format(date!!)
        } catch (e: Exception) {
            dateString
        }
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}