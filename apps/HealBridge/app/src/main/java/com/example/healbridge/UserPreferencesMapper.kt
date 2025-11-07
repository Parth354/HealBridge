package com.example.healbridge

import androidx.datastore.preferences.core.Preferences

object UserPreferencesMapper {
    fun fromPreferences(p: Preferences): PatientProfile? {
        val uid = p[Keys.uid] ?: return null
        return PatientProfile(
            uid = uid,
            firstName = p[Keys.firstName].orEmpty(),
            lastName = p[Keys.lastName].orEmpty(),
            phoneNumber = p[Keys.phoneNumber].orEmpty(),
            dob = p[Keys.dob].orEmpty().ifBlank { null },
            gender = p[Keys.gender].orEmpty().ifBlank { null },
            allergies = p[Keys.allergies].orEmpty().split("|").filter { it.isNotBlank() },
            conditions = p[Keys.conditions].orEmpty().split("|").filter { it.isNotBlank() },
            emergencyContactName = p[Keys.emName].orEmpty().ifBlank { null },
            emergencyContactPhone = p[Keys.emPhone].orEmpty().ifBlank { null },
            address = Address(
                houseNo = p[Keys.houseNo].orEmpty().ifBlank { null },
                locality = p[Keys.locality].orEmpty().ifBlank { null },
                city = p[Keys.city].orEmpty().ifBlank { null },
                state = p[Keys.state].orEmpty().ifBlank { null },
                pinCode = p[Keys.pin].orEmpty().ifBlank { null }
            ),
            language = p[Keys.language].orEmpty().ifBlank { null },
            consentDataUse = p[Keys.consentDataUse].orEmpty().toBooleanStrictOrNull() ?: false,
            consentNotifications = p[Keys.consentNotifications].orEmpty().toBooleanStrictOrNull() ?: false,
            fcmToken = p[Keys.fcm].orEmpty().ifBlank { null },
            updatedAt = p[Keys.updatedAt] ?: 0L
        )
    }
}
