package com.example.healbridge.ui.records

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.healbridge.R
import com.google.android.material.button.MaterialButton

class ChatMessageAdapter(private val messages: List<ChatMessage>) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {
    
    companion object {
        private const val VIEW_TYPE_USER = 1
        private const val VIEW_TYPE_BOT = 2
    }

    override fun getItemViewType(position: Int): Int {
        return if (messages[position].isUser) VIEW_TYPE_USER else VIEW_TYPE_BOT
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return when (viewType) {
            VIEW_TYPE_USER -> {
                val view = LayoutInflater.from(parent.context)
                    .inflate(R.layout.item_chat_message_user, parent, false)
                UserMessageViewHolder(view)
            }
            else -> {
                val view = LayoutInflater.from(parent.context)
                    .inflate(R.layout.item_chat_message_bot, parent, false)
                BotMessageViewHolder(view)
            }
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val message = messages[position]
        when (holder) {
            is UserMessageViewHolder -> holder.bind(message)
            is BotMessageViewHolder -> holder.bind(message)
        }
    }

    override fun getItemCount() = messages.size

    inner class UserMessageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val messageText: TextView = itemView.findViewById(R.id.tv_message)

        fun bind(message: ChatMessage) {
            messageText.text = message.text
        }
    }

    inner class BotMessageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val messageText: TextView = itemView.findViewById(R.id.tv_message)
        private val loadingIndicator: View = itemView.findViewById(R.id.progress_loading)
        private val btnViewPdf: MaterialButton? = itemView.findViewById(R.id.btn_view_pdf)

        fun bind(message: ChatMessage) {
            messageText.text = message.text
            messageText.visibility = if (message.isLoading) View.GONE else View.VISIBLE
            loadingIndicator.visibility = if (message.isLoading) View.VISIBLE else View.GONE

            btnViewPdf?.let { btn ->
                if (message.pdfUrl != null && !message.isLoading) {
                    btn.visibility = View.VISIBLE
                    btn.setOnClickListener {
                        (itemView.context as? PatientSummaryChatActivity)?.openPdf(message.pdfUrl)
                    }
                } else {
                    btn.visibility = View.GONE
                }
            }
        }
    }
}

