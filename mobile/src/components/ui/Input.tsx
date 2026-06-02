import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, hint, containerStyle, ...props }: InputProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: c.ink }]}>{label}</Text>}
      <TextInput
        {...props}
        style={[
          styles.input,
          {
            backgroundColor: c.surface,
            borderColor: error ? c.fuelGas : focused ? c.accent : c.hairline,
            color: c.ink,
          },
          props.style,
        ]}
        placeholderTextColor={c.mutedText}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      />
      {error && <Text style={[styles.error, { color: c.fuelGas }]}>{error}</Text>}
      {hint && !error && <Text style={[styles.hint, { color: c.mutedText }]}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  label: { fontFamily: Fonts.display, fontSize: FontSizes.sm, fontWeight: '700', marginBottom: 2 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    fontSize: FontSizes.base,
  },
  error: { fontSize: FontSizes.xs },
  hint: { fontSize: FontSizes.xs },
});
