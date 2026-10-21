#!/usr/bin/env node
// Generates simple PLACEHOLDER app icons (charcoal + blue wrench) from SVG.
// Final store artwork is a release dependency (docs/mobile-release.md).
import sharp from 'sharp';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const out = resolve(import.meta.dirname, '../apps/mobile/assets/images');
mkdirSync(out, { recursive: true });
for (const f of ['expo-badge-white.png', 'expo-badge.png', 'expo-logo.png', 'logo-glow.png', 'react-logo.png', 'favicon.png']) {
  rmSync(resolve(out, f), { force: true });
}
const wrench = (color) =>
  `<path fill="${color}" d="M640 250a150 150 0 0 0-196 180L268 606a60 60 0 1 0 85 85l176-176a150 150 0 0 0 180-196l-92 92-80-20-20-80z"/>`;
const svg = (bg, fg, size = 1024, inset = 0) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-inset} ${-inset} ${1024 + inset * 2} ${1024 + inset * 2}">
  ${bg ? `<rect x="${-inset}" y="${-inset}" width="${1024 + inset * 2}" height="${1024 + inset * 2}" fill="${bg}"/>` : ''}${wrench(fg)}</svg>`;

await sharp(Buffer.from(svg('#16191D', '#6A9BEA'))).png().toFile(resolve(out, 'icon.png'));
await sharp(Buffer.from(svg(null, '#6A9BEA', 512))).png().toFile(resolve(out, 'splash-icon.png'));
await sharp(Buffer.from(svg(null, '#6A9BEA', 1024, 220))).png().toFile(resolve(out, 'android-icon-foreground.png'));
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#16191D' } }).png().toFile(resolve(out, 'android-icon-background.png'));
await sharp(Buffer.from(svg(null, '#FFFFFF', 1024, 220))).png().toFile(resolve(out, 'android-icon-monochrome.png'));
console.log('Placeholder icons written to', out);
