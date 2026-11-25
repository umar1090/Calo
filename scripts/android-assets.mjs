/**
 * Renders the NutriTrack launcher icons and splash images for the Android app
 * from the logo SVG (run after `npx cap add android`).
 *
 *   node scripts/android-assets.mjs
 */
import { chromium } from 'playwright';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const RES = new URL('../android/app/src/main/res/', import.meta.url).pathname;
const SAGE = '#587650';
const CREAM = '#FAF6EE';
const CLAY = '#DE925C';

// Leaf + dot artwork in a 64-unit box (same as the in-app logo).
const art = `<path d="M19 40c0-10 8-19 20-21-1 12-9 21-20 21z" fill="${CREAM}"/>
  <path d="M21 40c5-6 10-10 16-14" stroke="${SAGE}" stroke-width="2" stroke-linecap="round" fill="none"/>
  <circle cx="42" cy="42" r="7" fill="${CLAY}"/>`;

const svg = {
  square: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${SAGE}"/>${art}</svg>`,
  round: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${SAGE}"/>${art}</svg>`,
  // Adaptive-icon foreground: 108-unit canvas, artwork centred inside the 66-unit safe zone.
  foreground: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><g transform="translate(54 54) scale(1.55) translate(-34 -34)">${art}</g></svg>`,
};

const LAUNCHER = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const FOREGROUND = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

function pngSize(path) {
  const b = readFileSync(path);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const browser = await chromium.launch();
const page = await browser.newPage();

async function render(markup, w, h, out, background = 'transparent') {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0;background:${background};width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center">${markup}</body></html>`);
  await page.screenshot({ path: out, omitBackground: background === 'transparent', clip: { x: 0, y: 0, width: w, height: h } });
}

for (const [dpi, size] of Object.entries(LAUNCHER)) {
  const sized = (s) => s.replace('<svg ', `<svg width="${size}" height="${size}" `);
  await render(sized(svg.square), size, size, `${RES}mipmap-${dpi}/ic_launcher.png`);
  await render(sized(svg.round), size, size, `${RES}mipmap-${dpi}/ic_launcher_round.png`);
  const f = FOREGROUND[dpi];
  await render(svg.foreground.replace('<svg ', `<svg width="${f}" height="${f}" `), f, f, `${RES}mipmap-${dpi}/ic_launcher_foreground.png`);
}
writeFileSync(`${RES}values/ic_launcher_background.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${SAGE}</color>\n</resources>\n`);

// Splash: cream background with the logo, at each existing splash image's size.
for (const dir of readdirSync(RES).filter((d) => d.startsWith('drawable'))) {
  const file = `${RES}${dir}/splash.png`;
  if (!existsSync(file)) continue;
  const { w, h } = pngSize(file);
  const logo = Math.round(Math.min(w, h) * 0.28);
  await render(svg.square.replace('<svg ', `<svg width="${logo}" height="${logo}" `), w, h, file, CREAM);
}

await browser.close();
console.log('Android icons and splash images written.');
