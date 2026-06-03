import * as SecureStore from 'expo-secure-store';

/**
 * Per-user onboarding "seen" flag (mobile mirror of web `web/src/lib/onboarding.ts`).
 *
 * ONB-3 — the flag is stored client-side per-user/per-device in `expo-secure-store`
 * (no backend, no migration). It is a non-sensitive cosmetic boolean keyed by the
 * authenticated user's own id (already present in their JWT). Both helpers swallow
 * any storage error so they NEVER throw — a storage failure simply means the tour
 * shows again (cosmetic only).
 */

/** App-local DeviceEventEmitter event that re-opens the tour regardless of the flag (ONB-4 replay). */
export const ONBOARDING_OPEN_EVENT = 'verygoodtrip:onboarding:open';

const SEEN_VALUE = '1';

/** SecureStore key for the per-user seen flag — exactly `verygoodtrip.onboarding.seen.<userId>`. */
function seenKey(userId: string): string {
  return `verygoodtrip.onboarding.seen.${userId}`;
}

/**
 * Resolves `true` only when the user has previously finished/skipped the tour.
 * Any read error (or unset key) resolves `false` (→ the tour can auto-show).
 */
export async function hasSeenOnboarding(userId: string): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(seenKey(userId));
    return value === SEEN_VALUE;
  } catch {
    return false;
  }
}

/** Marks the tour as seen for this user. Never throws (best-effort persistence). */
export async function markOnboardingSeen(userId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(seenKey(userId), SEEN_VALUE);
  } catch {
    // Best-effort: a persistence failure only means the tour may show again.
  }
}
