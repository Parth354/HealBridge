package com.example.healbridge

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.animation.AnimationUtils
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.example.healbridge.api.ApiClient

class SplashScreen : AppCompatActivity() {
    private lateinit var logo: ImageView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash_screen)

        // Initialize ApiClient
        ApiClient.initialize(this)

        // Animate elements
        logo = findViewById(R.id.imageView)
        val appNameText = findViewById<TextView>(R.id.appNameText)
        val taglineText = findViewById<TextView>(R.id.taglineText)
        val progressBar = findViewById<ProgressBar>(R.id.progressBar)
        
        // Start animations
        logo.startAnimation(AnimationUtils.loadAnimation(this, R.anim.scale))
        appNameText.startAnimation(AnimationUtils.loadAnimation(this, R.anim.fade_in_up))
        taglineText.startAnimation(AnimationUtils.loadAnimation(this, R.anim.fade_in_delayed))
        progressBar.startAnimation(AnimationUtils.loadAnimation(this, R.anim.fade_in_delayed))

        // Check authentication status - check for JWT token
        val token = SecurePreferences.getAuthToken(this)
        val userId = SecurePreferences.getUserId(this)
        val next = if (token != null && userId != null) {
            Home::class.java
        } else {
            Login::class.java
        }

        // Navigate after delay
        Handler(Looper.getMainLooper()).postDelayed({
            startActivity(Intent(this, next))
            finish()
        }, 1500)
    }
}