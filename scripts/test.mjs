// Runs every src/**/*.test.ts with Node's built-in test runner. The files are bundled with
// esbuild (already installed as a Vite dependency), so no extra test dependency is needed.
import { build } from 'esbuild';
import { readdirSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const tests = readdirSync('src', { recursive: true })
  .filter((f) => String(f).endsWith('.test.ts'))
  .map((f) => join('src', String(f)));

if (tests.length === 0) {
  console.log('No tests found.');
  process.exit(0);
}

const outdir = mkdtempSync(join(tmpdir(), 'nuts-tests-'));
try {
  await build({
    entryPoints: tests,
    outdir,
    bundle: true,
    platform: 'node',
    format: 'esm',
    outExtension: { '.js': '.mjs' },
    logLevel: 'warning',
  });
  const files = readdirSync(outdir, { recursive: true })
    .filter((f) => String(f).endsWith('.mjs'))
    .map((f) => join(outdir, String(f)));
  const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(outdir, { recursive: true, force: true });
}
