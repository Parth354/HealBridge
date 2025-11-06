import React from 'react'
import { View, ViewProps } from 'react-native'
import { colors, radius, spacing } from './theme'

export function Card(p: ViewProps) {
  return <View {...p} style={[{ backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border }, p.style]} />
}
