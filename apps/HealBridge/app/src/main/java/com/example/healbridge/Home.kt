package com.example.healbridge

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.inputmethod.InputMethodManager
import androidx.activity.addCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.isVisible
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.example.healbridge.databinding.ActivityHomeBinding
import com.google.firebase.firestore.FirebaseFirestore

class Home : AppCompatActivity() {
    private lateinit var binding: ActivityHomeBinding
    private lateinit var firestore: FirebaseFirestore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)

        firestore = FirebaseFirestore.getInstance()
        val uid = SecurePreferences.getUserId(this)
        if (uid == null) {
            startActivity(Intent(this, Login::class.java))
            finish()
            return
        }

        firestore.collection("users").document(uid).get()
            .addOnSuccessListener {
                if (!it.exists()) {
                    startActivity(Intent(this, UserDetails::class.java))
                    finish()
                }
            }
            .addOnFailureListener {
                startActivity(Intent(this, Login::class.java))
                finish()
            }

        // Get NavController from NavHostFragment
        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        val navController = navHostFragment.navController

        // Setup BottomNavigationView with NavController
        binding.mainNav.setupWithNavController(navController)

        // Handle deep links
        navController.handleDeepLink(intent)

        // Hide keyboard on touch
        binding.homeRoot.setOnTouchListener { v, _ ->
            currentFocus?.let {
                (getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager)
                    .hideSoftInputFromWindow(it.windowToken, 0)
                it.clearFocus()
            }
            v.performClick()
            false
        }

        // Handle back press
        onBackPressedDispatcher.addCallback(this) {
            if (!navController.popBackStack()) finish()
        }

        // Show/hide bottom navigation based on destination
        navController.addOnDestinationChangedListener { _, dest, _ ->
            binding.mainNav.isVisible = dest.id in setOf(
                R.id.tab_home,
                R.id.tab_appointments,
                R.id.tab_records,
                R.id.tab_profile
            )
        }
    }
}