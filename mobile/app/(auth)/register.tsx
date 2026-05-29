import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { Wordmark } from '@/src/components/ui/Wordmark';
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import { useAuth } from '@/src/context/AuthContext';
import client from '@/src/api/client';

const schema = z
  .object({
    email: z.string().email(),
    password: z
      .string()
      .min(8)
      .regex(/\d/),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'mismatch',
  });
type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await client.post<{ accessToken: string }>('/auth/register', {
        email: data.email,
        password: data.password,
      });
      await signIn(res.data.accessToken);
    } catch {
      Toast.show({ type: 'error', text1: t('auth.registerError') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: c.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Wordmark size={32} color={c.text} />
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>{t('auth.register')}</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label={t('auth.email')}
                placeholder="email@exemple.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email ? t('auth.emailInvalid') : undefined}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label={t('auth.password')}
                placeholder="••••••••"
                secureTextEntry
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={
                  errors.password?.type === 'too_small'
                    ? t('auth.passwordMin')
                    : errors.password
                    ? t('auth.passwordNumber')
                    : undefined
                }
              />
            )}
          />
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label={t('auth.confirmPassword')}
                placeholder="••••••••"
                secureTextEntry
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirmPassword ? t('auth.passwordMismatch') : undefined}
              />
            )}
          />

          <Button
            label={loading ? t('common.loading') : t('auth.register')}
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            style={styles.submitBtn}
          />
        </View>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.switchLink}>
            <Text style={[styles.switchText, { color: c.primary }]}>{t('auth.alreadyAccount')}</Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: Spacing[6], justifyContent: 'center', gap: Spacing[6] },
  header: { alignItems: 'center', gap: Spacing[1] },
  title: { fontSize: 32, fontWeight: '800' },
  subtitle: { fontSize: FontSizes.lg },
  form: { gap: Spacing[4] },
  submitBtn: { marginTop: Spacing[2] },
  switchLink: { alignItems: 'center', paddingVertical: Spacing[2] },
  switchText: { fontSize: FontSizes.sm },
});
