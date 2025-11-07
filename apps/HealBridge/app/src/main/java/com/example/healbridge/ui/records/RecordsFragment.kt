package com.example.healbridge.ui.records

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.healbridge.api.SupabaseClient
import com.example.healbridge.databinding.FragmentRecordsBinding
import com.example.healbridge.getUserId
import kotlinx.coroutines.launch

class RecordsFragment : Fragment() {
    private var _binding: FragmentRecordsBinding? = null
    private val binding get() = _binding!!
    private lateinit var recordsAdapter: RecordsAdapter
    private lateinit var supabaseClient: SupabaseClient
    private val records = mutableListOf<MedicalRecord>()
    private var isUploading = false
    
    private val documentPicker = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            result.data?.data?.let { uri ->
                uploadDocument(uri)
            }
        }
    }
    
    private val cameraPicker = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            result.data?.extras?.get("data")?.let { bitmap ->
                Toast.makeText(context, "Camera capture not implemented yet", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentRecordsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        supabaseClient = SupabaseClient()
        setupRecyclerView()
        setupClickListeners()
        setupSearch()
        loadRecords()
    }
    
    private fun setupRecyclerView() {
        recordsAdapter = RecordsAdapter(records) { record ->
            showRecordDetails(record)
        }
        binding.rvRecords.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = recordsAdapter
        }
    }
    
    private fun setupClickListeners() {
        binding.btnUpload.setOnClickListener {
            showUploadOptions()
        }
        
        binding.btnSummary.setOnClickListener {
            showPatientSummary()
        }
    }
    
    private fun setupSearch() {
        binding.etSearchRecords.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                filterRecords(s.toString())
            }
        })
    }
    
    private fun showUploadOptions() {
        val options = arrayOf("Choose PDF", "Take Photo", "Choose Photo")
        androidx.appcompat.app.AlertDialog.Builder(requireContext())
            .setTitle("Upload Document")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> openDocumentPicker()
                    1 -> openCamera()
                    2 -> openImagePicker()
                }
            }
            .show()
    }
    
    private fun openDocumentPicker() {
        val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "application/pdf"
        }
        documentPicker.launch(intent)
    }
    
    private fun openCamera() {
        val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        cameraPicker.launch(intent)
    }
    
    private fun openImagePicker() {
        val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "image/*"
        }
        documentPicker.launch(intent)
    }
    
    private fun uploadDocument(uri: Uri) {
        if (isUploading) return
        
        val uid = getUserId(requireContext())
        if (uid == null) {
            Toast.makeText(context, "User not authenticated", Toast.LENGTH_SHORT).show()
            return
        }
        
        isUploading = true
        binding.btnUpload.text = "Uploading..."
        binding.btnUpload.isEnabled = false
        
        lifecycleScope.launch {
            val result = supabaseClient.uploadDocument(
                context = requireContext(),
                fileUri = uri,
                type = "prescription",
                patientId = uid
            )
            
            result.fold(
                onSuccess = { response ->
                    if (response.success) {
                        Toast.makeText(context, "Document uploaded successfully!", Toast.LENGTH_SHORT).show()
                        loadRecords()
                    } else {
                        Toast.makeText(context, "Upload failed: ${response.ocrError}", Toast.LENGTH_LONG).show()
                    }
                },
                onFailure = { error ->
                    Toast.makeText(context, "Upload error: ${error.message}", Toast.LENGTH_LONG).show()
                }
            )
            
            resetUploadButton()
        }
    }
    
    private fun resetUploadButton() {
        isUploading = false
        binding.btnUpload.text = "Upload Prescription / Lab (PDF / Photo)"
        binding.btnUpload.isEnabled = true
    }
    
    private fun loadRecords() {
        val uid = getUserId(requireContext())
        if (uid != null) {
            lifecycleScope.launch {
                val result = supabaseClient.getPatientSummary(uid)
                
                result.fold(
                    onSuccess = { response ->
                        if (response.success && response.summary != null) {
                            val medRecords = mutableListOf<MedicalRecord>()
                            
                            // Add current medications as records
                            response.summary.currentMedications.forEachIndexed { index, med ->
                                medRecords.add(
                                    MedicalRecord(
                                        id = "med_$index",
                                        title = med.name,
                                        type = "Current Medication",
                                        date = "Ongoing",
                                        description = "${med.strength} - ${med.frequency}"
                                    )
                                )
                            }
                            
                            // Add visit history as records
                            response.summary.visitHistory.forEachIndexed { index, visit ->
                                medRecords.add(
                                    MedicalRecord(
                                        id = "visit_$index",
                                        title = "${visit.type} - ${visit.clinic}",
                                        type = "Visit",
                                        date = visit.date,
                                        description = "Prescriptions: ${visit.prescriptionsCount}"
                                    )
                                )
                            }
                            
                            records.clear()
                            records.addAll(medRecords)
                            recordsAdapter.notifyDataSetChanged()
                        } else {
                            showSampleData()
                        }
                    },
                    onFailure = { error ->
                        Toast.makeText(context, "Error loading records: ${error.message}", Toast.LENGTH_SHORT).show()
                        showSampleData()
                    }
                )
            }
        }
    }
    
    private fun showSampleData() {
        val sampleRecords = listOf(
            MedicalRecord("1", "Blood Test Report", "Lab Report", "2024-01-15", "HbA1c: 6.2%"),
            MedicalRecord("2", "X-Ray Chest", "Imaging", "2024-01-10", "Normal chest X-ray"),
            MedicalRecord("3", "Prescription", "Medication", "2024-01-08", "Metformin 500mg")
        )
        records.clear()
        records.addAll(sampleRecords)
        recordsAdapter.notifyDataSetChanged()
        updateStatistics()
        updateEmptyState()
    }
    
    private fun updateStatistics() {
        if (_binding != null) {
            binding.tvTotalRecords.text = records.size.toString()
            binding.tvRecentUploads.text = "1" // Sample data
        }
    }
    
    private fun updateEmptyState() {
        if (_binding != null) {
            if (records.isEmpty()) {
                binding.layoutEmptyState.visibility = View.VISIBLE
                binding.rvRecords.visibility = View.GONE
            } else {
                binding.layoutEmptyState.visibility = View.GONE
                binding.rvRecords.visibility = View.VISIBLE
            }
        }
    }
    
    private fun showRecordDetails(record: MedicalRecord) {
        androidx.appcompat.app.AlertDialog.Builder(requireContext())
            .setTitle(record.title)
            .setMessage("Type: ${record.type}\nDate: ${record.date}\nDescription: ${record.description}")
            .setPositiveButton("OK", null)
            .show()
    }
    
    private fun showPatientSummary() {
        val uid = getUserId(requireContext())
        if (uid == null) {
            Toast.makeText(context, "User not authenticated", Toast.LENGTH_SHORT).show()
            return
        }
        
        lifecycleScope.launch {
            val result = supabaseClient.getPatientSummary(uid, "Generate complete medical summary")
            
            result.fold(
                onSuccess = { response ->
                    if (response.success && response.summary != null) {
                        showSummaryDialog(response.summary)
                    } else {
                        Toast.makeText(context, "No summary available", Toast.LENGTH_SHORT).show()
                    }
                },
                onFailure = { error ->
                    Toast.makeText(context, "Error loading summary: ${error.message}", Toast.LENGTH_SHORT).show()
                }
            )
        }
    }
    
    private fun showSummaryDialog(summary: com.example.healbridge.api.PatientSummary) {
        val summaryText = buildString {
            append("Patient: ${summary.patient.name}\n")
            append("Age: ${summary.patient.age}, Gender: ${summary.patient.gender}\n\n")
            
            append("Medical Conditions:\n")
            summary.medicalInfo.chronicConditions.forEach { append("• $it\n") }
            
            append("\nAllergies:\n")
            summary.medicalInfo.allergies.forEach { append("• $it\n") }
            
            append("\nCurrent Medications:\n")
            summary.currentMedications.forEach { 
                append("• ${it.name} ${it.strength} - ${it.frequency}\n") 
            }
            
            append("\nDocuments: ${summary.documentsSummary.total} total")
            append(" (${summary.documentsSummary.prescriptions} prescriptions, ")
            append("${summary.documentsSummary.labReports} lab reports)\n")
            
            summary.ragAnswer?.let {
                append("\nAI Summary:\n$it")
            }
        }
        
        androidx.appcompat.app.AlertDialog.Builder(requireContext())
            .setTitle("Medical Summary")
            .setMessage(summaryText)
            .setPositiveButton("OK", null)
            .show()
    }
    
    private fun filterRecords(query: String) {
        val filteredRecords = if (query.isEmpty()) {
            records
        } else {
            records.filter { 
                it.title.contains(query, ignoreCase = true) || 
                it.description.contains(query, ignoreCase = true)
            }
        }
        recordsAdapter.updateRecords(filteredRecords)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}