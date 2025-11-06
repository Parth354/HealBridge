import React from 'react';
import { TextInput, TextInputProps, View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from './theme';
import { Text } from './Text';

interface InputProps extends TextInputProps {
  label?: string;
}

export function Input({ label, style, multiline, ...props }: InputProps) {
  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text variant="body" style={styles.label}>
          {label}
        </Text>
      )}
      <View style={[
        styles.inputContainer,
        multiline && { height: 80 }
      ]}>
        <TextInput
          {...props}
          style={[
            styles.input,
            multiline && { height: 76, textAlignVertical: 'top' }
          ]}
          placeholderTextColor={colors.muted}
          multiline={multiline}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    marginBottom: spacing.xs,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 42,
    justifyContent: 'center',
  },
  input: {
    color: colors.text,
    flex: 1,
    padding: 0,
  },
});
