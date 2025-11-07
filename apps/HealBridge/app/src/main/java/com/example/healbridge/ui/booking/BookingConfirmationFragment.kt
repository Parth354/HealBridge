package com.example.healbridge.ui.booking

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import com.example.healbridge.databinding.FragmentBookingConfirmationBinding
import com.example.healbridge.Home
import com.google.android.material.chip.Chip
import java.text.SimpleDateFormat
import java.util.*

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
        
        setupUI()
        observeViewModel()
        displayBookingSummary()
    }
    
    private fun setupUI() {
        // Visit type selection
        binding.visitTypeChipGroup.setOnCheckedStateChangeListener { group, checkedIds ->
            if (checkedIds.isNotEmpty()) {
                val chip = group.findViewById<Chip>(checkedIds[0])
                viewModel.visitType = when (chip.text.toString()) {
                    "Clinic Visit" -> "CLINIC"
                    "Home Visit" -> "HOUSE"
                    "Telemedicine" -> "TELE"
                    else -> "CLINIC"
                }
                updateFeeDisplay()
            }
        }
        
        // Notes input
        binding.notesInput.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus) {
                viewModel.notes = binding.notesInput.text.toString()
            }
        }
    }
    
    private fun observeViewModel() {
        viewModel.slotHold.observe(viewLifecycleOwner) { hold ->
            hold?.let {
                binding.holdExpiryText.text = "Hold expires in ${it.expiresInSeconds / 60} minutes"
                startCountdown(it.expiresInSeconds)
            }
        }
        
        viewModel.bookingConfirmation.observe(viewLifecycleOwner) { confirmation ->
            confirmation?.let {
                showBookingSuccess(it)
            }
        }
        
        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                binding.errorText.text = it
                binding.errorText.visibility = View.VISIBLE
            }
        }
        
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.confirmButton.isEnabled = !isLoading
            binding.loadingProgress.visibility = if (isLoading) View.VISIBLE else View.GONE
        }
    }
    
    private fun displayBookingSummary() {
        viewModel.selectedDoctor.value?.let { doctor ->
            binding.doctorName.text = "Dr. ${doctor.name}"
            binding.doctorSpecialty.text = doctor.specialty
            binding.clinicName.text = doctor.clinicName
            binding.clinicAddress.text = doctor.clinicAddress
        }
        
        viewModel.selectedSlot.value?.let { slot ->
            binding.appointmentTime.text = slot.time
        }
        
        viewModel.selectedDate.value?.let { date ->
            binding.appointmentDate.text = formatDate(date)
        }
        
        updateFeeDisplay()
    }
    
    private fun updateFeeDisplay() {
        val baseFee = viewModel.selectedDoctor.value?.consultationFee ?: 500.0
        val fee = when (viewModel.visitType) {
            "HOUSE" -> baseFee + 200 // Add home visit charge
            "TELE" -> baseFee - 100  // Discount for telemedicine
            else -> baseFee
        }
        binding.consultationFee.text = "₹${fee.toInt()}"
    }
    
    private fun startCountdown(seconds: Int) {
        // Simple countdown implementation
        var remainingSeconds = seconds
        val timer = object : Runnable {
            override fun run() {
                if (remainingSeconds > 0) {
                    val minutes = remainingSeconds / 60
                    val secs = remainingSeconds % 60
                    binding.holdExpiryText.text = "Hold expires in ${minutes}:${String.format("%02d", secs)}"
                    remainingSeconds--
                    binding.root.postDelayed(this, 1000)
                } else {
                    binding.holdExpiryText.text = "Hold expired. Please select a new slot."
                    binding.confirmButton.isEnabled = false
                }
            }
        }
        binding.root.post(timer)
    }
    
    private fun showBookingSuccess(confirmation: com.example.healbridge.data.models.BookingConfirmation) {
        binding.successCard.visibility = View.VISIBLE
        binding.bookingSummaryCard.visibility = View.GONE
        binding.confirmButton.visibility = View.GONE
        
        val appointmentId = confirmation.appointment.id
        binding.appointmentId.text = "Appointment ID: $appointmentId"
        
        // Generate appointment link
        val appointmentLink = "https://healbridge.app/appointment/$appointmentId"
        binding.appointmentLink.text = appointmentLink
        
        // Share appointment link
        binding.shareButton.setOnClickListener {
            shareAppointmentLink(appointmentLink, appointmentId)
        }
        
        // Copy link to clipboard
        binding.copyLinkButton.setOnClickListener {
            copyToClipboard(appointmentLink)
        }
        
        binding.goHomeButton.setOnClickListener {
            startActivity(Intent(requireContext(), Home::class.java))
            requireActivity().finish()
        }
    }
    
    private fun shareAppointmentLink(link: String, appointmentId: String) {
        val shareIntent = Intent().apply {
            action = Intent.ACTION_SEND
            putExtra(Intent.EXTRA_TEXT, "Your appointment is confirmed!\n\nAppointment ID: $appointmentId\nLink: $link")
            type = "text/plain"
        }
        startActivity(Intent.createChooser(shareIntent, "Share Appointment"))
    }
    
    private fun copyToClipboard(text: String) {
        val clipboard = requireContext().getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("Appointment Link", text)
        clipboard.setPrimaryClip(clip)
        
        // Show toast
        Toast.makeText(requireContext(), "Link copied to clipboard", Toast.LENGTH_SHORT).show()
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