package com.example.healbridge.ui.records

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.healbridge.api.SupabaseClient
import com.example.healbridge.databinding.ActivityPatientSummaryChatBinding
import com.example.healbridge.SecurePreferences
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.launch

class PatientSummaryChatActivity : AppCompatActivity() {
    private lateinit var binding: ActivityPatientSummaryChatBinding
    private lateinit var supabaseClient: SupabaseClient
    private lateinit var chatAdapter: ChatMessageAdapter
    private val chatMessages = mutableListOf<ChatMessage>()
    private var patientId: String? = null
    private var currentSummary: com.example.healbridge.api.PatientSummary? = null
    private var pdfUrl: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPatientSummaryChatBinding.inflate(layoutInflater)
        setContentView(binding.root)

        supabaseClient = SupabaseClient()
        patientId = SecurePreferences.getUserId(this) ?: FirebaseAuth.getInstance().currentUser?.uid

        setupToolbar()
        setupRecyclerView()
        setupInput()
        loadInitialSummary()
    }

    private fun setupToolbar() {
        setSupportActionBar(binding.toolbarMain)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Patient Summary Chat"
        binding.toolbarMain.setNavigationOnClickListener {
            finish()
        }
    }

    private fun setupRecyclerView() {
        chatAdapter = ChatMessageAdapter(chatMessages)
        binding.recyclerViewChat.apply {
            layoutManager = LinearLayoutManager(this@PatientSummaryChatActivity).apply {
                stackFromEnd = true
            }
            adapter = chatAdapter
        }
    }

    private fun setupInput() {
        binding.btnSend.setOnClickListener {
            sendMessage()
        }

        binding.etMessage.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                binding.btnSend.isEnabled = !s.isNullOrBlank()
            }
        })

        binding.btnSend.isEnabled = false
    }

    private fun loadInitialSummary() {
        if (patientId == null) {
            Toast.makeText(this, "User not authenticated", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        binding.progressBar.visibility = View.VISIBLE
        binding.inputLayout.visibility = View.GONE

        lifecycleScope.launch {
            val result = supabaseClient.getPatientSummary(patientId!!, null)

            result.fold(
                onSuccess = { response ->
                    if (response.success && response.summary != null) {
                        currentSummary = response.summary
                        pdfUrl = response.pdfUrl
                        
                        // Add welcome message with summary
                        addWelcomeMessage(response.summary, response.pdfUrl)
                    } else {
                        addMessage(ChatMessage(
                            text = "No summary available at this time.",
                            isUser = false,
                            timestamp = System.currentTimeMillis()
                        ))
                    }
                    binding.progressBar.visibility = View.GONE
                    binding.inputLayout.visibility = View.VISIBLE
                },
                onFailure = { error ->
                    addMessage(ChatMessage(
                        text = "Error loading summary: ${error.message}",
                        isUser = false,
                        timestamp = System.currentTimeMillis()
                    ))
                    binding.progressBar.visibility = View.GONE
                    binding.inputLayout.visibility = View.VISIBLE
                }
            )
        }
    }

    private fun addWelcomeMessage(summary: com.example.healbridge.api.PatientSummary, pdfUrl: String?) {
        val welcomeText = buildString {
            append("Here's your patient summary:\n\n")
            append("Patient Information\n")
            append("Name: ${summary.patient.name}\n")
            append("Age: ${summary.patient.age}\n")
            append("Gender: ${summary.patient.gender}\n\n")
            
            if (summary.medicalInfo.chronicConditions.isNotEmpty()) {
                append("Chronic Conditions:\n")
                summary.medicalInfo.chronicConditions.forEach { append("• $it\n") }
                append("\n")
            }
            
            if (summary.medicalInfo.allergies.isNotEmpty()) {
                append("Allergies:\n")
                summary.medicalInfo.allergies.forEach { append("• $it\n") }
                append("\n")
            }
            
            if (summary.currentMedications.isNotEmpty()) {
                append("Current Medications:\n")
                summary.currentMedications.take(5).forEach { 
                    append("• ${it.name} ${it.strength} (${it.form}) - ${it.frequency}\n") 
                }
                if (summary.currentMedications.size > 5) {
                    append("... and ${summary.currentMedications.size - 5} more\n")
                }
                append("\n")
            }
            
            append("Documents: ${summary.documentsSummary.total} total ")
            append("(${summary.documentsSummary.prescriptions} prescriptions, ")
            append("${summary.documentsSummary.other} other)\n\n")
            
            append("You can ask me questions about your medical history, medications, or any other health-related information!")
        }

        addMessage(ChatMessage(
            text = welcomeText,
            isUser = false,
            timestamp = System.currentTimeMillis(),
            pdfUrl = pdfUrl
        ))
    }

    private fun sendMessage() {
        val messageText = binding.etMessage.text.toString().trim()
        if (messageText.isEmpty() || patientId == null) return

        // Add user message
        val userMessage = ChatMessage(
            text = messageText,
            isUser = true,
            timestamp = System.currentTimeMillis()
        )
        addMessage(userMessage)
        binding.etMessage.text?.clear()

        // Show loading
        val loadingMessage = ChatMessage(
            text = "Thinking...",
            isUser = false,
            timestamp = System.currentTimeMillis(),
            isLoading = true
        )
        val loadingIndex = addMessage(loadingMessage)

        // Send query to API
        lifecycleScope.launch {
            val result = supabaseClient.getPatientSummary(patientId!!, messageText)

            result.fold(
                onSuccess = { response ->
                    // Remove loading message
                    if (loadingIndex >= 0 && loadingIndex < chatMessages.size) {
                        chatMessages.removeAt(loadingIndex)
                        chatAdapter.notifyItemRemoved(loadingIndex)
                    }

                    if (response.success && response.summary != null) {
                        val answer = response.summary.ragAnswer
                        if (!answer.isNullOrBlank()) {
                            addMessage(ChatMessage(
                                text = answer,
                                isUser = false,
                                timestamp = System.currentTimeMillis(),
                                pdfUrl = response.pdfUrl
                            ))
                        } else {
                            addMessage(ChatMessage(
                                text = "I couldn't find a specific answer to your question. Please try rephrasing or ask about your medications, medical history, or recent visits.",
                                isUser = false,
                                timestamp = System.currentTimeMillis()
                            ))
                        }
                    } else {
                        addMessage(ChatMessage(
                            text = "Sorry, I couldn't process your question. Please try again.",
                            isUser = false,
                            timestamp = System.currentTimeMillis()
                        ))
                    }
                },
                onFailure = { error ->
                    // Remove loading message
                    if (loadingIndex >= 0 && loadingIndex < chatMessages.size) {
                        chatMessages.removeAt(loadingIndex)
                        chatAdapter.notifyItemRemoved(loadingIndex)
                    }

                    addMessage(ChatMessage(
                        text = "Error: ${error.message}. Please try again.",
                        isUser = false,
                        timestamp = System.currentTimeMillis()
                    ))
                }
            )
        }
    }

    private fun addMessage(message: ChatMessage): Int {
        chatMessages.add(message)
        val index = chatMessages.size - 1
        chatAdapter.notifyItemInserted(index)
        binding.recyclerViewChat.post {
            binding.recyclerViewChat.smoothScrollToPosition(index)
        }
        return index
    }

    fun openPdf(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(this, "Cannot open PDF: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }
}

data class ChatMessage(
    val text: String,
    val isUser: Boolean,
    val timestamp: Long,
    val isLoading: Boolean = false,
    val pdfUrl: String? = null
)

