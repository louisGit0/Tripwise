// One-shot brand asset generator — renders PWA / favicon / OG PNGs from the
// verygoodtrip "V" route mark. Run from web/: `node scripts/gen-icons.mjs`
// Requires `sharp` (already a Next.js dependency).
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PUB = join(process.cwd(), 'public');

// Brand tokens
const ACCENT = '#4D8BFF';
const SURFACE = '#181612';
const HAIRLINE = '#3A3328';
const BG = '#0E0C0A';
const INK = '#F0ECE4';

// "V" route mark group, drawn in a 48-unit space. `color` tints stroke+dot.
const markGroup = (color, sw = 2.8) => `
  <path d="M10 15 L24 34 L38 15" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="10" cy="15" r="3" fill="none" stroke="${color}" stroke-width="${sw - 0.5}"/>
  <circle cx="38" cy="15" r="3.2" fill="${color}"/>`;

// Dark primary tile (PWA on dark / apple-touch)
const darkTile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">
  <rect x="0.5" y="0.5" width="95" height="95" rx="21.1" fill="${SURFACE}" stroke="${HAIRLINE}"/>
  <g transform="translate(16.32 16.32) scale(1.32)" stroke="${ACCENT}" fill="none">
    <line x1="6" y1="38" x2="42" y2="38" stroke-opacity="0.25" stroke-width="1" stroke-dasharray="1.5 2.5"/>
    ${markGroup(ACCENT, 3.2)}
  </g>
</svg>`;

// Accent tile (favicon on light)
const accentTile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">
  <rect width="96" height="96" rx="21.1" fill="${ACCENT}"/>
  <g transform="translate(14.4 14.4) scale(1.4)" fill="none">${markGroup(BG, 2.6)}</g>
</svg>`;

// Maskable (full-bleed accent, mark inside the 80% safe zone — no rounded corners)
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">
  <rect width="96" height="96" fill="${ACCENT}"/>
  <g transform="translate(24 24) scale(1.0)" fill="none">${markGroup(BG, 2.8)}</g>
</svg>`;

// OG image 1200×630 — mark + wordmark centred on carbon background
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <rect width="1200" height="630" fill="${BG}"/>
  <g transform="translate(600 230)">
    <g transform="translate(-72 -72) scale(3.0)" stroke="${ACCENT}" fill="none">
      <line x1="6" y1="38" x2="42" y2="38" stroke-opacity="0.25" stroke-width="1" stroke-dasharray="1.5 2.5"/>
      ${markGroup(ACCENT, 3.0)}
    </g>
  </g>
  <text x="600" y="470" text-anchor="middle"
    font-family="'Space Grotesk','Segoe UI',Arial,sans-serif" font-size="84" font-weight="700"
    letter-spacing="-3">
    <tspan fill="${INK}">very</tspan><tspan fill="${ACCENT}">good</tspan><tspan fill="${INK}">trip</tspan><tspan fill="${ACCENT}">.</tspan>
  </text>
  <text x="600" y="540" text-anchor="middle"
    font-family="'Space Grotesk','Segoe UI',Arial,sans-serif" font-size="28" font-weight="500"
    letter-spacing="2" fill="#7A7163">Calculez le coût de vos trajets</text>
</svg>`;

const renderPng = (svg, size, out) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(PUB, out));

const renderRect = (svg, w, h, out) =>
  sharp(Buffer.from(svg)).resize(w, h).png().toFile(join(PUB, out));

await Promise.all([
  // Favicons — accent tile
  renderPng(accentTile, 16, 'favicon-16.png'),
  renderPng(accentTile, 32, 'favicon-32.png'),
  renderPng(accentTile, 48, 'favicon-48.png'),
  // Touch + PWA — dark primary tile
  renderPng(darkTile, 180, 'apple-touch-icon.png'),
  renderPng(darkTile, 192, 'icon-192.png'),
  renderPng(darkTile, 512, 'icon-512.png'),
  // Maskable — accent full-bleed
  renderPng(maskable, 512, 'icon-512-maskable.png'),
  // Open Graph
  renderRect(og, 1200, 630, 'og-image.png'),
]);

console.log('Brand assets generated in public/');
