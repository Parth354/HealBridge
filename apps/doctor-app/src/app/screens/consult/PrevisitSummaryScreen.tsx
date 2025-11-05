import React from 'react'
import { ScrollView, View, Text } from 'react-native'
import { useDocuments } from 'api-client/hooks/useDocuments'

export default function PrevisitSummaryScreen({ route }: any) {
  const { appointmentId } = route.params
  const { data } = useDocuments({ appointmentId })

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>Pre-visit Summary</Text>
      {data?.allergies && <Text>Allergies: {data.allergies.join(', ')}</Text>}
      {data?.conditions && <Text>Conditions: {data.conditions.join(', ')}</Text>}
      {data?.meds && <Text>Medications: {data.meds.map((m:any)=>m.name).join(', ')}</Text>}
    </ScrollView>
  )
}

