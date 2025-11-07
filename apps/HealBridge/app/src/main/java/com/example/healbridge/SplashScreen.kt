package com.example.healbridge

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.animation.AnimationUtils
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.firebase.BuildConfig
import com.google.firebase.FirebaseApp
import com.google.firebase.appcheck.FirebaseAppCheck
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.launch

class SplashScreen : AppCompatActivity() {
    private lateinit var logo: ImageView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash_screen)

        // Initialize Firebase
        FirebaseApp.initializeApp(this)

        // Initialize App Check with proper provider
        val firebaseAppCheck = FirebaseAppCheck.getInstance()
        if (BuildConfig.DEBUG) {
            // Use Debug provider for development
            firebaseAppCheck.installAppCheckProviderFactory(
                DebugAppCheckProviderFactory.getInstance()
            )
            Log.d("AppCheck", "Using Debug App Check Provider")
        } else {
            // Use Play Integrity for production
            firebaseAppCheck.installAppCheckProviderFactory(
                PlayIntegrityAppCheckProviderFactory.getInstance()
            )
            Log.d("AppCheck", "Using Play Integrity App Check Provider")
        }

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

        // Check authentication status
        val auth = FirebaseAuth.getInstance()
        val currentUser = auth.currentUser
        val next = if (currentUser != null) {
            SecurePreferences.saveUserId(this, currentUser.uid)
            lifecycleScope.launch {
                FirestoreUserRepository(applicationContext, FirebaseUserIdProvider()).refresh()
            }
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