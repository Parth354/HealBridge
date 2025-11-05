import React from 'react'
import { Text as RNText, TextProps, TextStyle } from 'react-native'
import { colors } from './theme'

type Props = TextProps & { variant?: 'title'|'label'|'body'|'muted' }

export function Text({ variant='body', style, ...rest }: Props) {
  const styles: TextStyle[] = [{ color: colors.text }]
  if (variant==='title') styles.push({ fontSize: 22, fontWeight: '700' })
  if (variant==='label') styles.push({ fontSize: 14, fontWeight: '600' })
  if (variant==='body') styles.push({ fontSize: 16 })
  if (variant==='muted') styles.push({ color: colors.muted })
  const incoming = Array.isArray(style) ? style as TextStyle[] : style ? [style as TextStyle] : []
  return <RNText {...rest} style={[...styles, ...incoming]} />
}
