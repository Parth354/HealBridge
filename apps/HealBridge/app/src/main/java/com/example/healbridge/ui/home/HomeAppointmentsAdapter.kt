package com.example.healbridge.ui.home

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.example.healbridge.data.models.Appointment
import com.example.healbridge.databinding.ItemAppointmentHomeBinding
import java.text.SimpleDateFormat
import java.util.*

class HomeAppointmentsAdapter(
    private val onItemClick: (Appointment) -> Unit
) : ListAdapter<Appointment, HomeAppointmentsAdapter.AppointmentViewHolder>(DiffCallback()) {
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): AppointmentViewHolder {
        val binding = ItemAppointmentHomeBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return AppointmentViewHolder(binding)
    }
    
    override fun onBindViewHolder(holder: AppointmentViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
    
    inner class AppointmentViewHolder(
        private val binding: ItemAppointmentHomeBinding
    ) : RecyclerView.ViewHolder(binding.root) {
        
        fun bind(appointment: Appointment) {
            binding.apply {
                doctorName.text = appointment.doctorName
                specialty.text = appointment.specialty
                
                // Format date and time
                val dateTime = formatDateTime(appointment.appointmentDate, appointment.appointmentTime)
                appointmentDate.text = dateTime
                
                // Set status badge
                statusBadge.text = when (appointment.status) {
                    "scheduled" -> "Scheduled"
                    "confirmed" -> "Confirmed"
                    "completed" -> "Completed"
                    "cancelled" -> "Cancelled"
                    else -> appointment.status.replaceFirstChar { it.uppercase() }
                }
                
                root.setOnClickListener {
                    onItemClick(appointment)
                }
            }
        }
        
        private fun formatDateTime(date: String, time: String): String {
            return try {
                // Assuming date format is YYYY-MM-DD and time is HH:mm
                val inputFormat = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())
                val outputFormat = SimpleDateFormat("MMM dd, h:mm a", Locale.getDefault())
                val dateTime = inputFormat.parse("$date $time") ?: Date()
                
                val calendar = Calendar.getInstance()
                val today = Calendar.getInstance()
                calendar.time = dateTime ?: Date()
                
                when {
                    isSameDay(calendar, today) -> "Today, ${SimpleDateFormat("h:mm a", Locale.getDefault()).format(dateTime)}"
                    isTomorrow(calendar, today) -> "Tomorrow, ${SimpleDateFormat("h:mm a", Locale.getDefault()).format(dateTime)}"
                    else -> outputFormat.format(dateTime)
                }
            } catch (e: Exception) {
                "$date $time"
            }
        }
        
        private fun isSameDay(cal1: Calendar, cal2: Calendar): Boolean {
            return cal1.get(Calendar.YEAR) == cal2.get(Calendar.YEAR) &&
                    cal1.get(Calendar.DAY_OF_YEAR) == cal2.get(Calendar.DAY_OF_YEAR)
        }
        
        private fun isTomorrow(cal1: Calendar, cal2: Calendar): Boolean {
            cal2.add(Calendar.DAY_OF_YEAR, 1)
            val isTomorrow = isSameDay(cal1, cal2)
            cal2.add(Calendar.DAY_OF_YEAR, -1) // Reset
            return isTomorrow
        }
    }
    
    class DiffCallback : DiffUtil.ItemCallback<Appointment>() {
        override fun areItemsTheSame(oldItem: Appointment, newItem: Appointment): Boolean {
            return oldItem.id == newItem.id
        }
        
        override fun areContentsTheSame(oldItem: Appointment, newItem: Appointment): Boolean {
            return oldItem == newItem
        }
    }
}