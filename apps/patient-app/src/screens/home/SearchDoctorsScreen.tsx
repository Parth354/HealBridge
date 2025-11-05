import React from 'react'
import { View, FlatList as RNFlatList } from 'react-native'
import { DoctorCard } from '../../components'
import { useDoctors } from 'api-client'
import type { Doctor } from 'api-client'

export default function SearchDoctorsScreen({ navigation }: any) {
    const { data } = useDoctors({ specialty: 'general', lat: 12.97, lon: 77.59, radiusKm: 10 })
    const list: Doctor[] = data ?? []
    return (
        <View style={{ flex: 1, padding: 12 }}>
            <RNFlatList<Doctor>
                data={list}
                keyExtractor={(i) => `${i.doctor_id}-${i.clinic_id}`}
                renderItem={({ item }) => (
                    <DoctorCard
                        data={{ name: item.name, rating: item.rating, meters: item.meters }}
                        onBook={() =>
                            navigation.navigate('Availability', {
                                doctorId: item.doctor_id,
                                clinicId: item.clinic_id
                            })
                        }
                    />

                )}
            />
        </View>
    )
}
