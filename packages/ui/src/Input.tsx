import React from 'react'
import { TextInput, TextInputProps, View } from 'react-native'
import { colors, radius, spacing } from './theme'

export function Input(props: TextInputProps) {
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.sm }}>
      <TextInput
        {...props}
        style={[{ height: 42, color: colors.text }, (props as any).style]}
        placeholderTextColor={colors.muted}
      />
    </View>
  )
}
