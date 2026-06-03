import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  DeviceEventEmitter,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts, FontSize, Radius, Spacing } from '@/constants/theme';
import { Eyebrow } from '@/src/components/ui/Eyebrow';
import { Button } from '@/src/components/ui/Button';
import { useReducedMotion } from '@/src/hooks/useReducedMotion';
import { hasSeenOnboarding, markOnboardingSeen, ONBOARDING_OPEN_EVENT } from '@/src/lib/onboarding';
import client from '@/src/api/client';

interface MeResponse {
  id: string;
}

// The 7 step keys (welcome + each key screen) — copy lives in i18next `onboarding.*`.
const STEP_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'] as const;
const TOTAL = STEP_KEYS.length;

/**
 * OnboardingTour — self-contained RN editorial-dark carousel (ONB-01, mobile
 * mirror of the web tour). On mount it reads the authenticated user id from
 * `/auth/me` and auto-opens ONCE per user when the per-user SecureStore flag is
 * unset (ONB-5). A `DeviceEventEmitter` `ONBOARDING_OPEN_EVENT` listener re-opens
 * it on demand regardless of the flag (ONB-4 replay). Skip / finish / dismiss all
 * mark the flag and close. Dismissible, never blocks navigation, honors
 * reduced motion. Editorial display font only (D-11); no new dependency; no backend.
 */
export function OnboardingTour() {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];
  const reduced = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Resolve the user id, auto-show on unset flag, and wire the replay event.
  useEffect(() => {
    mountedRef.current = true;
    let resolvedId: string | null = null;

    client
      .get<MeResponse>('/auth/me')
      .then(async (r) => {
        const id = r.data?.id;
        if (!id) return;
        resolvedId = id;
        if (!mountedRef.current) return;
        setUserId(id);
        const seen = await hasSeenOnboarding(id);
        if (mountedRef.current && !seen) {
          setStep(0);
          setOpen(true);
        }
      })
      .catch(() => {
        // No authenticated user / network error → never auto-show.
      });

    const sub = DeviceEventEmitter.addListener(ONBOARDING_OPEN_EVENT, () => {
      if (!mountedRef.current) return;
      // Replay always opens, even when the flag is set. Backfill the id if the
      // /auth/me read has resolved by now.
      if (!userId && resolvedId) setUserId(resolvedId);
      setStep(0);
      setOpen(true);
    });

    return () => {
      mountedRef.current = false;
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = useCallback(() => {
    if (userId) void markOnboardingSeen(userId);
    setOpen(false);
  }, [userId]);

  const goNext = useCallback(() => {
    setStep((s) => Math.min(s + 1, TOTAL - 1));
  }, []);

  const goPrev = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const isLast = step === TOTAL - 1;
  const key = STEP_KEYS[step];

  return (
    <Modal
      animationType={reduced ? 'none' : 'fade'}
      transparent
      visible={open}
      onRequestClose={dismiss}
    >
      <View style={[styles.backdrop, { backgroundColor: withBackdropAlpha(c.bg) }]}>
        <View
          style={[
            styles.panel,
            { backgroundColor: c.surface, borderColor: c.hairline },
          ]}
        >
          <Eyebrow>{t('onboarding.step', { n: step + 1, total: TOTAL })}</Eyebrow>

          <Text style={[styles.title, { color: c.ink }]}>
            {t(`onboarding.${key}Title` as never)}
          </Text>
          <Text style={[styles.body, { color: c.ink2 }]}>
            {t(`onboarding.${key}Body` as never)}
          </Text>

          <View style={styles.dots}>
            {STEP_KEYS.map((dotKey, i) => (
              <View
                key={dotKey}
                style={[
                  styles.dot,
                  i === step
                    ? { backgroundColor: c.accent, width: 18 }
                    : { backgroundColor: c.surface2 },
                ]}
              />
            ))}
          </View>

          <View style={styles.controls}>
            <TouchableOpacity onPress={dismiss} activeOpacity={0.7} style={styles.skipBtn}>
              <Text style={[styles.skipLabel, { color: c.mutedText }]}>{t('onboarding.skip')}</Text>
            </TouchableOpacity>

            <View style={styles.navBtns}>
              {step > 0 && (
                <Button
                  label={t('onboarding.prev')}
                  onPress={goPrev}
                  variant="secondary"
                  size="sm"
                />
              )}
              {isLast ? (
                <Button label={t('onboarding.finish')} onPress={dismiss} size="sm" />
              ) : (
                <Button label={t('onboarding.next')} onPress={goNext} size="sm" />
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Translucent scrim over the page bg (`#RRGGBB` → `#RRGGBBd9` ~85%). */
function withBackdropAlpha(hex: string): string {
  return `${hex}d9`;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[6],
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing[6],
    gap: Spacing[3],
  },
  // Editorial display font, weight 700 only (D-11).
  title: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    fontSize: FontSize.display,
    marginTop: Spacing[1],
  },
  body: {
    fontFamily: Fonts.displayRegular,
    fontWeight: '400',
    fontSize: FontSize.body,
    lineHeight: FontSize.body * 1.5,
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginTop: Spacing[2],
    marginBottom: Spacing[2],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipBtn: {
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[1],
  },
  skipLabel: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    fontSize: FontSize.body,
  },
  navBtns: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
});
