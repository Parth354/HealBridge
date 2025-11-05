import React, { useState } from 'react'
import { View, TextInput, Button, Alert } from 'react-native'
import { useAuth } from '../../hooks/useAuth'
import { useAuthStore } from '../../store/auth.store'

export default function OtpScreen() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const { requestOtp, verifyOtp } = useAuth()
  const { setAuth } = useAuthStore()

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <TextInput placeholder="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />
      <Button title="Send OTP" onPress={async () => { await requestOtp({ phone }) }} />
      <TextInput placeholder="OTP" keyboardType="number-pad" value={otp} onChangeText={setOtp} style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />
      <Button title="Login" onPress={async () => {
        const res = await verifyOtp({ phone, otp })
        if (res?.token) setAuth(res.token, res.user)
        else Alert.alert('Invalid OTP')
      }} />
    </View>
  )
}

