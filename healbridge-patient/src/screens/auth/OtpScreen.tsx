import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Input, Button, Text } from '../../components';
import { useRequestOtp, useVerifyOtp } from '../../packages/api-client/src';
import { useAuthStore, type AuthState } from '../../app/store/auth.store';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'Otp'>;

export default function OtpScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const req = useRequestOtp()
  const ver = useVerifyOtp()
  const setAuth = useAuthStore((s: AuthState) => s.setAuth)

  const normalizedPhone = useMemo(() => phone.replace(/\D/g, ''), [phone])
  const phoneValid = /^\d{10,15}$/.test(normalizedPhone)
  const codeValid = /^\d{4,8}$/.test(code.trim())

  const onSend = async () => {
    setError(null);
    if (!phoneValid) return setError(t('Enter a valid phone number'));
    try {
      await req.mutateAsync({ phone: normalizedPhone });
      setSent(true);
    } catch (e: any) {
      setError(e?.message || t('Failed to send OTP'));
    }
  };

  const onVerify = async () => {
    setError(null)
    if (!sent) return setError('Request OTP first')
    if (!codeValid) return setError('Enter a valid OTP')
    try {
      const d = await ver.mutateAsync({ phone: normalizedPhone, code: code.trim() })
      setAuth(d.token, d.user)
      navigation.replace('Profile')
    } catch (e: any) {
      setError(e?.message || 'Invalid OTP')
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="title" style={styles.title}>
        {sent ? t('Enter OTP') : t('Enter your phone number')}
      </Text>

      <View style={styles.inputContainer}>
        {!sent ? (
          <>
            <Input
              value={phone}
              onChangeText={setPhone}
              editable={!req.isPending && !ver.isPending}
              keyboardType="phone-pad"
              placeholder={t('Phone number (e.g. +91 9876543210)')}
              style={styles.input}
            />
            <Button 
              title={req.isPending ? t('Sending...') : t('Send OTP')} 
              onPress={onSend} 
              disabled={req.isPending || ver.isPending || !phoneValid}
              style={styles.button} 
            />
          </>
        ) : (
          <>
            <Text variant="body" style={styles.phoneText}>
              {t('OTP sent to')} {normalizedPhone}
            </Text>
            <Input
              value={code}
              onChangeText={setCode}
              editable={sent && !ver.isPending}
              keyboardType="number-pad"
              placeholder={t('Enter 6-digit OTP')}
              style={styles.input}
              maxLength={6}
            />
            <Button 
              title={ver.isPending ? t('Verifying...') : t('Verify OTP')} 
              onPress={onVerify} 
              disabled={!sent || !codeValid || ver.isPending}
              style={styles.button}
            />
            <Button
              title={t('Change phone number')}
              variant="outline"
              onPress={() => {
                setSent(false);
                setCode('');
                setError(null);
              }}
              style={styles.changePhone}
            />
          </>
        )}

        {error && (
          <Text variant="muted" style={[styles.error, { color: 'red' }]}>
            {error}
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
  },
  title: {
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    gap: 16,
  },
  input: {
    width: '100%',
  },
  button: {
    marginTop: 8,
  },
  phoneText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  changePhone: {
    marginTop: 16,
  },
  error: {
    textAlign: 'center',
    marginTop: 16,
  },
});
