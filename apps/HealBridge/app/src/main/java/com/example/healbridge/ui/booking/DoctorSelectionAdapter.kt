package com.example.healbridge.ui.booking

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.example.healbridge.R
import com.example.healbridge.data.models.Doctor
import com.example.healbridge.databinding.ItemDoctorSelectionBinding

class DoctorSelectionAdapter(
    private val onDoctorClick: (Doctor) -> Unit
) : ListAdapter<Doctor, DoctorSelectionAdapter.DoctorViewHolder>(DiffCallback()) {
    
    private var selectedDoctorId: String? = null
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DoctorViewHolder {
        val binding = ItemDoctorSelectionBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return DoctorViewHolder(binding)
    }
    
    override fun onBindViewHolder(holder: DoctorViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
    
    fun setSelectedDoctor(doctorId: String?) {
        // Explicitly handle null case
        selectedDoctorId = doctorId
        notifyDataSetChanged()
    }
    
    inner class DoctorViewHolder(
        private val binding: ItemDoctorSelectionBinding
    ) : RecyclerView.ViewHolder(binding.root) {
        
        fun bind(doctor: Doctor) {
            binding.apply {
                doctorName.text = doctor.name
                doctorSpecialty.text = doctor.specialty
                doctorRating.text = doctor.rating.toString()
                doctorExperience.text = "${doctor.experience} years exp"
                clinicName.text = doctor.clinicName
                consultationFee.text = "₹${doctor.consultationFee.toInt()}"
                
                availabilityStatus.text = if (doctor.isAvailable) "Available" else "Busy"
                availabilityStatus.setTextColor(
                    if (doctor.isAvailable) 
                        root.context.getColor(R.color.success)
                    else 
                        root.context.getColor(R.color.error)
                )
                
                // Highlight selected doctor with visual feedback
                val isSelected = doctor.id == selectedDoctorId
                root.isSelected = isSelected
                
                // Change background color and elevation for selected doctor
                if (isSelected) {
                    root.setBackgroundColor(root.context.getColor(R.color.primary))
                    root.alpha = 0.9f
                    root.elevation = 8f
                    // Make text white for better contrast
                    doctorName.setTextColor(root.context.getColor(R.color.white))
                    doctorSpecialty.setTextColor(root.context.getColor(R.color.white))
                    clinicName.setTextColor(root.context.getColor(R.color.white))
                    consultationFee.setTextColor(root.context.getColor(R.color.white))
                } else {
                    root.setBackgroundColor(root.context.getColor(R.color.card_background))
                    root.alpha = 1f
                    root.elevation = 2f
                    // Reset to default text colors
                    doctorName.setTextColor(root.context.getColor(R.color.text_primary))
                    doctorSpecialty.setTextColor(root.context.getColor(R.color.text_secondary))
                    clinicName.setTextColor(root.context.getColor(R.color.text_secondary))
                    consultationFee.setTextColor(root.context.getColor(R.color.text_primary))
                }
                
                root.setOnClickListener {
                    onDoctorClick(doctor)
                }
            }
        }
    }
    
    class DiffCallback : DiffUtil.ItemCallback<Doctor>() {
        override fun areItemsTheSame(oldItem: Doctor, newItem: Doctor): Boolean {
            return oldItem.id == newItem.id
        }
        
        override fun areContentsTheSame(oldItem: Doctor, newItem: Doctor): Boolean {
            return oldItem == newItem
        }
    }
}