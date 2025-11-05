import React, { useState } from 'react'
import { View, Text, TextInput, Button, FlatList } from 'react-native'
import { useAvailability } from '../../hooks/useAvailability'

export default function AvailabilityEditorScreen() {
  const { data: template, saveTemplate } = useAvailability()
  const [state, setState] = useState(() => template || [])

  return (
    <View style={{ padding: 16 }}>
      <FlatList data={state}
        keyExtractor={(i:any) => i.day}
        renderItem={({ item, index }) => (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: '600' }}>{item.day}</Text>
            <TextInput value={item.start} onChangeText={(v)=>{ const s=[...state]; s[index]={...s[index], start:v}; setState(s) }} style={{ borderWidth:1, padding:8, borderRadius:8, marginVertical:4 }} />
            <TextInput value={item.end} onChangeText={(v)=>{ const s=[...state]; s[index]={...s[index], end:v}; setState(s) }} style={{ borderWidth:1, padding:8, borderRadius:8, marginVertical:4 }} />
            <TextInput value={String(item.slotMins)} onChangeText={(v)=>{ const s=[...state]; s[index]={...s[index], slotMins:Number(v)}; setState(s) }} keyboardType="number-pad" style={{ borderWidth:1, padding:8, borderRadius:8, marginVertical:4 }} />
          </View>
        )}
      />
      <Button title="Save" onPress={() => saveTemplate(state)} />
    </View>
  )
}

