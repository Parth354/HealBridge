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
import androidx.recyclerview.widget.RecyclerView
import com.example.healbridge.api.SupabaseClient
import com.example.healbridge.databinding.FragmentRecordsBinding
import com.example.healbridge.SecurePreferences
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.launch

class RecordsFragment : Fragment() {
    private var _binding: FragmentRecordsBinding? = null
    private val binding get() = _binding!!
    private lateinit var recordsAdapter: RecordsAdapter
    private lateinit var supabaseClient: SupabaseClient
    private val records = mutableListOf<MedicalRecord>()
    private var isUploading = false
    private var currentPage = 1
    private var isLoading = false
    private var hasMorePages = true
    
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
        val layoutManager = LinearLayoutManager(context)
        binding.rvRecords.apply {
            this.layoutManager = layoutManager
            adapter = recordsAdapter
            
            addOnScrollListener(object : RecyclerView.OnScrollListener() {
                override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
                    super.onScrolled(recyclerView, dx, dy)
                    
                    val visibleItemCount = layoutManager.childCount
                    val totalItemCount = layoutManager.itemCount
                    val firstVisibleItemPosition = layoutManager.findFirstVisibleItemPosition()
                    
                    if (!isLoading && hasMorePages) {
                        if ((visibleItemCount + firstVisibleItemPosition) >= totalItemCount - 2) {
                            loadMoreRecords()
                        }
                    }
                }
            })
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
        
        val uid = SecurePreferences.getUserId(requireContext()) ?: FirebaseAuth.getInstance().currentUser?.uid
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
                        currentPage = 1
                        hasMorePages = true
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
        val uid = SecurePreferences.getUserId(requireContext()) ?: FirebaseAuth.getInstance().currentUser?.uid
        if (uid == null) {
            android.util.Log.e("RecordsFragment", "User ID is null, cannot load documents")
            Toast.makeText(context, "User not authenticated", Toast.LENGTH_SHORT).show()
            return
        }
        
        if (isLoading) {
            android.util.Log.d("RecordsFragment", "Already loading, skipping...")
            return
        }
        
        android.util.Log.d("RecordsFragment", "Loading documents for user: $uid, page: $currentPage")
        isLoading = true
        
