package com.example.healbridge

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.ProgressBar
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.example.healbridge.databinding.ActivityLoginBinding
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.android.material.snackbar.Snackbar
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.firestore.FirebaseFirestore

class Login : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private lateinit var auth: FirebaseAuth
    private lateinit var googleSignInClient: GoogleSignInClient
    private lateinit var firestore: FirebaseFirestore

    // Modern Activity Result API
    private val googleSignInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
        try {
            val account = task.getResult(ApiException::class.java)
            Log.d("GoogleSignIn", "Account: ${account.email}")
            firebaseAuthWithGoogle(account)
        } catch (e: ApiException) {
            binding.loadingIndicator.visibility = View.GONE
            Log.e("GoogleSignIn", "Error code: ${e.statusCode}", e)

            val errorMessage = when (e.statusCode) {
                10 -> "Configuration error. Please contact support."
                12501 -> "Sign-in cancelled"
                7 -> "Network error. Please check your connection."
                else -> "Sign-in failed: ${e.message}"
            }
            Snackbar.make(binding.root, errorMessage, Snackbar.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        auth = FirebaseAuth.getInstance()
        firestore = FirebaseFirestore.getInstance()

        // Configure Google Sign-In
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(getString(R.string.default_web_client_id))
            .requestEmail()
            .build()

        googleSignInClient = GoogleSignIn.getClient(this, gso)

        // Set up sign-in button
        binding.googleSignInButton.setOnClickListener {
            binding.loadingIndicator.visibility = View.VISIBLE
            signInWithGoogle()
        }
    }

    private fun signInWithGoogle() {
        // Sign out first to force account selection
        googleSignInClient.signOut().addOnCompleteListener {
            val signInIntent = googleSignInClient.signInIntent
            googleSignInLauncher.launch(signInIntent)
        }
    }

    private fun firebaseAuthWithGoogle(account: GoogleSignInAccount) {
        val credential = GoogleAuthProvider.getCredential(account.idToken, null)
        auth.signInWithCredential(credential)
            .addOnCompleteListener(this) { task ->
                binding.loadingIndicator.visibility = View.GONE

                if (task.isSuccessful) {
                    val user = auth.currentUser
                    user?.let {
                        // Save user ID to secure preferences
                        SecurePreferences.saveUserId(this, it.uid)
                        Log.d("Login", "User authenticated: ${it.uid}")

                        // Check if user details exist in Firestore
                        checkUserDetailsInFirestore(it.uid)
                    }
                } else {
                    Log.e("Login", "Authentication failed", task.exception)
                    Snackbar.make(
                        binding.root,
                        "Authentication failed: ${task.exception?.message}",
                        Snackbar.LENGTH_LONG
                    ).show()
                }
            }
    }

    private fun checkUserDetailsInFirestore(uid: String) {
        firestore.collection("users").document(uid).get()
            .addOnSuccessListener { document ->
                if (document.exists()) {
                    Log.d("Login", "User document exists, navigating to Home")
                    navigateToHome()
                } else {
                    Log.d("Login", "User document doesn't exist, navigating to UserDetails")
                    navigateToUserDetails()
                }
            }
            .addOnFailureListener { exception ->
                Log.e("Login", "Error fetching user details", exception)
                Snackbar.make(
                    binding.root,
                    "Error fetching user details: ${exception.message}",
                    Snackbar.LENGTH_LONG
                ).show()
            }
    }

    private fun navigateToHome() {
        val intent = Intent(this, Home::class.java)
        startActivity(intent)
        finish()
    }

    private fun navigateToUserDetails() {
        val intent = Intent(this, UserDetails::class.java)
        startActivity(intent)
        finish()
    }
}