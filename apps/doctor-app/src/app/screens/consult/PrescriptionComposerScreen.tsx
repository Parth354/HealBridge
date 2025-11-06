import React, { useState } from 'react'
import { View, Text, TextInput, Button, FlatList } from 'react-native'
import { useDocuments } from '../../hooks/useDocuments'

export default function PrescriptionComposerScreen({ route }: any) {
  const { appointmentId } = route.params
  const { createRx } = useDocuments()
  const [items, setItems] = useState<any[]>([])

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList data={items} keyExtractor={(_,i)=>String(i)} renderItem={({item, index}) => (
        <View style={{ marginBottom: 12 }}>
          <TextInput placeholder="Drug" value={item.drug} onChangeText={(v)=>{ const s=[...items]; s[index]={...s[index], drug:v}; setItems(s) }} style={{ borderWidth:1, padding:8, borderRadius:8 }} />
          <TextInput placeholder="Dose" value={item.dose} onChangeText={(v)=>{ const s=[...items]; s[index]={...s[index], dose:v}; setItems(s) }} style={{ borderWidth:1, padding:8, borderRadius:8, marginTop:6 }} />
        </View>
      )} />
      <Button title="Add line" onPress={()=> setItems([...items, { drug:'', dose:'' }])} />
      <Button title="Preview & Send" onPress={async ()=>{
        await createRx({ appointmentId, items })
        alert('Prescription sent to patient')
      }} />
    </View>
  )
}

