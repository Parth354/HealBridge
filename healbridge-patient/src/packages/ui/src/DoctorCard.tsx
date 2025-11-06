import React from 'react'
import { View } from 'react-native'
import { Card } from './Card'
import { Text } from './Text'
import { Button } from './Button'

export type DoctorCardData = {
  name: string
  rating?: number
  meters?: number
  specialty?: string
}

type Props = {
  data: DoctorCardData
  right?: React.ReactNode
  onBook?: () => void
}

export function DoctorCard({ data, right, onBook }: Props) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text variant="title">{data.name}</Text>
          {data.specialty && <Text variant="muted">{data.specialty}</Text>}
          {data.meters != null && <Text variant="muted">{Math.round(data.meters)} m</Text>}
        </View>
        {right ?? (onBook ? <Button title="Book" onPress={onBook} /> : null)}
      </View>
    </Card>
  )
}
