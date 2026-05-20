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
import * as WebBrowser from 'expo-web-browser';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import { useAuth } from '@/src/context/AuthContext';
import client from '@/src/api/client';
import { saveToken } from '@/src/auth/storage';

WebBrowser.maybeCompleteAuthSession();

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type FormData = z.infer<typeof schema>;

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export default function LoginScreen() {
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
      const res = await client.post<{ accessToken: string }>('/auth/login', data);
      await signIn(res.data.accessToken);
    } catch {
      Toast.show({ type: 'error', text1: t('auth.loginError') });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const result = await WebBrowser.openAuthSessionAsync(
      `${API_BASE}/auth/google`,
      'tripwise://auth/callback',
    );
    if (result.type === 'success' && result.url) {
      const token = new URL(result.url).searchParams.get('token');
      if (token) await signIn(token);
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
          <Text style={[styles.title, { color: c.primary }]}>Tripwise</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>{t('auth.login')}</Text>
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
              />
            )}
          />

          <Button
            label={loading ? t('common.loading') : t('auth.login')}
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            style={styles.submitBtn}
          />
        </View>

        <View style={styles.dividerRow}>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <Text style={[styles.dividerText, { color: c.mutedFg }]}>ou</Text>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
        </View>

        <View style={styles.oauthButtons}>
          <Button
            label={t('auth.googleLogin')}
            onPress={handleGoogleLogin}
            variant="secondary"
          />
        </View>

        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.switchLink}>
            <Text style={[styles.switchText, { color: c.primary }]}>{t('auth.noAccount')}</Text>
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
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: FontSizes.sm },
  oauthButtons: { gap: Spacing[3] },
  switchLink: { alignItems: 'center', paddingVertical: Spacing[2] },
  switchText: { fontSize: FontSizes.sm },
});
