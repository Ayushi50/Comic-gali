// CI check: audio manifest is consistent with files on disk and within the size budget. Passes when there is no generated audio yet.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mp = join(root, 'public/audio/manifest.json');
if (!existsSync(mp)) { console.log('no generated audio (browser speech fallback): ok'); process.exit(0); }
const m = JSON.parse(readFileSync(mp, 'utf8')); const budget = JSON.parse(readFileSync(join(root, 'content-src/voices.json'), 'utf8')).budget.maxTotalMB;
let bad = 0, bytes = 0;
for (const [k, v] of Object.entries(m.entries)) { const [s, l] = k.split('/'); const f = join(root, 'public/audio', s, l, v.file); if (!existsSync(f)) { console.error('missing', f); bad++; } else bytes += statSync(f).size; }
if (bytes / 1e6 > budget) { console.error(`audio ${(bytes / 1e6).toFixed(1)} MB over budget ${budget} MB`); bad++; }
console.log(`audio: ${Object.keys(m.entries).length} files, ${(bytes / 1e6).toFixed(1)} MB`); process.exit(bad ? 1 : 0);
