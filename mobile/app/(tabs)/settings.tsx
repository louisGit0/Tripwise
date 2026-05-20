import React, { useState } from 'react';
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
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { useAuth } from '@/src/context/AuthContext';
import Constants from 'expo-constants';

type ThemeChoice = 'light' | 'dark' | 'system';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { signOut } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>('system');

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
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.pageTitle, { color: c.text }]}>{t('settings.title')}</Text>

      <Card>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>{t('settings.theme')}</Text>
          <View style={styles.row}>
            {(['light', 'dark', 'system'] as ThemeChoice[]).map((choice) => (
              <TouchableOpacity
                key={choice}
                style={[
                  styles.optionBtn,
                  {
                    backgroundColor: themeChoice === choice ? c.primary : c.muted,
                    borderColor: themeChoice === choice ? c.primary : c.border,
                  },
                ]}
                onPress={() => applyTheme(choice)}
              >
                <Text style={{ color: themeChoice === choice ? '#fff' : c.text, fontSize: FontSizes.sm }}>
                  {t(`settings.theme${choice.charAt(0).toUpperCase() + choice.slice(1)}` as never)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>{t('settings.language')}</Text>
          <View style={styles.row}>
            {(['fr', 'en'] as const).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.optionBtn,
                  {
                    backgroundColor: i18n.language === lang ? c.primary : c.muted,
                    borderColor: i18n.language === lang ? c.primary : c.border,
                  },
                ]}
                onPress={() => changeLanguage(lang)}
              >
                <Text style={{ color: i18n.language === lang ? '#fff' : c.text, fontSize: FontSizes.sm }}>
                  {lang === 'fr' ? t('settings.langFr') : t('settings.langEn')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>{t('settings.account')}</Text>
          <Button label={t('settings.logout')} onPress={handleLogout} variant="destructive" />
        </View>
      </Card>

      <Text style={[styles.version, { color: c.mutedFg }]}>
        {t('settings.version')} {version}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing[4], gap: Spacing[3] },
  pageTitle: { fontSize: FontSizes['2xl'], fontWeight: '700', marginTop: Spacing[2] },
  section: { gap: Spacing[3] },
  sectionTitle: { fontSize: FontSizes.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', gap: Spacing[2] },
  optionBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  version: { textAlign: 'center', fontSize: FontSizes.xs, marginTop: Spacing[4] },
});
