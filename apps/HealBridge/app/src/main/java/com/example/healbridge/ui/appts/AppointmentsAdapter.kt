package com.example.healbridge.ui.appts

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.example.healbridge.data.models.Appointment
import com.example.healbridge.databinding.ItemAppointmentBinding

class AppointmentsAdapter(
    private var appointments: List<Appointment>,
    private val onAppointmentClick: (Appointment) -> Unit
) : RecyclerView.Adapter<AppointmentsAdapter.AppointmentViewHolder>() {

    fun updateAppointments(newAppointments: List<Appointment>) {
        appointments = newAppointments
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): AppointmentViewHolder {
        val binding = ItemAppointmentBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return AppointmentViewHolder(binding)
    }

    override fun onBindViewHolder(holder: AppointmentViewHolder, position: Int) {
        holder.bind(appointments[position])
    }

    override fun getItemCount() = appointments.size

    inner class AppointmentViewHolder(private val binding: ItemAppointmentBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(appointment: Appointment) {
            binding.tvDoctorName.text = appointment.doctorName
            binding.tvSpecialty.text = appointment.specialty
            binding.tvAppointmentDate.text = formatDate(appointment.appointmentDate)
            binding.tvAppointmentTime.text = formatTime(appointment.appointmentTime)
            binding.tvClinicName.text = appointment.clinicName ?: appointment.clinicAddress ?: "Clinic"
            binding.tvStatus.text = appointment.status.replace("_", " ").lowercase().replaceFirstChar { it.uppercaseChar() }
            
            // Set status color based on status
            val statusColor = when (appointment.status) {
                "CONFIRMED" -> binding.root.context.getColor(com.example.healbridge.R.color.success)
                "PENDING" -> binding.root.context.getColor(com.example.healbridge.R.color.warning)
                "COMPLETED" -> binding.root.context.getColor(com.example.healbridge.R.color.primary_color)
                "CANCELLED" -> binding.root.context.getColor(com.example.healbridge.R.color.error)
                else -> binding.root.context.getColor(com.example.healbridge.R.color.text_secondary)
            }
            binding.tvStatus.backgroundTintList = android.content.res.ColorStateList.valueOf(statusColor)
            
            binding.root.setOnClickListener {
                onAppointmentClick(appointment)
            }
        }
        
        private fun formatDate(dateStr: String): String {
            return try {
                val date = java.time.LocalDate.parse(dateStr)
                val formatter = java.time.format.DateTimeFormatter.ofPattern("MMM dd, yyyy")
                date.format(formatter)
            } catch (e: Exception) {
                dateStr
            }
        }
        
        private fun formatTime(timeStr: String): String {
            return try {
                val time = java.time.LocalTime.parse(timeStr)
                val formatter = java.time.format.DateTimeFormatter.ofPattern("h:mm a")
                time.format(formatter)
            } catch (e: Exception) {
                timeStr
            }
        }
    }
}