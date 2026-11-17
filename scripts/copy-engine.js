// Copy the Stockfish 19 lite single-threaded engine files from the npm package
// into public/engine/ so Vite serves them as static assets (SPEC §5.5). The .js
// finds its .wasm by its own file name, so the names are kept identical.
// Re-runnable; run from `postinstall` and `npm run copy-engine`.
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = join(root, 'node_modules', 'stockfish');
const outDir = join(root, 'public', 'engine');

const files = [
  ['bin/stockfish-19-lite-single.js', 'stockfish-19-lite-single.js'],
  ['bin/stockfish-19-lite-single.wasm', 'stockfish-19-lite-single.wasm'],
  ['Copying.txt', 'Copying.txt'],
];

mkdirSync(outDir, { recursive: true });
for (const [rel, name] of files) {
  const from = join(pkg, rel);
  if (!existsSync(from)) {
    console.error(`Missing ${from}\nRun "npm install" first.`);
    process.exit(1);
  }
  copyFileSync(from, join(outDir, name));
  console.log(`copied public/engine/${name}`);
}
console.log('Engine files ready in public/engine/');
