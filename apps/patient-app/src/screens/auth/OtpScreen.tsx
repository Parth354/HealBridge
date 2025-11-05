// src/screens/auth/OtpScreen.tsx
import React, { useState } from 'react'
import { View } from 'react-native'
import { Input, Button, Text } from '../../components'
import { useRequestOtp, useVerifyOtp } from 'api-client'
import { useAuthStore ,type AuthState } from '../../app/store/auth.store'
export default function OtpScreen({ navigation }: any) {
  const [phone,setPhone]=useState(''); const [code,setCode]=useState('')
  const req = useRequestOtp(); const ver = useVerifyOtp(); const setAuth = useAuthStore((s:AuthState)=>s.setAuth)
  return (
    <View style={{ padding:16 }}>
      <Text>Enter phone</Text>
      <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad"/>
      <Button title="Send OTP" onPress={()=>req.mutate({ phone })}/>
      <Text>Enter OTP</Text>
      <Input value={code} onChangeText={setCode} keyboardType="number-pad"/>
      <Button title="Verify" onPress={()=>ver.mutate({ phone, code },{ onSuccess:(d)=>{ setAuth(d.token,d.user); navigation.replace('Profile') } })}/>
    </View>
  )
}
