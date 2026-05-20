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
import { Colors, FontSizes, Spacing } from '@/constants/theme';

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
      {label && <Text style={[styles.label, { color: c.text }]}>{label}</Text>}
      <TextInput
        {...props}
        style={[
          styles.input,
          {
            backgroundColor: c.inputBg,
            borderColor: error ? c.destructive : focused ? c.primary : c.inputBorder,
            color: c.text,
          },
          props.style,
        ]}
        placeholderTextColor={c.placeholder}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      />
      {error && <Text style={[styles.error, { color: c.destructive }]}>{error}</Text>}
      {hint && !error && <Text style={[styles.hint, { color: c.mutedFg }]}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  label: { fontSize: FontSizes.sm, fontWeight: '500', marginBottom: 2 },
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
