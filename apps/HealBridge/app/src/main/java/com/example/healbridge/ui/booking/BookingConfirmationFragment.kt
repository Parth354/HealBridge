package com.example.healbridge.ui.booking

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import com.example.healbridge.databinding.FragmentBookingConfirmationBinding

class BookingConfirmationFragment : Fragment() {
    
    private var _binding: FragmentBookingConfirmationBinding? = null
    private val binding get() = _binding!!
    
    private lateinit var viewModel: BookingViewModel
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentBookingConfirmationBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        viewModel = ViewModelProvider(requireActivity())[BookingViewModel::class.java]
        
        // TODO: Implement booking confirmation UI
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}