import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import DashboardScreen from '../screens/dashboard/DashboardScreen'
import CalendarScreen from '../screens/schedule/CalendarScreen'
import AvailabilityEditorScreen from '../screens/schedule/AvailabilityEditorScreen'
import TodayListScreen from '../screens/queue/TodayListScreen'
import CheckinsScreen from '../screens/queue/CheckinsScreen'
import PrevisitSummaryScreen from '../screens/consult/PrevisitSummaryScreen'
import ConsultScreen from '../screens/consult/ConsultScreen'
import PrescriptionComposerScreen from '../screens/consult/PrescriptionComposerScreen'
import ClinicProfileScreen from '../screens/clinic/ClinicProfileScreen'
import SettingsScreen from '../screens/account/SettingsScreen'

const Stack = createNativeStackNavigator()

export default function MainNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="AvailabilityEditor" component={AvailabilityEditorScreen} options={{ title: 'Availability' }} />
      <Stack.Screen name="TodayList" component={TodayListScreen} options={{ title: 'Today' }} />
      <Stack.Screen name="Checkins" component={CheckinsScreen} />
      <Stack.Screen name="PrevisitSummary" component={PrevisitSummaryScreen} options={{ title: 'Pre-visit' }} />
      <Stack.Screen name="Consult" component={ConsultScreen} />
      <Stack.Screen name="PrescriptionComposer" component={PrescriptionComposerScreen} options={{ title: 'Compose Rx' }} />
      <Stack.Screen name="ClinicProfile" component={ClinicProfileScreen} options={{ title: 'Clinic' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  )
}

