import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Text, Input } from '../../components';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../../app/store/auth.store';

type Props = NativeStackScreenProps<any, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  
  const [form, setForm] = useState({
    name: user?.name || '',
    dateOfBirth: user?.dateOfBirth || '',
    gender: user?.gender || '',
    allergies: user?.allergies || '',
    conditions: user?.conditions || '',
    emergencyContact: user?.emergencyContact || ''
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!form.name.trim()) {
      return setError(t('Please enter your name'));
    }
    // Here you would typically update the user profile
    // For now, we'll just navigate to Home
    navigation.replace('Home');
  };

  return (
    <ScrollView style={styles.container}>
      <Text variant="title" style={styles.title}>
        {t('Complete Your Profile')}
      </Text>

      <View style={styles.form}>
        <Input
          label={t('Full Name')}
          value={form.name}
          onChangeText={name => setForm(f => ({ ...f, name }))}
          placeholder={t('Enter your full name')}
          style={styles.input}
        />

        <Input
          label={t('Date of Birth')}
          value={form.dateOfBirth}
          onChangeText={dateOfBirth => setForm(f => ({ ...f, dateOfBirth }))}
          placeholder="YYYY-MM-DD"
          style={styles.input}
        />

        <Input
          label={t('Gender')}
          value={form.gender}
          onChangeText={gender => setForm(f => ({ ...f, gender }))}
          placeholder={t('Enter your gender')}
          style={styles.input}
        />

        <Input
          label={t('Allergies (if any)')}
          value={form.allergies}
          onChangeText={allergies => setForm(f => ({ ...f, allergies }))}
          placeholder={t('List any allergies')}
          multiline
          style={styles.input}
        />

        <Input
          label={t('Medical Conditions (if any)')}
          value={form.conditions}
          onChangeText={conditions => setForm(f => ({ ...f, conditions }))}
          placeholder={t('List any medical conditions')}
          multiline
          style={styles.input}
        />

        <Input
          label={t('Emergency Contact')}
          value={form.emergencyContact}
          onChangeText={emergencyContact => setForm(f => ({ ...f, emergencyContact }))}
          placeholder={t('Emergency contact number')}
          keyboardType="phone-pad"
          style={styles.input}
        />

        {error && (
          <Text variant="muted" style={[styles.error, { color: 'red' }]}>
            {error}
          </Text>
        )}

        <Button
          title={t('Continue')}
          onPress={handleSubmit}
          style={styles.button}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  title: {
    textAlign: 'center',
    marginVertical: 24,
  },
  form: {
    padding: 20,
    gap: 16,
  },
  input: {
    width: '100%',
  },
  button: {
    marginTop: 24,
  },
  error: {
    textAlign: 'center',
  },
});
