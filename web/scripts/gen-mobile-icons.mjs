// One-shot mobile brand asset generator — renders the Expo app icons from the
// verygoodtrip "V" route mark. Lives in web/ because that is where `sharp`
// (a Next.js dependency) resolves; it writes into ../mobile/assets/images.
// Run from web/: `node scripts/gen-mobile-icons.mjs`
import sharp from 'sharp';
import { join } from 'node:path';

const OUT = join(process.cwd(), '..', 'mobile', 'assets', 'images');

// Brand tokens
const ACCENT = '#4D8BFF';
const SURFACE = '#181612';
const BG = '#0E0C0A';

// "V" route mark in a 48-unit space. native inset (x10–38) ≈ 58% width,
// which sits safely inside the Android adaptive 66% safe zone.
const mark = (color, sw = 2.8, baseline = true) => `
  ${baseline ? `<line x1="9" y1="38" x2="39" y2="38" stroke="${color}" stroke-opacity="0.25" stroke-width="1" stroke-dasharray="1.5 2.5"/>` : ''}
  <path d="M10 15 L24 34 L38 15" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="10" cy="15" r="3" fill="none" stroke="${color}" stroke-width="${sw - 0.5}"/>
  <circle cx="38" cy="15" r="3.2" fill="${color}"/>`;

// iOS app icon — full-bleed dark fill + accent mark (iOS applies its own mask,
// so no rounded corners / transparency). Mark enlarged ~1.25× and recentred.
const iconIOS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <rect width="48" height="48" fill="${BG}"/>
  <g transform="translate(24 25) scale(1.25) translate(-24 -25)">${mark(ACCENT, 2.8)}</g>
</svg>`;

// Expo web favicon — accent tile + dark mark (favicon on light)
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">
  <rect width="96" height="96" rx="21.1" fill="${ACCENT}"/>
  <g transform="translate(14.4 14.4) scale(1.4)" fill="none">${mark(BG, 2.6, false)}</g>
</svg>`;

// Android adaptive foreground — accent mark on transparent (inside safe zone)
const adaptiveFg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">${mark(ACCENT, 2.8)}</svg>`;

// Android adaptive background — solid dark surface
const adaptiveBg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="${SURFACE}"/></svg>`;

// Android themed (monochrome) — white silhouette on transparent (system tints it)
const monochrome = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">${mark('#FFFFFF', 2.8)}</svg>`;

// Splash mark — accent mark on transparent (reads on light or dark splash)
const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">${mark(ACCENT, 2.6)}</svg>`;

const png = (svg, size, out) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(OUT, out));

await Promise.all([
  png(iconIOS, 1024, 'icon.png'),
  png(favicon, 48, 'favicon.png'),
  png(adaptiveFg, 1024, 'android-icon-foreground.png'),
  png(adaptiveBg, 1024, 'android-icon-background.png'),
  png(monochrome, 1024, 'android-icon-monochrome.png'),
  png(splash, 1024, 'splash-icon.png'),
]);

console.log('Mobile brand assets generated in mobile/assets/images/');