        lifecycleScope.launch {
            try {
                val result = supabaseClient.getDocuments(uid, currentPage, 10)
                
                result.fold(
                    onSuccess = { response ->
                        android.util.Log.d("RecordsFragment", "Documents loaded: success=${response.success}, count=${response.documents.size}, total=${response.totalCount}")
                        
                        if (response.success) {
                            val medRecords = response.documents.map { doc ->
                                MedicalRecord(
                                    id = doc.id,
                                    title = getDocumentTitle(doc),
                                    type = doc.type.replaceFirstChar { it.uppercaseChar() },
                                    date = formatDate(doc.createdAt),
                                    description = getDocumentDescription(doc),
                                    fileUrl = doc.fileUrl,
                                    extractedText = doc.text
                                )
                            }
                            
                            if (currentPage == 1) {
                                records.clear()
                            }
                            records.addAll(medRecords)
                            recordsAdapter.notifyDataSetChanged()
                            
                            hasMorePages = currentPage < response.totalPages
                            updateStatistics(response.totalCount)
                            
                            android.util.Log.d("RecordsFragment", "Updated UI: ${records.size} records displayed, hasMorePages=$hasMorePages")
                        } else {
                            android.util.Log.w("RecordsFragment", "Response indicates failure but no error message")
                            if (response.documents.isEmpty()) {
                                Toast.makeText(context, "No documents found", Toast.LENGTH_SHORT).show()
                            }
                        }
                        updateEmptyState()
                    },
                        onFailure = { error ->
                            android.util.Log.e("RecordsFragment", "Error loading documents: ${error.message}", error)
                            android.util.Log.e("RecordsFragment", "Error type: ${error.javaClass.simpleName}")
                            android.util.Log.e("RecordsFragment", "Stack trace: ${error.stackTraceToString()}")
                            // Check if fragment is still attached before showing Toast
                            if (isAdded && context != null) {
                                Toast.makeText(context, "Error loading documents: ${error.message}", Toast.LENGTH_LONG).show()
                            }
                            updateEmptyState()
                        }
                )
            } catch (e: Exception) {
                android.util.Log.e("RecordsFragment", "Exception in loadRecords: ${e.message}", e)
                // Check if fragment is still attached before showing Toast
                if (isAdded && context != null) {
                    Toast.makeText(context, "Failed to load documents: ${e.message}", Toast.LENGTH_LONG).show()
                }
            } finally {
                isLoading = false
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
    
    private fun updateStatistics(totalCount: Int = records.size) {
        if (_binding != null) {
            binding.tvTotalRecords.text = totalCount.toString()
            binding.tvRecentUploads.text = records.count { 
                val today = java.time.LocalDate.now().toString()
                it.date == today
            }.toString()
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
        val message = buildString {
            append("📄 ${record.title}\n\n")
            append("Type: ${record.type}\n")
            append("Date: ${record.date}\n\n")
            append("Details:\n${record.description}\n")
            
            record.extractedText?.let { text ->
                if (text.isNotBlank()) {
                    append("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
                    append("Extracted Text:\n")
                    append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n")
                    // Format text better - limit length and add line breaks
                    val formattedText = text.take(1000)
                        .replace("\\n", "\n")
                        .replace("  ", " ")
                    append(formattedText)
                    if (text.length > 1000) {
                        append("\n\n... (text truncated, view full file for complete content)")
                    }
                }
            }
        }
        
        val dialog = androidx.appcompat.app.AlertDialog.Builder(requireContext())
            .setTitle(record.title)
            .setMessage(message)
            .setPositiveButton("OK", null)
        
        record.fileUrl?.let { url ->
            dialog.setNeutralButton("View Full File") { _, _ ->
                openDocument(url)
            }
        }
        
        dialog.show()
    }
    
    private fun showPatientSummary() {
        val intent = android.content.Intent(requireContext(), PatientSummaryChatActivity::class.java)
        startActivity(intent)
    }
    
    private fun filterRecords(query: String) {
        val filteredRecords = if (query.isEmpty()) {
            records
        } else {
            records.filter { 
                it.title.contains(query, ignoreCase = true) || 
                it.description.contains(query, ignoreCase = true) ||
                it.extractedText?.contains(query, ignoreCase = true) == true
            }
        }
        recordsAdapter.updateRecords(filteredRecords)
    }
    
    private fun getDocumentTitle(doc: com.example.healbridge.api.Document): String {
        // Try to extract meaningful title from file name or text
        val fileName = doc.fileUrl?.substringAfterLast("/")?.substringBefore("?") ?: ""
        return when {
            fileName.contains("prescription", ignoreCase = true) -> "Prescription - ${formatDate(doc.createdAt)}"
            fileName.contains("lab", ignoreCase = true) || fileName.contains("report", ignoreCase = true) -> "Lab Report - ${formatDate(doc.createdAt)}"
            doc.type == "prescription" -> "Prescription - ${formatDate(doc.createdAt)}"
            doc.type == "image" -> "Medical Document - ${formatDate(doc.createdAt)}"
            doc.type == "pdf" -> "PDF Document - ${formatDate(doc.createdAt)}"
            fileName.isNotEmpty() -> fileName.substringBeforeLast(".").replace("_", " ").replace("-", " ")
            else -> "Medical Document - ${formatDate(doc.createdAt)}"
        }
    }
    
    private fun getDocumentDescription(doc: com.example.healbridge.api.Document): String {
        val description = buildString {
            // Add type information
            append("Type: ${doc.type.replaceFirstChar { it.uppercaseChar() }}\n")
            
            // Add OCR confidence
            val confidence = (doc.ocrConfidence * 100).toInt()
            append("OCR Confidence: $confidence%\n")
            
            // Add text preview if available
            if (!doc.text.isNullOrBlank()) {
                val preview = doc.text.take(100).replace("\n", " ")
                append("Preview: $preview${if (doc.text.length > 100) "..." else ""}")
            } else {
                append("No text extracted")
            }
        }
        return description
    }
    
    private fun formatDate(dateString: String): String {
        return try {
            val instant = java.time.Instant.parse(dateString)
            val date = java.time.LocalDate.ofInstant(instant, java.time.ZoneId.systemDefault())
            val formatter = java.time.format.DateTimeFormatter.ofPattern("MMM dd, yyyy")
            date.format(formatter)
        } catch (e: Exception) {
            try {
                // Try parsing just the date part
                dateString.substring(0, 10).let { datePart ->
                    java.time.LocalDate.parse(datePart).format(
                        java.time.format.DateTimeFormatter.ofPattern("MMM dd, yyyy")
                    )
                }
            } catch (e2: Exception) {
                dateString.substring(0, minOf(10, dateString.length))
            }
        }
    }
    
    private fun loadMoreRecords() {
        if (hasMorePages && !isLoading) {
            currentPage++
            loadRecords()
        }
    }
    
    private fun openDocument(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(context, "Cannot open document: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}