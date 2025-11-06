// packages/ui/src/PDFViewer.tsx
import React from 'react'
import { Dimensions, View } from 'react-native'
import Pdf from 'react-native-pdf'
export function PDFViewer({ uri }: { uri: string }) {
  const w = Dimensions.get('window').width
  const h = Dimensions.get('window').height
  return <View style={{ flex: 1 }}><Pdf source={{ uri }} style={{ width: w, height: h }}/></View>
}
