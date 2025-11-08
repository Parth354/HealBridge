package com.example.healbridge.ui.search

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.example.healbridge.R
import com.example.healbridge.data.models.Doctor
import com.example.healbridge.databinding.ItemDoctorSelectionBinding

class DoctorSearchAdapter(
    private val onDoctorClick: (Doctor) -> Unit
) : ListAdapter<Doctor, DoctorSearchAdapter.DoctorViewHolder>(DiffCallback()) {
    
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

