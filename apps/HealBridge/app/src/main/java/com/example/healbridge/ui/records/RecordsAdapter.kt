package com.example.healbridge.ui.records

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.example.healbridge.databinding.ItemRecordBinding

class RecordsAdapter(
    private var records: List<MedicalRecord>,
    private val onRecordClick: (MedicalRecord) -> Unit
) : RecyclerView.Adapter<RecordsAdapter.RecordViewHolder>() {

    fun updateRecords(newRecords: List<MedicalRecord>) {
        records = newRecords
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecordViewHolder {
        val binding = ItemRecordBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return RecordViewHolder(binding)
    }

    override fun onBindViewHolder(holder: RecordViewHolder, position: Int) {
        holder.bind(records[position])
    }

    override fun getItemCount() = records.size

    inner class RecordViewHolder(private val binding: ItemRecordBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(record: MedicalRecord) {
            binding.tvRecordTitle.text = record.title
            binding.tvRecordType.text = record.type
            binding.tvRecordDate.text = record.date
            binding.tvRecordDescription.text = record.description
            
            binding.root.setOnClickListener {
                onRecordClick(record)
            }
        }
    }
}