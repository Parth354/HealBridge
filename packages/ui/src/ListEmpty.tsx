import React from 'react'
import { View } from 'react-native'
import { Text } from './Text'

export function ListEmpty({ message = 'No items' }: { message?: string }) {
  return (
    <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
      <Text variant="muted">{message}</Text>
    </View>
  )
}
