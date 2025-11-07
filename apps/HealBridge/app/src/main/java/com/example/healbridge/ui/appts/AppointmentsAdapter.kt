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
            binding.tvAppointmentDate.text = appointment.appointmentDate
            binding.tvAppointmentTime.text = appointment.appointmentTime
            binding.tvStatus.text = appointment.status
            
            binding.root.setOnClickListener {
                onAppointmentClick(appointment)
            }
        }
    }
}