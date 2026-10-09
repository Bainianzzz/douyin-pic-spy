// Copy the built userscript to the repo root so the raw install URL keeps working.
import { copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = 'douyin-pic-spy.user.js';

copyFileSync(resolve(root, 'dist', file), resolve(root, file));
console.log(`[copy-dist] dist/${file} -> ${file}`);
