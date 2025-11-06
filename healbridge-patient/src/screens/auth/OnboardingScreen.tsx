import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from '../../components';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

type Props = NativeStackScreenProps<any, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी' }
  ];

  const handleLanguageChange = async (langCode: string) => {
    setSelectedLanguage(langCode);
    await i18n.changeLanguage(langCode);
  };

  return (
    <View style={styles.container}>
      <Text variant="title" style={styles.title}>{t('Welcome to HealBridge')}</Text>
      <Text variant="body" style={styles.subtitle}>{t('Choose your preferred language')}</Text>
      
      <View style={styles.languageContainer}>
        {languages.map(lang => (
          <Button
            key={lang.code}
            title={lang.name}
            variant={selectedLanguage === lang.code ? 'primary' : 'outline'}
            onPress={() => handleLanguageChange(lang.code)}
            style={styles.languageButton}
          />
        ))}
      </View>

      <Button
        title={t('Continue')}
        onPress={() => navigation.navigate('Otp')}
        style={styles.continueButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
  },
  title: {
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 30,
  },
  languageContainer: {
    gap: 12,
    marginBottom: 40,
  },
  languageButton: {
    marginVertical: 4,
  },
  continueButton: {
    marginTop: 20,
  },
});
