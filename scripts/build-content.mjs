// Validates authored stories and writes public/content/stories/*.json + catalog.json
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public/content/stories');
mkdirSync(outDir, { recursive: true });
let errors = 0;
const fail = (m) => { console.error('✗', m); errors++; };

const files = readdirSync(join(root, 'content-src/stories')).filter((f) => f.endsWith('.mjs'));
for (const f of files) {
  const mod = (await import(pathToFileURL(join(root, 'content-src/stories', f)).href)).default;
  const perPage = 4;
  if (mod.panels.length !== mod.pageLayouts.length * perPage) fail(`${mod.id}: ${mod.panels.length} panels vs ${mod.pageLayouts.length} pages x ${perPage}`);
  mod.panels.forEach((p, i) => {
    p.id = `p${i + 1}`;
    if (!p.lines.length) fail(`${mod.id}/${p.id}: no lines`);
    p.lines.forEach((l, j) => {
      l.id = `${p.id}l${j + 1}`;
      if (l.speaker && !mod.characters[l.speaker]) fail(`${mod.id}/${l.id}: unknown speaker ${l.speaker}`);
      for (const lang of mod.langs) if (!l.text[lang]) fail(`${mod.id}/${l.id}: missing ${lang}`);
    });
    for (const lang of mod.langs) if (!p.alt[lang]) fail(`${mod.id}/${p.id}: missing alt ${lang}`);
  });
  writeFileSync(join(outDir, `${mod.id}.json`), JSON.stringify(mod));
  console.log('✓', mod.id, mod.langs.join(','), `${mod.panels.length} panels`);
}
const cat = JSON.parse(readFileSync(join(root, 'content-src/catalog.json'), 'utf8'));
const ids = new Set(files.map((f) => f.replace('.mjs', '')));
for (const it of cat.items) if (it.status === 'available' && !ids.has(it.id)) fail(`catalog ${it.id} has no story`);
writeFileSync(join(root, 'public/content/catalog.json'), JSON.stringify(cat));
console.log('✓ catalog', cat.items.length, 'items');
if (errors) process.exit(1);
