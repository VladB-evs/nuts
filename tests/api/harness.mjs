import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const root = new URL('../../', import.meta.url).pathname;
const migrationsDir = join(root, 'neon/migrations');
// esbuild ships with Vite, so the app's own `npm install` provides it
const { build } = createRequire(join(root, 'package.json'))('esbuild');

export const migrationFiles = () => readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
export const readMigration = (name) => readFileSync(join(migrationsDir, name), 'utf8');

/** A fresh in-memory database with every migration up to (and including) `upTo` applied. */
export async function loadDb(upTo, { afterEach } = {}) {
  const db = new PGlite();
  for (const f of migrationFiles()) {
    if (upTo && f > upTo) break;
    await db.exec(readMigration(f));
    if (afterEach) await afterEach(f, db);
  }
  return db;
}

/** The real API handler, wired to a fresh database and running as the restricted role. */
export async function makeApi(upTo) {
  const outDir = mkdtempSync(join(tmpdir(), 'nuts-api-'));
  const out = join(outDir, 'api.bundle.mjs');
  await build({
    entryPoints: [join(root, 'netlify/functions/api.mts')],
    bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error', external: ['node:*'],
    alias: { '@neondatabase/serverless': new URL('./neon-shim.mjs', import.meta.url).pathname },
  });
  process.env.DATABASE_URL = 'postgres://shim';
  const db = await loadDb(upTo);
  await db.exec('SET ROLE nuts_app'); // from here on everything is the restricted role, like production
  globalThis.__db = db;
  const handler = (await import(pathToFileURL(out).href)).default;
  const call = async (action, args = {}, cookie = '', ip = '10.0.0.1') => {
    const res = await handler(new Request('http://localhost/api', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie, 'x-nf-client-connection-ip': ip },
      body: JSON.stringify({ action, args }),
    }));
    return { status: res.status, body: await res.json(), cookie: res.headers.getSetCookie?.()[0]?.split(';')[0] || '' };
  };
  return { db, call };
}

/** Tiny assertion helpers shared by the suites. */
export function suite() {
  let pass = 0, fail = 0;
  return {
    async t(name, fn) {
      try { const r = await fn(); if (r === false) throw new Error('assertion false'); pass++; console.log('  ok  ', name); }
      catch (e) { fail++; console.log('  FAIL', name, '->', String(e.message).split('\n')[0]); }
    },
    async blocked(name, fn) {
      try { await fn(); fail++; console.log('  FAIL', name, '-> was allowed'); }
      catch (e) { pass++; console.log('  ok  ', name, '(blocked)'); }
    },
    summary() { console.log(`\n${pass} passed, ${fail} failed`); return fail === 0; },
  };
}
export const eq = (a, b, msg = '') => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`);
  return true;
};
