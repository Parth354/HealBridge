package com.example.healbridge.ui.search

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.example.healbridge.ui.booking.BookAppointmentActivity

class DoctorSearchActivity : AppCompatActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Redirect to booking flow with triage
        startActivity(Intent(this, BookAppointmentActivity::class.java))
        finish()
    }
}