import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
  Appearance,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { Colors, Fonts, FontSize, FontSizes, Spacing } from '@/constants/theme';
import { SectionCard } from '@/src/components/ui/SectionCard';
import { Eyebrow } from '@/src/components/ui/Eyebrow';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { useAuth } from '@/src/context/AuthContext';
import client from '@/src/api/client';
import Constants from 'expo-constants';

interface ProfileResponse {
  id: string;
  email: string;
  displayName: string | null;
  locale: string | null;
  provider: string;
  createdAt: string;
}

type ThemeChoice = 'light' | 'dark' | 'system';

// Dark ink used as the LABEL color on the bright accent toggle (matches the
// accent-button contrast — never white-on-accent).
const ACCENT_INK = '#0e0c0a';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { signOut } = useAuth();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>('system');
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    let active = true;
    client
      .get<ProfileResponse>('/auth/me')
      .then((r) => {
        if (active) setDisplayName(r.data.displayName ?? '');
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleSaveName = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    setSavingName(true);
    try {
      const r = await client.patch('/users/me', { displayName: trimmed });
      const data = r.data as ProfileResponse;
      setDisplayName(data.displayName ?? '');
      Toast.show({ type: 'success', text1: t('settings.pseudoSaved') });
    } catch {
      Toast.show({ type: 'error', text1: t('common.error') });
    } finally {
      setSavingName(false);
    }
  };

  const applyTheme = (choice: ThemeChoice) => {
    setThemeChoice(choice);
    if (choice !== 'system') {
      Appearance.setColorScheme(choice);
    } else {
      Appearance.setColorScheme(null);
    }
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const handleLogout = () => {
    Alert.alert('', t('settings.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.logout'), style: 'destructive', onPress: signOut },
    ]);
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.container}>
      <View style={styles.headerTitle}>
        <Eyebrow>{t('nav.settings')}</Eyebrow>
        <Text style={[styles.pageTitle, { color: c.ink }]}>{t('settings.title')}</Text>
      </View>

      <SectionCard title={t('settings.theme')}>
        <View style={styles.row}>
          {(['light', 'dark', 'system'] as ThemeChoice[]).map((choice) => {
            const active = themeChoice === choice;
            return (
              <TouchableOpacity
                key={choice}
                style={[
                  styles.optionBtn,
                  active
                    ? { backgroundColor: c.accent, borderColor: c.accent }
                    : { backgroundColor: c.surface2, borderColor: c.hairline },
                ]}
                onPress={() => applyTheme(choice)}
              >
                <Text style={[styles.optionLabel, { color: active ? ACCENT_INK : c.ink }]}>
                  {t(`settings.theme${choice.charAt(0).toUpperCase() + choice.slice(1)}` as never)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard title={t('settings.language')}>
        <View style={styles.row}>
          {(['fr', 'en'] as const).map((lang) => {
            const active = i18n.language === lang;
            return (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.optionBtn,
                  active
                    ? { backgroundColor: c.accent, borderColor: c.accent }
                    : { backgroundColor: c.surface2, borderColor: c.hairline },
                ]}
                onPress={() => changeLanguage(lang)}
              >
                <Text style={[styles.optionLabel, { color: active ? ACCENT_INK : c.ink }]}>
                  {lang === 'fr' ? t('settings.langFr') : t('settings.langEn')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard title={t('settings.pseudo')}>
        <View style={styles.pseudoGroup}>
          <Input
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={40}
            autoCapitalize="words"
          />
          <Button
            label={t('settings.pseudoSave')}
            onPress={handleSaveName}
            loading={savingName}
            disabled={!displayName.trim()}
            size="sm"
          />
        </View>
      </SectionCard>

      <SectionCard title={t('settings.account')}>
        <Button label={t('settings.logout')} onPress={handleLogout} variant="destructive" />
      </SectionCard>

      <Text style={[styles.version, { color: c.mutedText }]}>
        {t('settings.version')} {version}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing[4], gap: Spacing[3] },
  headerTitle: { gap: 2, marginTop: Spacing[2] },
  pageTitle: { fontFamily: Fonts.display, fontSize: FontSizes['2xl'], fontWeight: '700' },
  row: { flexDirection: 'row', gap: Spacing[2] },
  pseudoGroup: { gap: Spacing[3] },
  optionBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  // Weight-constant: active never jumps weight (always display 700).
  optionLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: FontSizes.sm },
  version: {
    textAlign: 'center',
    fontFamily: Fonts.monoRegular,
    fontSize: FontSize.caption,
    marginTop: Spacing[4],
  },
});
