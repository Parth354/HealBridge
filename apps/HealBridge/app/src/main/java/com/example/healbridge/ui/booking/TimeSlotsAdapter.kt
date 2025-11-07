package com.example.healbridge.ui.booking

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.example.healbridge.R
import com.example.healbridge.databinding.ItemTimeSlotBinding
import com.example.healbridge.data.models.TimeSlot

class TimeSlotsAdapter(
    private val onSlotClick: (TimeSlot) -> Unit
) : ListAdapter<TimeSlot, TimeSlotsAdapter.TimeSlotViewHolder>(TimeSlotDiffCallback()) {
    
    private var selectedSlot: TimeSlot? = null
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): TimeSlotViewHolder {
        val binding = ItemTimeSlotBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return TimeSlotViewHolder(binding)
    }
    
    override fun onBindViewHolder(holder: TimeSlotViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
    
    fun setSelectedSlot(slot: TimeSlot) {
        val previousSelected = selectedSlot
        selectedSlot = slot
        
        // Refresh the previously selected item
        previousSelected?.let { previous ->
            val previousIndex = currentList.indexOfFirst { it.time == previous.time }
            if (previousIndex != -1) {
                notifyItemChanged(previousIndex)
            }
        }
        
        // Refresh the newly selected item
        val newIndex = currentList.indexOfFirst { it.time == slot.time }
        if (newIndex != -1) {
            notifyItemChanged(newIndex)
        }
    }
    
    inner class TimeSlotViewHolder(
        private val binding: ItemTimeSlotBinding
    ) : RecyclerView.ViewHolder(binding.root) {
        
        fun bind(slot: TimeSlot) {
            binding.timeText.text = slot.time
            
            val isSelected = selectedSlot?.time == slot.time
            
            // Update appearance based on selection and availability
            when {
                !slot.isAvailable -> {
                    binding.root.isEnabled = false
                    binding.root.setBackgroundResource(R.drawable.chip_background)
                    binding.timeText.setTextColor(
                        ContextCompat.getColor(binding.root.context, R.color.text_secondary)
                    )
                }
                isSelected -> {
                    binding.root.isEnabled = true
                    binding.root.setBackgroundResource(R.drawable.circle_primary)
                    binding.timeText.setTextColor(
                        ContextCompat.getColor(binding.root.context, android.R.color.white)
                    )
                }
                else -> {
                    binding.root.isEnabled = true
                    binding.root.setBackgroundResource(R.drawable.chip_background)
                    binding.timeText.setTextColor(
                        ContextCompat.getColor(binding.root.context, R.color.text_primary)
                    )
                }
            }
            
            binding.root.setOnClickListener {
                if (slot.isAvailable) {
                    onSlotClick(slot)
                }
            }
        }
    }
    
    private class TimeSlotDiffCallback : DiffUtil.ItemCallback<TimeSlot>() {
        override fun areItemsTheSame(oldItem: TimeSlot, newItem: TimeSlot): Boolean {
            return oldItem.time == newItem.time
        }
        
        override fun areContentsTheSame(oldItem: TimeSlot, newItem: TimeSlot): Boolean {
            return oldItem == newItem
        }
    }
}