import { loadDb, readMigration, suite, eq } from './harness.mjs';

const { t, blocked, summary } = suite();

// ============================ 005: FIXED -> COMPLETED etc. ============================
console.log('\nmigration 005 on legacy data');
const O = '11111111-1111-1111-1111-111111111111', U = '22222222-2222-2222-2222-222222222222';
let historyBefore = 0;
const db5 = await loadDb('005_status_and_issue_types.sql', {
  afterEach: async (f, db) => {
    if (!f.startsWith('004')) return;
    await db.exec(`
      INSERT INTO organizations (id, name, code, created_by_email) VALUES ('${O}','Acme','ACME-1','a@x.io');
      INSERT INTO profiles (id, org_id, email, name, nickname) VALUES ('${U}','${O}','a@x.io','Ann','ann');
      INSERT INTO departments (id, org_id, name, code, custom_fields) VALUES
        ('d1','${O}','Engineering','DEV','[{"id":"issueType","name":"Issue Type","type":"select","options":["Bug","Feature"]},{"id":"env","name":"Env","type":"select","options":["LOCAL"]}]'),
        ('d2','${O}','Ops','OPS','[{"id":"issueType","name":"Issue Type","type":"select","options":["Bug","Feature"],"showAsFilter":false}]');
      INSERT INTO issues (id, org_id, title, department_id, status, reporter_id) VALUES
        ('33333333-3333-3333-3333-333333333333','${O}','old fixed','d1','FIXED','${U}'),
        ('44444444-4444-4444-4444-444444444444','${O}','open','d1','NEW','${U}');
      INSERT INTO issue_history (issue_id, actor_id, field_name, old_value, new_value, message) VALUES
        ('33333333-3333-3333-3333-333333333333','${U}','Status','ACCEPTED','FIXED','Status changed from ACCEPTED to FIXED');
      INSERT INTO comments (issue_id, author_id, text, status_change) VALUES
        ('33333333-3333-3333-3333-333333333333','${U}','done','Status changed from ACCEPTED to FIXED');`);
    historyBefore = (await db.query('SELECT count(*)::int n FROM issue_history')).rows[0].n;
  },
});
const q = async (sql) => (await db5.query(sql)).rows;
await t('FIXED tickets become COMPLETED', async () => eq((await q(`SELECT status FROM issues WHERE title='old fixed'`))[0].status, 'COMPLETED'));
await t('history and comments are rewritten, with no fake history rows', async () => {
  const h = await q(`SELECT new_value, message FROM issue_history`);
  return eq(h.length, historyBefore) && h[0].new_value === 'COMPLETED' && h[0].message.includes('COMPLETED')
    && (await q(`SELECT status_change FROM comments`))[0].status_change.includes('COMPLETED');
});
await t('department Issue Type options gain Update/Adjustment and a filter flag', async () => {
  const eng = (await q(`SELECT custom_fields->0 f FROM departments WHERE code='DEV'`))[0].f;
  const ops = (await q(`SELECT custom_fields->0 f FROM departments WHERE code='OPS'`))[0].f;
  return eq(eng.options, ['Bug', 'Feature', 'Update', 'Adjustment']) && eng.showAsFilter === true && ops.showAsFilter === false;
});
await t('new statuses and types are accepted', async () => { await db5.exec(`UPDATE issues SET status='PENDING', issue_type='Adjustment' WHERE title='open'`); });
await blocked('FIXED is rejected now', () => db5.exec(`UPDATE issues SET status='FIXED' WHERE title='open'`));
await t('005 is safe to run twice', async () => { await db5.exec(readMigration('005_status_and_issue_types.sql')); });

// ============================ 006: isolation of the new tables ============================
console.log('\nmigration 006 isolation (restricted role, two organizations)');
const db = await loadDb();
const A = '11111111-1111-1111-1111-111111111111', B = '99999999-9999-9999-9999-999999999999';
const a1 = '21111111-1111-1111-1111-111111111111', a2 = '22222222-2222-2222-2222-222222222222', b1 = '29999999-9999-9999-9999-999999999999';
const issA = '31111111-1111-1111-1111-111111111111', issB = '39999999-9999-9999-9999-999999999999';
await db.exec(`
  INSERT INTO organizations (id,name,code,created_by_email) VALUES ('${A}','A','A-1','a@x'),('${B}','B','B-1','b@x');
  INSERT INTO profiles (id,org_id,email,name,nickname) VALUES ('${a1}','${A}','a1@x','A1','a1'),('${a2}','${A}','a2@x','A2','a2'),('${b1}','${B}','b1@x','B1','b1');
  INSERT INTO departments (id,org_id,name,code) VALUES ('dA','${A}','DA','DA'),('dB','${B}','DB','DB');
  INSERT INTO issues (id,org_id,title,department_id,reporter_id) VALUES ('${issA}','${A}','ta','dA','${a1}'),('${issB}','${B}','tb','dB','${b1}');`);
