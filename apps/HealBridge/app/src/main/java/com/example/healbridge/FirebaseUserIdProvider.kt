package com.example.healbridge

import com.google.firebase.Firebase
import com.google.firebase.auth.auth


class FirebaseUserIdProvider : UserIdProvider {
    override fun currentUserId(): String? = Firebase.auth.currentUser?.uid
}
