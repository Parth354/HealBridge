// src/app/navigation/MainNavigator.tsx
import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import HomeScreen from '../../screens/home/HomeScreen'
import TriageScreen from '../../screens/home/TriageScreen'
import SearchDoctorsScreen from '../../screens/home/SearchDoctorsScreen'
import DoctorDetailsScreen from '../../screens/home/DoctorDetailsScreen'
import AvailabilityScreen from '../../screens/home/AvailabilityScreen'
import BookingConfirmScreen from '../../screens/home/BookingConfirmScreen'
import LiveNavigationScreen from '../../screens/navigation/LiveNavigationScreen'
import HistoryScreen from '../../screens/history/HistoryScreen'
import PrescriptionDetailScreen from '../../screens/history/PrescriptionDetailScreen'
import DocumentUploadScreen from '../../screens/history/DocumentUploadScreen'
import MedScheduleScreen from '../../screens/meds/MedScheduleScreen'
import SettingsScreen from '../../screens/account/SettingsScreen'
import LanguageScreen from '../../screens/account/LanguageScreen'
import PermissionsScreen from '../../screens/account/PermissionsScreen'
const S = createNativeStackNavigator()
export default function MainNavigator() {
  return (
    <S.Navigator>
      <S.Screen name="Home" component={HomeScreen}/>
      <S.Screen name="Triage" component={TriageScreen}/>
      <S.Screen name="SearchDoctors" component={SearchDoctorsScreen}/>
      <S.Screen name="DoctorDetails" component={DoctorDetailsScreen}/>
      <S.Screen name="Availability" component={AvailabilityScreen}/>
      <S.Screen name="BookingConfirm" component={BookingConfirmScreen}/>
      <S.Screen name="LiveNavigation" component={LiveNavigationScreen}/>
      <S.Screen name="History" component={HistoryScreen}/>
      <S.Screen name="PrescriptionDetail" component={PrescriptionDetailScreen}/>
      <S.Screen name="DocumentUpload" component={DocumentUploadScreen}/>
      <S.Screen name="MedSchedule" component={MedScheduleScreen}/>
      <S.Screen name="Settings" component={SettingsScreen}/>
      <S.Screen name="Language" component={LanguageScreen}/>
      <S.Screen name="Permissions" component={PermissionsScreen}/>
    </S.Navigator>
  )
}
