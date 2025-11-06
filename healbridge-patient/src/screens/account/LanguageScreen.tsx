import React from 'react'
import { View } from 'react-native'
import { Button, Text } from '../../components'
import i18n from '../../packages/intl/src'
export default function LanguageScreen() {
  return <View style={{ padding:16 }}>
    <Text variant="title">Language</Text>
    <Button title="English" onPress={()=>i18n.changeLanguage('en')}/>
    <Button title="हिंदी" onPress={()=>i18n.changeLanguage('hi')}/>
  </View>
}