const as = async (org, actor, sql, params = []) => {
  await db.exec('SET ROLE nuts_app');
  await db.query(`SELECT set_config('app.org_id', $1, false), set_config('nuts.actor_id', $2, false)`, [org || '', actor || '']);
  try { return await db.query(sql, params); } finally { await db.exec('RESET ROLE'); }
};
const count = async (org, actor, table) => (await as(org, actor, `SELECT count(*)::int n FROM public.${table}`)).rows[0].n;

await t('a1 stars; a2 cannot see it', async () => { await as(A, a1, `INSERT INTO issue_stars VALUES ($1,$2)`, [issA, a1]); return (await count(A, a2, 'issue_stars')) === 0 && (await count(A, a1, 'issue_stars')) === 1; });
await blocked('a2 cannot star as a1', () => as(A, a2, `INSERT INTO issue_stars (issue_id,user_id) VALUES ($1,$2)`, [issA, a1]));
await blocked('cannot star an org-B ticket', () => as(A, a1, `INSERT INTO issue_stars (issue_id,user_id) VALUES ($1,$2)`, [issB, a1]));
await t('no actor sees nothing', async () => (await count(A, '', 'issue_stars')) === 0);
await t('org A reads watchers; org B does not', async () => { await as(A, a1, `INSERT INTO issue_watchers VALUES ($1,$2)`, [issA, a2]); return (await count(A, a1, 'issue_watchers')) === 1 && (await count(B, b1, 'issue_watchers')) === 0; });
await blocked('cannot add an org-B user as a watcher', () => as(A, a1, `INSERT INTO issue_watchers (issue_id,user_id) VALUES ($1,$2)`, [issA, b1]));
await t('saved views are private', async () => { await as(A, a1, `INSERT INTO saved_views (org_id,user_id,name) VALUES ($1,$2,'v')`, [A, a1]); return (await count(A, a2, 'saved_views')) === 0; });
await blocked('cannot create a view as someone else', () => as(A, a2, `INSERT INTO saved_views (org_id,user_id,name) VALUES ($1,$2,'x')`, [A, a1]));
await blocked('duplicate view names (case-insensitive) rejected', () => as(A, a1, `INSERT INTO saved_views (org_id,user_id,name) VALUES ($1,$2,' V ')`, [A, a1]));
await blocked('oversized view config rejected', () => as(A, a1, `INSERT INTO saved_views (org_id,user_id,name,config) VALUES ($1,$2,'big',$3)`, [A, a1, JSON.stringify({ x: 'y'.repeat(5000) })]));
await t('a1 notifies a2; only a2 can read, update and delete it', async () => {
  await as(A, a1, `INSERT INTO notifications (org_id,user_id,actor_id,issue_id,kind) VALUES ($1,$2,$3,$4,'assigned')`, [A, a2, a1, issA]);
  return (await count(A, a1, 'notifications')) === 0 && (await count(A, a2, 'notifications')) === 1
    && (await as(A, a1, `UPDATE notifications SET read_at = now()`)).affectedRows === 0
    && (await as(A, a1, `DELETE FROM notifications`)).affectedRows === 0
    && (await as(A, a2, `UPDATE notifications SET read_at = now()`)).affectedRows === 1;
});
await blocked('cannot notify an org-B user', () => as(A, a1, `INSERT INTO notifications (org_id,user_id,actor_id,issue_id,kind) VALUES ($1,$2,$3,$4,'assigned')`, [A, b1, a1, issA]));
await blocked('cannot notify about an org-B ticket', () => as(A, a1, `INSERT INTO notifications (org_id,user_id,actor_id,issue_id,kind) VALUES ($1,$2,$3,$4,'assigned')`, [A, a2, a1, issB]));
await blocked('cannot write notifications into another org', () => as(A, a1, `INSERT INTO notifications (org_id,user_id,actor_id,issue_id,kind) VALUES ($1,$2,$3,$4,'assigned')`, [B, b1, a1, issB]));
await blocked('unknown notification kind rejected', () => as(A, a1, `INSERT INTO notifications (org_id,user_id,actor_id,issue_id,kind) VALUES ($1,$2,$3,$4,'hack')`, [A, a2, a1, issA]));
await t('006 is safe to run twice', async () => { await db.exec(readMigration('006_in_app_features.sql')); });
await t('deleting a ticket removes its stars, watchers and notifications', async () => {
  await db.exec(`DELETE FROM issues WHERE id='${issA}'`);
  const r = (await db.query(`SELECT (SELECT count(*) FROM issue_stars)::int s, (SELECT count(*) FROM issue_watchers)::int w, (SELECT count(*) FROM notifications)::int n`)).rows[0];
  return r.s === 0 && r.w === 0 && r.n === 0;
});

process.exit(summary() ? 0 : 1);
