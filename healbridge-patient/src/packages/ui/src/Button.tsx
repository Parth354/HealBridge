import React from 'react'
import { Pressable, ActivityIndicator, ViewStyle, TextStyle } from 'react-native'
import { Text } from './Text'
import { colors, radius, spacing } from './theme'

type Props = {
  title: string
  onPress?: () => void
  disabled?: boolean
  loading?: boolean
  style?: ViewStyle | ViewStyle[]
  textStyle?: TextStyle | TextStyle[]
  variant?: 'primary' | 'outline' | 'ghost'
}

export function Button({
  title,
  onPress,
  disabled,
  loading,
  style,
  textStyle,
  variant = 'primary'
}: Props) {
  const base: ViewStyle = {
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: variant === 'outline' ? 1 : 0,
    borderColor: colors.border,
    backgroundColor:
      variant === 'primary' ? colors.primary : variant === 'ghost' ? 'transparent' : colors.bg,
    opacity: disabled ? 0.6 : 1
  }

  return (
    <Pressable disabled={disabled || loading} onPress={onPress} style={[base, style]}>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text
          variant="label"
          style={[
            { color: variant === 'primary' ? '#fff' : colors.text },
            Array.isArray(textStyle) ? textStyle : textStyle ? [textStyle] : []
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  )
}
