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
import androidx.lifecycle.lifecycleScope
import com.example.healbridge.databinding.FragmentBookingConfirmationBinding
import com.example.healbridge.Home
import com.example.healbridge.SecurePreferences
import com.google.android.material.chip.Chip
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.launch
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
                // Show/hide address input based on visit type
                binding.addressInputLayout.visibility = 
                    if (viewModel.visitType == "HOUSE") View.VISIBLE else View.GONE
                updateFeeDisplay()
            }
        }
        
        // Address input (for home visits)
        binding.addressInput.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus) {
                val address = binding.addressInput.text.toString().trim()
                viewModel.setHouseVisitAddress(if (address.isNotEmpty()) address else null)
            }
        }
        
        // Load user address from profile if available
        loadUserAddress()
        
        // Notes input
        binding.notesInput.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus) {
                viewModel.notes = binding.notesInput.text.toString()
            }
        }
        
        // Confirm button click
        binding.confirmButton.setOnClickListener {
            // Validate address for HOUSE visits before confirming
            if (viewModel.visitType == "HOUSE") {
                val address = binding.addressInput.text.toString().trim()
                if (address.isEmpty()) {
                    binding.errorText.text = "Please provide an address for home visit."
                    binding.errorText.visibility = View.VISIBLE
                    return@setOnClickListener
                }
                viewModel.setHouseVisitAddress(address)
            }
            viewModel.confirmBooking()
        }
    }
    
    private fun loadUserAddress() {
        // Try to load address from Firebase user profile
        // Use lifecycleScope instead of viewModelScope (viewModelScope is only in ViewModel)
        val uid = SecurePreferences.getUserId(requireContext()) 
            ?: FirebaseAuth.getInstance().currentUser?.uid
        
        if (uid != null) {
            FirebaseFirestore.getInstance()
                .collection("users")
                .document(uid)
                .get()
                .addOnSuccessListener { document ->
                    if (document.exists() && _binding != null) {
                        // Address is stored as a nested object in Firestore
                        val addressMap = document.get("address") as? Map<*, *>
                        
                        if (addressMap != null) {
                            val houseNo = addressMap["houseNo"] as? String
                            val locality = addressMap["locality"] as? String
                            val city = addressMap["city"] as? String
                            val state = addressMap["state"] as? String
                            val pinCode = addressMap["pinCode"] as? String
                            
                            // Build address string from components
                            val addressParts = mutableListOf<String>()
                            houseNo?.takeIf { it.isNotEmpty() }?.let { addressParts.add(it) }
                            locality?.takeIf { it.isNotEmpty() }?.let { addressParts.add(it) }
                            city?.takeIf { it.isNotEmpty() }?.let { addressParts.add(it) }
                            state?.takeIf { it.isNotEmpty() }?.let { addressParts.add(it) }
                            pinCode?.takeIf { it.isNotEmpty() }?.let { addressParts.add(it) }
                            
                            val fullAddress = addressParts.joinToString(", ")
                            
                            if (fullAddress.isNotEmpty() && _binding != null) {
                                binding.addressInput.setText(fullAddress)
                                viewModel.setHouseVisitAddress(fullAddress)
                            }
                        }
                    }
                }
                .addOnFailureListener {
                    // Silently fail - user can enter address manually
                    android.util.Log.d("BookingConfirmation", "Failed to load address: ${it.message}")
                }
        }
    }
    
    private fun observeViewModel() {
        viewModel.slotHold.observe(viewLifecycleOwner) { hold ->
            hold?.let {
                binding.holdExpiryText.text = "Hold expires in ${it.expiresInSeconds / 60} minutes"
                startCountdown(it)
            } ?: run {
                binding.holdExpiryText.visibility = View.GONE
            }
        }
        
        viewModel.bookingConfirmation.observe(viewLifecycleOwner) { confirmation ->
            confirmation?.let {
                showBookingSuccess(it)
            }
        }
        
        viewModel.error.observe(viewLifecycleOwner) { error ->
            if (error != null && error.isNotEmpty()) {
                binding.errorText.text = error
                binding.errorText.visibility = View.VISIBLE
                // Auto-hide error after 5 seconds
                binding.root.postDelayed({
                    binding.errorText.visibility = View.GONE
                }, 5000)
            } else {
                binding.errorText.visibility = View.GONE
            }
        }
        
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.confirmButton.isEnabled = !isLoading && viewModel.slotHold.value != null
            binding.loadingProgress.visibility = if (isLoading) View.VISIBLE else View.GONE
        }
        
        // Monitor visit type changes to show/hide address field
        // This is handled in setupUI, but we can also observe if needed
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
    
    private var countdownRunnable: Runnable? = null
    
    private fun startCountdown(hold: com.example.healbridge.data.models.SlotHold) {
        // Stop any existing countdown
        countdownRunnable?.let { binding.root.removeCallbacks(it) }
        
        // Parse expiration time
        val expiresAt = try {
            java.time.Instant.parse(hold.expiresAt).toEpochMilli()
        } catch (e: Exception) {
            binding.holdExpiryText.text = "Hold expires soon"
            return
        }
        
        countdownRunnable = object : Runnable {
            override fun run() {
                val now = System.currentTimeMillis()
                val remaining = (expiresAt - now) / 1000
                
                if (remaining > 0) {
                    val minutes = remaining / 60
                    val secs = remaining % 60
                    binding.holdExpiryText.text = "Hold expires in ${minutes}:${String.format("%02d", secs)}"
                    
                    // Change color if less than 1 minute remaining
                    if (remaining < 60) {
                        binding.holdExpiryText.setTextColor(
                            requireContext().getColor(android.R.color.holo_red_dark)
                        )
                    }
                    
                    // Check if hold needs refresh (less than 30 seconds)
                    if (remaining < 30) {
                        viewModel.refreshSlotHoldIfNeeded()
                    }
                    
                    binding.root.postDelayed(this, 1000)
                } else {
                    // Hold expired
                    binding.holdExpiryText.text = "Hold expired. Please select a new slot."
                    binding.holdExpiryText.setTextColor(
                        requireContext().getColor(android.R.color.holo_red_dark)
                    )
                    binding.confirmButton.isEnabled = false
                    binding.errorText.text = "Slot hold has expired. Please go back and select a new time slot."
                    binding.errorText.visibility = View.VISIBLE
                    
                    // Refresh slots automatically
                    viewModel.refreshSlotHoldIfNeeded()
                }
            }
        }
        binding.root.post(countdownRunnable!!)
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        countdownRunnable?.let { binding.root.removeCallbacks(it) }
        _binding = null
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
    
}