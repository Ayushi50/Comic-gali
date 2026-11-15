// Upserts validated catalog + stories into Cloudflare D1.
//   node scripts/publish-content.mjs            -> writes .cache/publish.sql (review it)
//   node scripts/publish-content.mjs --apply    -> also runs `wrangler d1 execute comic-gali --remote --file ...`
//   node scripts/publish-content.mjs --local    -> applies to the local D1 (wrangler pages dev)
// Validation is the same as `npm run content` (it is run first). Unpublished titles stay unpublished.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
execFileSync('node', [join(root, 'scripts/build-content.mjs')], { stdio: 'inherit' }); // validates, exits non-zero on error
const cat = JSON.parse(readFileSync(join(root, 'public/content/catalog.json'), 'utf8'));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const t = Date.now();
const sql = [];
for (const it of cat.items) {
  if (it.status !== 'available') continue; // coming-soon shelves are not served from D1
  let story;
  try { story = readFileSync(join(root, 'public/content/stories', `${it.id}.json`), 'utf8'); } catch { continue; }
  // Do not resurrect a title a moderator unpublished.
  sql.push(`INSERT INTO titles (id,catalog_json,status,rights,created_at,updated_at) VALUES (${q(it.id)},${q(JSON.stringify(it))},'published',${q(it.rights)},${t},${t}) ON CONFLICT(id) DO UPDATE SET catalog_json=excluded.catalog_json, rights=excluded.rights, updated_at=excluded.updated_at;`);
  sql.push(`INSERT INTO stories (title_id,json,updated_at) VALUES (${q(it.id)},${q(story)},${t}) ON CONFLICT(title_id) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at;`);
}
mkdirSync(join(root, '.cache'), { recursive: true });
const file = join(root, '.cache/publish.sql');
writeFileSync(file, sql.join('\n') + '\n');
console.log(`wrote ${file} (${sql.length / 2} titles)`);
if (process.argv.includes('--apply') || process.argv.includes('--local')) {
  const where = process.argv.includes('--local') ? '--local' : '--remote';
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'comic-gali', where, '--file', file], { stdio: 'inherit' });
}
