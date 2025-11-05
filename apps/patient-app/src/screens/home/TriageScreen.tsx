import React, { useState } from 'react'
import { View } from 'react-native'
import { Input, Button } from '../../components'
export default function TriageScreen({ navigation }: any) {
  const [sym,setSym]=useState('')
  return <View style={{ padding:16 }}><Input value={sym} onChangeText={setSym} placeholder="Describe symptoms"/><Button title="Search Doctors" onPress={()=>navigation.navigate('SearchDoctors')}/></View>
}
