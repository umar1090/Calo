/**
 * Builds NutriTrack as one self-contained HTML body for a hosted preview page:
 * JS, CSS and fonts inlined, no <html>/<head>/<body> wrapper (the host adds it).
 *
 *   node scripts/build-artifact.mjs [output.html]
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = process.argv[2] ?? `${root}dist-artifact/nutritrack.html`;
execFileSync(process.execPath, [`${root}node_modules/vite/bin/vite.js`, 'build', '--mode', 'artifact'], { cwd: root, stdio: 'inherit' });

const dir = `${root}dist-artifact/assets/`;
const files = readdirSync(dir);
const js = files.filter((f) => f.endsWith('.js'));
const css = files.filter((f) => f.endsWith('.css'));
if (js.length !== 1) throw new Error(`Expected one JS bundle, found ${js.length}`);
const script = readFileSync(dir + js[0], 'utf8').replace(/<\/script/gi, '<\\/script');
const styles = css.map((f) => readFileSync(dir + f, 'utf8')).join('\n').replace(/<\/style/gi, '<\\/style');

const html = `<title>NutriTrack</title>
<meta name="description" content="Personal nutrition and fitness companion built around Indian home food.">
<meta name="theme-color" content="#FAF6EE">
<style>${styles}</style>
<div id="root"></div>
<script type="module">${script}</script>
`;
writeFileSync(out, html);
console.log(`Wrote ${out} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
