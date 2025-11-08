package com.example.healbridge.services

import android.content.Context
import com.example.healbridge.data.models.AppointmentDetail
import com.example.healbridge.api.ApiRepository
import com.example.healbridge.data.NetworkResult
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * Helper class to schedule notifications for all upcoming appointments
 */
object NotificationScheduler {
    
    /**
     * Schedule notifications for all upcoming appointments
     * Call this after login or when appointments are refreshed
     */
    fun scheduleAllAppointments(context: Context, apiRepository: ApiRepository) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                when (val result = apiRepository.getAppointments()) {
                    is com.example.healbridge.data.NetworkResult.Success -> {
                        val now = Instant.now()
                        val upcomingAppointments = result.data.appointments.filter { appointment ->
                            val appointmentTime = try {
                                Instant.parse(appointment.startTs)
                            } catch (e: Exception) {
                                null
                            }
                            
                            appointmentTime != null &&
                            appointmentTime.isAfter(now) &&
                            (appointment.status == "CONFIRMED" || appointment.status == "PENDING")
                        }
                        
                        // Cancel all existing notifications first
                        androidx.work.WorkManager.getInstance(context).cancelAllWorkByTag("appointment_reminders")
                        
                        // Schedule notifications for each upcoming appointment
                        upcomingAppointments.forEach { appointment ->
                            AppointmentNotificationService.scheduleNotification(context, appointment)
                        }
                        
                        android.util.Log.d("NotificationScheduler", "Scheduled ${upcomingAppointments.size} appointment notifications")
                    }
                    else -> {
                        android.util.Log.e("NotificationScheduler", "Failed to fetch appointments for notification scheduling")
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("NotificationScheduler", "Error scheduling notifications", e)
            }
        }
    }
    
    /**
     * Schedule notification for a single appointment
     */
    fun scheduleAppointment(context: Context, appointment: AppointmentDetail) {
        AppointmentNotificationService.scheduleNotification(context, appointment)
    }
    
    /**
     * Cancel notification for a single appointment
     */
    fun cancelAppointment(context: Context, appointmentId: String) {
        AppointmentNotificationService.cancelNotification(context, appointmentId)
    }
}

