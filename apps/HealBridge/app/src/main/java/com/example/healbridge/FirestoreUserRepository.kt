package com.example.healbridge

import android.content.Context
import com.google.firebase.Firebase

import com.google.firebase.firestore.SetOptions
import com.google.firebase.firestore.firestore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.merge
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class FirestoreUserRepository(
    private val context: Context,
    private val userIdProvider: UserIdProvider
) : UserRepository {

    private val db = Firebase.firestore
    private val scope = CoroutineScope(Dispatchers.IO)

    override fun observe(): Flow<PatientProfile?> {
        val uid = userIdProvider.currentUserId()
        if (uid.isNullOrBlank()) return prefsFlow(context)
        val docRef = db.collection("users").document(uid)
        val remote = kotlinx.coroutines.flow.callbackFlow<PatientProfile?> {
            val reg = docRef.addSnapshotListener { snap, err ->
                if (err != null) return@addSnapshotListener
                scope.launch {
                    val prof = snap?.toPatientProfile()
                    if (prof != null) writePrefs(context, prof)
                    trySend(prof)
                }
            }
            awaitClose { reg.remove() }
        }
        return merge(prefsFlow(context), remote.map { currentPrefs(context) })
    }

    override suspend fun refresh(): RepoResult<PatientProfile> = withUid { uid ->
        try {
            val snap = db.collection("users").document(uid).get().await()
            val prof = snap.toPatientProfile() ?: defaultProfile(uid)
            writePrefs(context, prof)
            RepoResult.Ok(prof)
        } catch (t: Throwable) {
            RepoResult.Err(t)
        }
    }

    override suspend fun upsert(profile: PatientProfile): RepoResult<Unit> = withUid { uid ->
        try {
            db.collection("users").document(uid).set(profile.toFirestoreMap(), SetOptions.merge()).await()
            writePrefs(context, profile.copy(updatedAt = now()))
            RepoResult.Ok(Unit)
        } catch (t: Throwable) {
            RepoResult.Err(t)
        }
    }

    override suspend fun updateAddress(address: Address): RepoResult<Unit> =
        patch(mapOf("address" to addressMap(address), "updatedAt" to now()))

    override suspend fun updateConsents(dataUse: Boolean, notifications: Boolean): RepoResult<Unit> =
        patch(mapOf("consentDataUse" to dataUse, "consentNotifications" to notifications, "updatedAt" to now()))

    override suspend fun updateLanguage(language: String): RepoResult<Unit> =
        patch(mapOf("language" to language, "updatedAt" to now()))

    override suspend fun updateFcmToken(token: String): RepoResult<Unit> =
        patch(mapOf("fcmToken" to token, "updatedAt" to now()))

    override suspend fun clear(): RepoResult<Unit> =
        try {
            writePrefs(context, defaultProfile(userIdProvider.currentUserId().orEmpty()))
            RepoResult.Ok(Unit)
        } catch (t: Throwable) {
            RepoResult.Err(t)
        }

    private suspend fun patch(fields: Map<String, Any?>): RepoResult<Unit> = withUid { uid ->
        try {
            db.collection("users").document(uid).set(fields.filterValues { it != null }, SetOptions.merge()).await()
            val current = currentPrefs(context)
            if (current != null) {
                val merged = current.merge(fields)
                writePrefs(context, merged)
            }
            RepoResult.Ok(Unit)
        } catch (t: Throwable) {
            RepoResult.Err(t)
        }
    }

    private inline fun <T> withUid(block: (String) -> T): T {
        val uid = userIdProvider.currentUserId()
        require(!uid.isNullOrBlank()) { "Invalid user ID" }
        return block(uid!!)
    }
}

private fun now() = System.currentTimeMillis()

private fun defaultProfile(uid: String) = PatientProfile(
    uid = uid,
    firstName = "",
    lastName = "",
    phoneNumber = "",
    dob = null,
    gender = null,
    allergies = emptyList(),
    conditions = emptyList(),
    emergencyContactName = null,
    emergencyContactPhone = null,
    address = null,
    language = null,
    consentDataUse = false,
    consentNotifications = false,
    fcmToken = null,
    updatedAt = now()
)

private fun addressMap(a: Address) = mapOf(
    "houseNo" to a.houseNo,
    "locality" to a.locality,
    "city" to a.city,
    "state" to a.state,
    "pinCode" to a.pinCode
)

private fun PatientProfile.merge(fields: Map<String, Any?>): PatientProfile {
    var addr = address
    if (fields["address"] is Map<*, *>) {
        val m = fields["address"] as Map<*, *>
        addr = Address(
            houseNo = (m["houseNo"] as? String) ?: addr?.houseNo,
            locality = (m["locality"] as? String) ?: addr?.locality,
            city = (m["city"] as? String) ?: addr?.city,
            state = (m["state"] as? String) ?: addr?.state,
            pinCode = (m["pinCode"] as? String) ?: addr?.pinCode
        )
    }
    return copy(
        language = (fields["language"] as? String) ?: language,
        consentDataUse = (fields["consentDataUse"] as? Boolean) ?: consentDataUse,
        consentNotifications = (fields["consentNotifications"] as? Boolean) ?: consentNotifications,
        fcmToken = (fields["fcmToken"] as? String) ?: fcmToken,
        address = addr,
        updatedAt = (fields["updatedAt"] as? Long) ?: updatedAt
    )
}
