// Per-user, per-device onboarding "seen" persistence (ONB-3 — client-side only, no backend).
//
// The seen flag is a non-sensitive boolean stored in localStorage, keyed by the user's own id
// (already present in their JWT/cookie). Worst-case tampering only re-shows or hides a cosmetic
// tour — no security or data impact (threat register T-08-01-01/02).

/**
 * Window event that re-opens the onboarding tour on demand (ONB-4 replay from Settings),
 * regardless of the per-user seen flag.
 */
export const ONBOARDING_OPEN_EVENT = 'verygoodtrip:onboarding:open';

function seenKey(userId: string): string {
  return `verygoodtrip.onboarding.seen.${userId}`;
}

/**
 * Returns true only when the current user has already seen the onboarding tour on this device.
 * SSR-safe: returns false on the server (no `window`). Any storage exception → false.
 */
export function hasSeenOnboarding(userId: string): boolean {
  if (typeof window === 'undefined' || !userId) return false;
  try {
    return window.localStorage.getItem(seenKey(userId)) === '1';
  } catch {
    return false;
  }
}

/**
 * Marks the onboarding tour as seen for the given user on this device.
 * SSR-safe and never throws (storage exceptions are swallowed).
 */
export function markOnboardingSeen(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.setItem(seenKey(userId), '1');
  } catch {
    // localStorage unavailable (private mode / quota) — the tour will simply re-show; non-fatal.
  }
}
