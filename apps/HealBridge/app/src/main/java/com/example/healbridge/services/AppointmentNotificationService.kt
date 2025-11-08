package com.example.healbridge.services

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.work.*
import com.example.healbridge.R
import com.example.healbridge.data.models.AppointmentDetail
import com.example.healbridge.ui.appts.AppointmentsFragment
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.concurrent.TimeUnit

/**
 * Service to schedule and send appointment reminder notifications
 * Sends notification 1 hour before appointment with directions to clinic
 */
class AppointmentNotificationService(private val context: Context, workerParams: WorkerParameters) :
    CoroutineWorker(context, workerParams) {

    companion object {
        private const val CHANNEL_ID = "appointment_reminders"
        private const val CHANNEL_NAME = "Appointment Reminders"
        private const val NOTIFICATION_ID_PREFIX = 1000
        private const val CUSTOM_SOUND_NAME = "appointment_reminder"
        
        /**
         * Schedule notification for an appointment 1 hour before
         */
        fun scheduleNotification(context: Context, appointment: AppointmentDetail) {
            val appointmentTime = Instant.parse(appointment.startTs)
            val notificationTime = appointmentTime.minusSeconds(3600) // 1 hour before
            val now = Instant.now()
            
            // Only schedule if notification time is in the future
            if (notificationTime.isBefore(now)) {
                return
            }
            
            val delay = notificationTime.epochSecond - now.epochSecond
            
            // Get doctor name from Doctor model (firstName/lastName) or fallback
            val doctorFirstName = appointment.doctor.firstName?.takeIf { it.isNotBlank() } ?: ""
            val doctorLastName = appointment.doctor.lastName?.takeIf { it.isNotBlank() } ?: ""
            val doctorName = when {
                doctorFirstName.isNotEmpty() && doctorLastName.isNotEmpty() -> "Dr. $doctorFirstName $doctorLastName"
                doctorFirstName.isNotEmpty() -> "Dr. $doctorFirstName"
                doctorLastName.isNotEmpty() -> "Dr. $doctorLastName"
                else -> appointment.doctor.user?.let { 
                    "${it.firstName ?: ""} ${it.lastName ?: ""}".trim().takeIf { it.isNotBlank() } ?: "Dr. Unknown"
                } ?: "Dr. Unknown"
            }
            
            val inputData = workDataOf(
                "appointmentId" to appointment.id,
                "doctorName" to doctorName,
                "clinicName" to appointment.clinic.name,
                "clinicAddress" to appointment.clinic.address,
                "clinicLat" to appointment.clinic.lat.toString(),
                "clinicLon" to appointment.clinic.lon.toString(),
                "appointmentTime" to appointment.startTs,
                "appointmentDate" to appointment.startTs.substring(0, 10)
            )
            
            val request = OneTimeWorkRequestBuilder<AppointmentNotificationService>()
                .setInitialDelay(delay, TimeUnit.SECONDS)
                .setInputData(inputData)
                .addTag("appointment_${appointment.id}")
                .build()
            
            WorkManager.getInstance(context).enqueue(request)
        }
        
        /**
         * Cancel scheduled notification for an appointment
         */
        fun cancelNotification(context: Context, appointmentId: String) {
            WorkManager.getInstance(context).cancelAllWorkByTag("appointment_$appointmentId")
        }
        
        /**
         * Create notification channel (call this in Application onCreate)
         */
        fun createNotificationChannel(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Reminders for upcoming appointments"
                    enableVibration(true)
                    enableLights(true)
                    // Try to use custom sound, fallback to default
                    val soundUri = getCustomSoundUri(context)
                    setSound(soundUri, android.media.AudioAttributes.Builder()
                        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
                        .build())
                }
                
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                notificationManager.createNotificationChannel(channel)
            }
        }
        
        private fun getCustomSoundUri(context: Context): Uri {
            // Try to find custom sound in raw folder
            return try {
                val resourceId = context.resources.getIdentifier(
                    CUSTOM_SOUND_NAME,
                    "raw",
                    context.packageName
                )
                if (resourceId != 0) {
                    Uri.parse("android.resource://${context.packageName}/$resourceId")
                } else {
                    // Fallback to default notification sound
                    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                }
            } catch (e: Exception) {
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            }
        }
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val appointmentId = inputData.getString("appointmentId") ?: return@withContext Result.failure()
            val doctorName = inputData.getString("doctorName") ?: "Doctor"
            val clinicName = inputData.getString("clinicName") ?: "Clinic"
            val clinicAddress = inputData.getString("clinicAddress") ?: ""
            val clinicLat = inputData.getString("clinicLat")?.toDoubleOrNull()
            val clinicLon = inputData.getString("clinicLon")?.toDoubleOrNull()
            val appointmentTime = inputData.getString("appointmentTime") ?: ""
            val appointmentDate = inputData.getString("appointmentDate") ?: ""
            
            // Format appointment time
            val timeStr = try {
                val instant = Instant.parse(appointmentTime)
                val localDateTime = LocalDateTime.ofInstant(instant, ZoneId.systemDefault())
                localDateTime.format(DateTimeFormatter.ofPattern("h:mm a"))
            } catch (e: Exception) {
                appointmentTime.substring(11, 16)
            }
            
            // Create intent for opening directions
            val directionsIntent = if (clinicLat != null && clinicLon != null) {
                // Create Google Maps intent
                Intent(Intent.ACTION_VIEW, Uri.parse("geo:$clinicLat,$clinicLon?q=$clinicLat,$clinicLon($clinicName)"))
                    .setPackage("com.google.android.apps.maps")
            } else {
                // Fallback to address search
                Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=${Uri.encode(clinicAddress)}"))
            }
            
            val directionsPendingIntent = PendingIntent.getActivity(
                context,
                appointmentId.hashCode(),
                directionsIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            // Create intent for opening appointments
            val appointmentsIntent = Intent(context, com.example.healbridge.Home::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                putExtra("fragment", "appointments")
            }
            
            val appointmentsPendingIntent = PendingIntent.getActivity(
                context,
                appointmentId.hashCode() + 1,
                appointmentsIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            // Build notification
            val notification = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_calendar)
                .setContentTitle("Appointment Reminder")
                .setContentText("Your appointment with $doctorName is in 1 hour")
                .setStyle(NotificationCompat.BigTextStyle()
                    .bigText("Appointment with $doctorName at $clinicName\nTime: $timeStr\n\nTap for directions to the clinic."))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setAutoCancel(true)
                .setContentIntent(appointmentsPendingIntent)
                .addAction(
                    R.drawable.ic_medical,
                    "Get Directions",
                    directionsPendingIntent
                )
                .setSound(getCustomSoundUri(context))
                .setVibrate(longArrayOf(0, 500, 250, 500))
                .setLights(0xFF2E7D32.toInt(), 1000, 500)
                .build()
            
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(NOTIFICATION_ID_PREFIX + appointmentId.hashCode(), notification)
            
            Result.success()
        } catch (e: Exception) {
            android.util.Log.e("AppointmentNotification", "Error sending notification", e)
            Result.retry()
        }
    }
}

