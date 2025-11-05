import React, { useState } from 'react'
import { View, Text, TextInput, Button } from 'react-native'
import { useClinic } from '../../hooks/useDoctors'
import { useClinicStore } from '../../store/clinic.store'

export default function ClinicProfileScreen() {
  const { data, saveClinic } = useClinic()
  const { setClinic } = useClinicStore()
  const [form, setForm] = useState<any>(data || { name:'', address:'', fees: 0, radiusKm: 5 })

  const upd = (k:string,v:any)=> setForm((f:any)=>({ ...f, [k]: v }))

  return (
    <View style={{ padding: 16, gap: 8 }}>
      <Text style={{ fontWeight: '600' }}>Clinic Profile</Text>
      <TextInput placeholder="Name" value={form.name} onChangeText={(v)=>upd('name', v)} style={{ borderWidth:1, padding:8, borderRadius:8 }} />
      <TextInput placeholder="Address" value={form.address} onChangeText={(v)=>upd('address', v)} style={{ borderWidth:1, padding:8, borderRadius:8 }} />
      <TextInput placeholder="Fees" value={String(form.fees)} onChangeText={(v)=>upd('fees', Number(v))} keyboardType="decimal-pad" style={{ borderWidth:1, padding:8, borderRadius:8 }} />
      <TextInput placeholder="House-visit radius (km)" value={String(form.radiusKm)} onChangeText={(v)=>upd('radiusKm', Number(v))} keyboardType="number-pad" style={{ borderWidth:1, padding:8, borderRadius:8 }} />
      <Button title="Save" onPress={async ()=>{ const saved = await saveClinic(form); setClinic(saved) }} />
    </View>
  )
}

