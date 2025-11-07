package com.example.healbridge
import com.google.firebase.firestore.DocumentSnapshot

fun DocumentSnapshot.toPatientProfile(): PatientProfile? {
    val uid = getString("uid") ?: id
    val addr = get("address") as? Map<*, *>
    return PatientProfile(
        uid = uid,
        firstName = getString("firstName") ?: "",
        lastName = getString("lastName") ?: "",
        phoneNumber = getString("phoneNumber") ?: "",
        dob = getString("dob"),
        gender = getString("gender"),
        allergies = (get("allergies") as? List<*>)?.mapNotNull { it as? String } ?: emptyList(),
        conditions = (get("conditions") as? List<*>)?.mapNotNull { it as? String } ?: emptyList(),
        emergencyContactName = getString("emergencyContactName"),
        emergencyContactPhone = getString("emergencyContactPhone"),
        address = Address(
            houseNo = addr?.get("houseNo") as? String,
            locality = addr?.get("locality") as? String,
            city = addr?.get("city") as? String,
            state = addr?.get("state") as? String,
            pinCode = addr?.get("pinCode") as? String
        ),
        language = getString("language"),
        consentDataUse = getBoolean("consentDataUse") ?: false,
        consentNotifications = getBoolean("consentNotifications") ?: false,
        fcmToken = getString("fcmToken"),
        updatedAt = getLong("updatedAt") ?: 0L
    )
}

fun PatientProfile.toFirestoreMap(): Map<String, Any?> = mapOf(
    "uid" to uid,
    "firstName" to firstName,
    "lastName" to lastName,
    "phoneNumber" to phoneNumber,
    "dob" to dob,
    "gender" to gender,
    "allergies" to allergies,
    "conditions" to conditions,
    "emergencyContactName" to emergencyContactName,
    "emergencyContactPhone" to emergencyContactPhone,
    "address" to address?.let {
        mapOf(
            "houseNo" to it.houseNo,
            "locality" to it.locality,
            "city" to it.city,
            "state" to it.state,
            "pinCode" to it.pinCode
        )
    },
    "language" to language,
    "consentDataUse" to consentDataUse,
    "consentNotifications" to consentNotifications,
    "fcmToken" to fcmToken,
    "updatedAt" to if (updatedAt > 0) updatedAt else System.currentTimeMillis()
)
