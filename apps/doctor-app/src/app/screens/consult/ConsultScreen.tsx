import React, { useState } from 'react'
import { View, TextInput, Button, Text, ScrollView } from 'react-native'
import { useRag } from '../../hooks/useRag'
import { useConsultStore } from '../../store/consult.store'
import useCheckinFeed from '../../hooks/useCheckinFeed'

export default function ConsultScreen({ route }: any) {
  const { appointmentId } = route.params
  const [q, setQ] = useState('')
  const [history, setHistory] = useState<{q:string,a:string, cites?:any[]}[]>([])
  const { ask } = useRag()
  const { setActive } = useConsultStore()
  useCheckinFeed(appointmentId)

  return (
    <View style={{ flex: 1, padding: 16, gap: 8 }}>
      <Button title="Start Consult" onPress={() => setActive(appointmentId)} />
      <ScrollView style={{ flex: 1 }}>
        {history.map((h, idx) => (
          <View key={idx} style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: '600' }}>Q: {h.q}</Text>
            <Text>A: {h.a}</Text>
            {h.cites?.map((c,i)=>(<Text key={i} style={{ fontSize:12, opacity:0.7 }}>• {c.title}</Text>))}
          </View>
        ))}
      </ScrollView>
      <TextInput placeholder="Ask patient history…" value={q} onChangeText={setQ} style={{ borderWidth:1, borderRadius:8, padding:10 }} />
      <Button title="Ask" onPress={async ()=>{
        const res = await ask({ appointmentId, question: q })
        setHistory((h)=>[...h, { q, a: res.answer, cites: res.citations }])
        setQ('')
      }} />
    </View>
  )
}

