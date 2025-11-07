package com.example.healbridge

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

val Context.userDataStore by preferencesDataStore("user_prefs_v2")

object Keys {
    val uid = stringPreferencesKey("uid")
    val firstName = stringPreferencesKey("firstName")
    val lastName = stringPreferencesKey("lastName")
    val phoneNumber = stringPreferencesKey("phoneNumber")
    val dob = stringPreferencesKey("dob")
    val gender = stringPreferencesKey("gender")
    val allergies = stringPreferencesKey("allergies")
    val conditions = stringPreferencesKey("conditions")
    val emName = stringPreferencesKey("em_name")
    val emPhone = stringPreferencesKey("em_phone")
    val houseNo = stringPreferencesKey("house_no")
    val locality = stringPreferencesKey("locality")
    val city = stringPreferencesKey("city")
    val state = stringPreferencesKey("state")
    val pin = stringPreferencesKey("pin")
    val language = stringPreferencesKey("language")
    val consentDataUse = stringPreferencesKey("consent_data_use")
    val consentNotifications = stringPreferencesKey("consent_notifications")
    val fcm = stringPreferencesKey("fcm")
    val updatedAt = longPreferencesKey("updated_at")
}

suspend fun writePrefs(context: Context, p: PatientProfile) {
    context.userDataStore.edit {
        it[Keys.uid] = p.uid
        it[Keys.firstName] = p.firstName
        it[Keys.lastName] = p.lastName
        it[Keys.phoneNumber] = p.phoneNumber
        it[Keys.dob] = p.dob ?: ""
        it[Keys.gender] = p.gender ?: ""
        it[Keys.allergies] = p.allergies.joinToString("|")
        it[Keys.conditions] = p.conditions.joinToString("|")
        it[Keys.emName] = p.emergencyContactName ?: ""
        it[Keys.emPhone] = p.emergencyContactPhone ?: ""
        it[Keys.houseNo] = p.address?.houseNo ?: ""
        it[Keys.locality] = p.address?.locality ?: ""
        it[Keys.city] = p.address?.city ?: ""
        it[Keys.state] = p.address?.state ?: ""
        it[Keys.pin] = p.address?.pinCode ?: ""
        it[Keys.language] = p.language ?: ""
        it[Keys.consentDataUse] = p.consentDataUse.toString()
        it[Keys.consentNotifications] = p.consentNotifications.toString()
        it[Keys.fcm] = p.fcmToken ?: ""
        it[Keys.updatedAt] = p.updatedAt
    }
}

fun prefsFlow(context: Context): Flow<PatientProfile?> =
    context.userDataStore.data.map { it.toProfileOrNull() }

suspend fun currentPrefs(context: Context): PatientProfile? =
    context.userDataStore.data.first().toProfileOrNull()

fun Preferences.toProfileOrNull(): PatientProfile? =
   UserPreferencesMapper.fromPreferences(this)
