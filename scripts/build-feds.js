// Turns Lichess's fideFeds.ts into docs/fide-feds.json.
// Source: ui/analyse/src/study/fideFeds.ts — maps FIDE code -> [name, alpha2 | undefined].
// Output shape: { "KAZ": { "name": "Kazakhstan", "flag": "kz" }, ... } — one entry per line.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const srcPath = process.argv[2] || join(here, 'fideFeds.ts');
const outPath = join(here, '..', 'docs', 'fide-feds.json');

// flag-icons needs these instead of the plain alpha-2 code.
const FLAG_OVERRIDES = { ENG: 'gb-eng', SCO: 'gb-sct', WLS: 'gb-wls', KOS: 'xk' };
// No usable flag: render a globe (FID) or a grey 3-letter box.
const NO_FLAG = new Set(['FID', 'TPE', 'AHO']);

const src = readFileSync(srcPath, 'utf8');

// Each data line looks like:  KAZ: ['Kazakhstan', 'KZ'],  or  AHO: ['Netherlands Antilles', undefined],
const lineRe = /^\s*([A-Z]{3}):\s*\[\s*'((?:[^'\\]|\\.)*)'\s*,\s*(?:'([A-Za-z-]+)'|undefined)\s*\]/;

const out = {};
for (const line of src.split('\n')) {
  const m = line.match(lineRe);
  if (!m) continue;
  const code = m[1];
  const name = m[2].replace(/\\'/g, "'").replace(/ \*/g, '');
  const alpha2 = m[3]; // undefined when the source had `undefined`

  let flag;
  if (NO_FLAG.has(code)) flag = null;
  else if (FLAG_OVERRIDES[code]) flag = FLAG_OVERRIDES[code];
  else if (alpha2) flag = alpha2.toLowerCase();
  else flag = null;

  out[code] = { name, flag };
}

const body = Object.entries(out)
  .map(([code, v]) => `  ${JSON.stringify(code)}: ${JSON.stringify(v)}`)
  .join(',\n');
writeFileSync(outPath, `{\n${body}\n}\n`);

console.log(`Wrote ${Object.keys(out).length} entries to ${outPath}`);
for (const code of ['KAZ', 'ISR', 'FID', 'ENG']) {
  console.log(`  ${code}: ${JSON.stringify(out[code])}`);
}
