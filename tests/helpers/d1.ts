import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { D1Like } from '../../functions/_lib/db';

const require = createRequire(import.meta.url);

/** A D1-compatible wrapper over node:sqlite, so API logic is tested against a real SQL engine. */
export function makeD1(): D1Like {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  const dir = join(process.cwd(), 'migrations');
  for (const f of readdirSync(dir).filter((x: string) => x.endsWith('.sql')).sort()) db.exec(readFileSync(join(dir, f), 'utf8'));
  const stmt = (sql: string, args: unknown[] = []) => ({
    bind: (...a: unknown[]) => stmt(sql, a),
    first: async <T>() => (db.prepare(sql).get(...args) as T) ?? null,
    all: async <T>() => ({ results: db.prepare(sql).all(...args) as T[] }),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
  });
  return {
    prepare: (sql: string) => stmt(sql) as never,
    batch: async (list: { run: () => Promise<unknown> }[]) => { db.exec('BEGIN'); try { const out = []; for (const s of list) out.push(await s.run()); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; } },
  } as D1Like;
}

export class MemoryBucket {
  m = new Map<string, { body: Uint8Array; type?: string }>();
  async put(key: string, body: ArrayBuffer | Uint8Array, o?: { httpMetadata?: { contentType?: string } }) { this.m.set(key, { body: new Uint8Array(body), type: o?.httpMetadata?.contentType }); }
  async get(key: string) { const v = this.m.get(key); return v ? { body: v.body, arrayBuffer: async () => v.body.buffer, httpMetadata: { contentType: v.type } } : null; }
  async delete(key: string) { this.m.delete(key); }
}
