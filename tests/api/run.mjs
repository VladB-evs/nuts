import { spawnSync } from 'node:child_process';

// Runs each suite in its own process (they each need a clean database).
let failed = false;
for (const file of ['migrations.test.mjs', 'api.test.mjs', 'neon-auth.test.mjs']) {
  console.log(`\n=========== ${file} ===========`);
  const r = spawnSync(process.execPath, [new URL(file, import.meta.url).pathname], { stdio: 'inherit' });
  if (r.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
