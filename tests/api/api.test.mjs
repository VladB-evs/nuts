import { makeApi } from './harness.mjs';

let pass = 0, fail = 0;
const t = async (name, fn) => {
  try { const r = await fn(); if (r === false) throw new Error('assertion false'); pass++; console.log('  ok  ', name); }
  catch (e) { fail++; console.log('  FAIL', name, '->', e.message.split('\n')[0]); }
};
const eq = (a, b, msg = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`); return true; };

const { db, call } = await makeApi();
const PW = 'Str0ng!pass';
// Direct inspection must bypass RLS (as the table owner); otherwise "nothing changed" checks could pass because rows are hidden.
const owner = async (sql) => { await db.exec('RESET ROLE'); try { return await db.query(sql); } finally { await db.exec('SET ROLE nuts_app'); } };

// ---------- setup: org A (Ann admin, Bob, Cara), org B (Zed) ----------
const ann = await call('register', { orgMode: 'create', name: 'Ann Admin', email: 'ann@a.io', password: PW, orgName: 'Acme', nickname: 'ann', department: 'Engineering' }, '', '1.1.1.1');
const code = ann.body.user.organization.code;
const bob = await call('register', { orgMode: 'join', orgCode: code, name: 'Bob', email: 'bob@a.io', password: PW, nickname: 'bob', department: 'Engineering' }, '', '1.1.1.2');
const cara = await call('register', { orgMode: 'join', orgCode: code, name: 'Cara', email: 'cara@a.io', password: PW, nickname: 'cara', department: 'Engineering' }, '', '1.1.1.3');
const zed = await call('register', { orgMode: 'create', name: 'Zed', email: 'zed@b.io', password: PW, orgName: 'Other', nickname: 'zed', department: 'Engineering' }, '', '2.2.2.2');
const A = ann.cookie, B = bob.cookie, C = cara.cookie, Z = zed.cookie;
const id = { ann: ann.body.user.id, bob: bob.body.user.id, cara: cara.body.user.id, zed: zed.body.user.id };
const deptA = (await call('fetchAll', {}, A)).body.departments[0].id;
const deptZ = (await call('fetchAll', {}, Z)).body.departments[0].id;
const attrs = { issueType: 'Bug', environment: 'LOCAL', devScope: 'Frontend only' };
const mk = async (cookie, over = {}, dept = deptA) => (await call('createIssue', { data: { title: 't', description: 'd', departmentId: dept, priority: 'P2', customAttributes: attrs, ...over } }, cookie)).body.issue;
const notes = async (cookie) => (await call('listNotifications', {}, cookie)).body;
const kinds = async (cookie) => (await notes(cookie)).items.map((i) => i.kind).sort();
const issueOf = async (cookie, issueId) => (await call('fetchAll', {}, cookie)).body.issues.find((i) => i.id === issueId);

console.log('\ncreate, assign, notify');
const i1 = await mk(A, { title: 'First', assigneeId: id.bob });
await t('createIssue returns the issue', () => i1?.id && i1.title === 'First');
await t('assignee Bob gets one "assigned" notification', async () => eq(await kinds(B), ['assigned']));
await t('reporter Ann is not notified of her own action', async () => eq(await kinds(A), []));
await t('Ann (reporter) and Bob (assignee) watch the new ticket', async () => (await issueOf(A, i1.id)).watching && (await issueOf(B, i1.id)).watching);
await t('Cara does not watch it', async () => !(await issueOf(C, i1.id)).watching);

console.log('\ncomments and mentions');
await call('addComment', { issueId: i1.id, text: 'hello @bob please look' }, C);
await t('mentioned Bob gets "mentioned" and NOT also "commented"', async () => eq(await kinds(B), ['assigned', 'mentioned']));
await t('reporter Ann gets "commented"', async () => eq(await kinds(A), ['commented']));
await t('commenter Cara gets nothing and now watches', async () => eq(await kinds(C), []) && (await issueOf(C, i1.id)).watching);
await t('mention detail is a snippet of the comment', async () => (await notes(B)).items.find((i) => i.kind === 'mentioned').detail.includes('please look'));
await call('addComment', { issueId: i1.id, text: 'talking to myself @cara' }, C);
await t('mentioning yourself notifies nobody extra', async () => eq(await kinds(C), []));
await call('addComment', { issueId: i1.id, text: 'mail liam@a.io and @nobody' }, A);
await t('email-like text and unknown nickname do not mention anyone', async () => !(await kinds(B)).includes('mentioned') || (await kinds(B)).filter((k) => k === 'mentioned').length === 1);

console.log('\nstatus and priority changes');
await call('updateIssue', { issueId: i1.id, updates: { status: 'ACCEPTED' } }, B);
await t('status change notifies reporter and other watchers, not the actor', async () => {
  const a = (await notes(A)).items.find((n) => n.kind === 'status_changed');
  const c = (await notes(C)).items.find((n) => n.kind === 'status_changed');
  const b = (await notes(B)).items.find((n) => n.kind === 'status_changed');
  return a?.detail === 'to ACCEPTED' && c?.detail === 'to ACCEPTED' && !b;
});
const before = (await notes(A)).items.length;
await call('updateIssue', { issueId: i1.id, updates: { status: 'ACCEPTED' } }, B);
await t('setting the same status again notifies nobody', async () => (await notes(A)).items.length === before);
await call('addComment', { issueId: i1.id, text: 'blocked on design', newStatus: 'PENDING' }, B);
await t('comment + status change = ONE status_changed notification with the comment', async () => {
  const list = (await notes(A)).items.filter((n) => n.detail?.includes('blocked on design'));
  return list.length === 1 && list[0].kind === 'status_changed' && list[0].detail.startsWith('to PENDING');
});
await t('the comment records the status change text', async () => (await issueOf(A, i1.id)).comments.some((c) => c.statusChange === 'Status changed from ACCEPTED to PENDING'));
await call('updateIssue', { issueId: i1.id, updates: { priority: 'P0' } }, B);
await t('priority change notifies followers', async () => (await kinds(A)).includes('priority_changed'));

console.log('\nreassigning');
const caraCount = async (kind) => (await notes(C)).items.filter((n) => n.kind === kind).length;
const [cAssigned0, cStatus0] = [await caraCount('assigned'), await caraCount('status_changed')];
await call('updateIssue', { issueId: i1.id, updates: { assignee: { id: id.cara }, status: 'ASSIGNED' } }, A);
await t('new assignee gets "assigned" and not also "status_changed" for the same edit', async () =>
  (await caraCount('assigned')) === cAssigned0 + 1 && (await caraCount('status_changed')) === cStatus0);
await t('new assignee now watches', async () => (await issueOf(C, i1.id)).watching);

console.log('\nper-user stars and watching');
await call('toggleStar', { issueId: i1.id, starred: true }, B);
await t('Bob starred it; Ann did not', async () => (await issueOf(B, i1.id)).starred === true && (await issueOf(A, i1.id)).starred === false);
await call('toggleStar', { issueId: i1.id, starred: false }, B);
await t('unstar works', async () => (await issueOf(B, i1.id)).starred === false);
await call('toggleWatch', { issueId: i1.id, watching: false }, B);
await t('Bob can stop watching', async () => (await issueOf(B, i1.id)).watching === false);
const bobBefore = (await notes(B)).items.length;
await call('addComment', { issueId: i1.id, text: 'something new' }, A);
await t('an unwatched, unassigned user is not notified', async () => (await notes(B)).items.length === bobBefore);
await call('toggleWatch', { issueId: i1.id, watching: true }, B);
await t('watching again works', async () => (await issueOf(B, i1.id)).watching === true);

console.log('\ndelete permissions');
const del = await mk(B, { title: 'Bobs ticket' });
await t('a non-reporter, non-admin cannot delete (403)', async () => eq((await call('deleteIssue', { issueId: del.id }, C)).status, 403));
await t('the reporter can delete', async () => eq((await call('deleteIssue', { issueId: del.id }, B)).status, 200));
const del2 = await mk(B, { title: 'Bobs 2nd' });
await t('an admin can delete anyone\'s ticket', async () => eq((await call('deleteIssue', { issueId: del2.id }, A)).status, 200));
await t('other org cannot delete (404)', async () => eq((await call('deleteIssue', { issueId: i1.id }, Z)).status, 404));
await t('invalid id is a 404, not a crash', async () => eq((await call('deleteIssue', { issueId: "x'; DROP TABLE issues;--" }, A)).status, 404));

console.log('\nbulk update');
const bulk = [await mk(A, { title: 'b1' }), await mk(A, { title: 'b2' }), await mk(A, { title: 'b3' })];
const ids = bulk.map((b) => b.id);
const bobN0 = (await notes(B)).items.length;
const r = await call('bulkUpdateIssues', { ids, updates: { assigneeId: id.bob, priority: 'P0' } }, A);
await t('bulk assign + priority succeeds', () => eq(r.status, 200) && eq(r.body.updated, 3));
await t('all three updated; NEW became ASSIGNED', async () => { const all = (await call('fetchAll', {}, A)).body.issues; return ids.every((x) => { const i = all.find((y) => y.id === x); return i.priority === 'P0' && i.assignee?.id === id.bob && i.status === 'ASSIGNED'; }); });
await t('Bob got exactly 3 new "assigned" notifications', async () => (await notes(B)).items.length - bobN0 === 3);
await t('Bob watches all three', async () => { const all = (await call('fetchAll', {}, B)).body.issues; return ids.every((x) => all.find((y) => y.id === x).watching); });
await call('bulkUpdateIssues', { ids, updates: { status: 'COMPLETED' } }, B);
await t('bulk status change by Bob notifies reporter Ann (3)', async () => (await notes(A)).items.filter((n) => n.detail === 'to COMPLETED').length === 3);
await t('bulk: unassign works', async () => { await call('bulkUpdateIssues', { ids: [ids[0]], updates: { assigneeId: 'unassigned' } }, A); return (await issueOf(A, ids[0])).assignee === null; });
await t('bulk: empty selection rejected', async () => eq((await call('bulkUpdateIssues', { ids: [], updates: { priority: 'P1' } }, A)).status, 400));
await t('bulk: over 100 rejected', async () => eq((await call('bulkUpdateIssues', { ids: Array.from({ length: 101 }, (_, n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`), updates: { priority: 'P1' } }, A)).status, 400));
await t('bulk: nothing to change rejected', async () => eq((await call('bulkUpdateIssues', { ids, updates: {} }, A)).status, 400));
await t('bulk: unknown status rejected', async () => eq((await call('bulkUpdateIssues', { ids, updates: { status: 'DONE' } }, A)).status, 400));
await t('bulk: unknown priority rejected', async () => eq((await call('bulkUpdateIssues', { ids, updates: { priority: 'P9' } }, A)).status, 400));
await t('bulk: SQL injection in ids rejected', async () => eq((await call('bulkUpdateIssues', { ids: ["1' OR '1'='1"], updates: { priority: 'P1' } }, A)).status, 400));
await t('bulk: assignee from another org rejected', async () => eq((await call('bulkUpdateIssues', { ids, updates: { assigneeId: id.zed } }, A)).status, 400));
await t('bulk: another org\'s tickets are "not found" and untouched', async () => {
  const zi = await mk(Z, { title: 'zed' }, deptZ);
  const res = await call('bulkUpdateIssues', { ids: [zi.id, ids[0]], updates: { priority: 'P3' } }, A);
  return eq(res.status, 404) && (await issueOf(Z, zi.id)).priority === 'P2';
});
await t('bulk: requires sign-in', async () => eq((await call('bulkUpdateIssues', { ids, updates: { priority: 'P1' } }, '')).status, 401));

console.log('\ncross-organization attacks (Zed in org B against org A data)');
await t('cannot edit an org-A ticket (404)', async () => eq((await call('updateIssue', { issueId: i1.id, updates: { title: 'pwned' } }, Z)).status, 404));
await t('cannot comment on an org-A ticket (404)', async () => eq((await call('addComment', { issueId: i1.id, text: 'hi' }, Z)).status, 404));
await t('Zed fetchAll contains no org-A data', async () => { const all = (await call('fetchAll', {}, Z)).body; return all.issues.every((i) => i.orgId !== ann.body.user.orgId) && all.users.every((u) => u.email.endsWith('@b.io')); });
await t('starring/watching an org-A ticket changes nothing', async () => {
  await call('toggleStar', { issueId: i1.id, starred: true }, Z); await call('toggleWatch', { issueId: i1.id, watching: true }, Z);
  const orgA = ann.body.user.orgId;
  const n = await owner(`SELECT (SELECT count(*) FROM issue_stars x JOIN issues i ON i.id=x.issue_id WHERE x.user_id='${id.zed}' AND i.org_id='${orgA}')::int s, (SELECT count(*) FROM issue_watchers x JOIN issues i ON i.id=x.issue_id WHERE x.user_id='${id.zed}' AND i.org_id='${orgA}')::int w`);
  return n.rows[0].s === 0 && n.rows[0].w === 0;
});
const bobNote = (await notes(B)).items[0].id;
await t('Zed cannot mark Bob\'s notification read', async () => { await call('markNotificationsRead', { ids: [bobNote] }, Z); const row = await owner(`SELECT read_at FROM notifications WHERE id='${bobNote}'`); return row.rows[0].read_at === null; });
await t('Ann cannot mark Bob\'s notification read either', async () => { await call('markNotificationsRead', { ids: [bobNote] }, A); const row = await owner(`SELECT read_at FROM notifications WHERE id='${bobNote}'`); return row.rows[0].read_at === null; });
await t('Zed sees no notifications', async () => eq((await notes(Z)).items.length, 0));
await t('mention of an org-A nickname in org B notifies nobody in A', async () => { const zi = await mk(Z, { title: 'z2' }, deptZ); const n0 = (await notes(B)).items.length; await call('addComment', { issueId: zi.id, text: '@bob @ann hello' }, Z); return (await notes(B)).items.length === n0; });

console.log('\nsaved views');
const v = await call('saveView', { name: '  My   P0s ', config: { priority: 'P0', navView: 'hack', sort: { key: 'evil', dir: 'asc' }, fieldFilters: { 'a b': 'x', issueType: 'Bug' }, extra: 1 } }, A);
await t('view saved with sanitised config and tidy name', () => eq(v.status, 200) && v.body.view.name === 'My P0s' && v.body.view.config.navView === 'open' && v.body.view.config.sort.key === 'updatedAt' && eq(v.body.view.config.fieldFilters, { issueType: 'Bug' }) && v.body.view.config.extra === undefined);
await t('duplicate name is a 409', async () => eq((await call('saveView', { name: 'my p0s', config: {} }, A)).status, 409));
await t('empty name is a 400', async () => eq((await call('saveView', { name: '   ', config: {} }, A)).status, 400));
await t('Bob does not see Ann\'s views; Ann does', async () => (await call('fetchAll', {}, B)).body.savedViews.length === 0 && (await call('fetchAll', {}, A)).body.savedViews.length === 1);
await t('Bob cannot delete Ann\'s view', async () => { await call('deleteView', { id: v.body.view.id }, B); return (await call('fetchAll', {}, A)).body.savedViews.length === 1; });
await t('limit of 25 views enforced', async () => { for (let n = 0; n < 24; n++) await call('saveView', { name: 'v' + n, config: {} }, A); return eq((await call('saveView', { name: 'one too many', config: {} }, A)).status, 400); });
await t('owner can delete a view', async () => { await call('deleteView', { id: v.body.view.id }, A); return !(await call('fetchAll', {}, A)).body.savedViews.some((x) => x.id === v.body.view.id); });

console.log('\nnotification API');
await t('unread count and latest', async () => { const c = (await call('notificationCount', {}, B)).body; return c.unread > 0 && c.latest; });
await t('mark specific ids read', async () => { const items = (await notes(B)).items; await call('markNotificationsRead', { ids: [items[0].id] }, B); return (await notes(B)).items.find((n) => n.id === items[0].id).read === true; });
await t('mark all read', async () => { await call('markNotificationsRead', { all: true }, B); return eq((await call('notificationCount', {}, B)).body.unread, 0); });
await t('invalid ids rejected', async () => eq((await call('markNotificationsRead', { ids: ['nope'] }, B)).status, 400));
await t('notifications carry actor and issue', async () => { const n = (await notes(B)).items[0]; return n.actor?.name && n.issue?.code && n.issue?.title; });
await t('old notifications are cleaned up', async () => { await owner(`UPDATE notifications SET created_at = now() - interval '100 days' WHERE user_id='${id.bob}' AND id IN (SELECT id FROM notifications WHERE user_id='${id.bob}' LIMIT 1)`); const n0 = (await owner(`SELECT count(*)::int n FROM notifications WHERE user_id='${id.bob}'`)).rows[0].n; await notes(B); return (await owner(`SELECT count(*)::int n FROM notifications WHERE user_id='${id.bob}'`)).rows[0].n === n0 - 1; });
await t('departed users are not notified', async () => {
  const dj = await call('register', { orgMode: 'join', orgCode: code, name: 'Dan', email: 'dan@a.io', password: PW, nickname: 'dan', department: 'Engineering' }, '', '1.1.1.9');
  await call('updateProfile', { userId: dj.body.user.id, updates: { status: 'departed', departureReason: 'left' } }, A);
  const ii = await mk(A, { title: 'for dan' }); const n0 = (await owner(`SELECT count(*)::int n FROM notifications WHERE user_id='${dj.body.user.id}'`)).rows[0].n;
  await call('addComment', { issueId: ii.id, text: 'hey @dan' }, A);
  await call('updateIssue', { issueId: ii.id, updates: { assignee: { id: dj.body.user.id } } }, A);
  return (await owner(`SELECT count(*)::int n FROM notifications WHERE user_id='${dj.body.user.id}'`)).rows[0].n === n0;
});

console.log('\nworkflows');
const wfDept = (await call('fetchAll', {}, A)).body.departments[0];
const save = (cookie, workflow) => call('saveDepartment', { department: { ...wfDept, workflow } }, cookie);
await t('non-admin cannot change a workflow (403)', async () => eq((await save(B, { statuses: ['NEW', 'CLOSED'] })).status, 403));
await t('workflow without NEW is rejected', async () => eq((await save(A, { statuses: ['ASSIGNED', 'CLOSED'] })).status, 400));
await t('workflow without a finishing status is rejected', async () => eq((await save(A, { statuses: ['NEW', 'ASSIGNED'] })).status, 400));
await t('workflow with unknown status is rejected', async () => eq((await save(A, { statuses: ['NEW', 'WAT', 'CLOSED'] })).status, 400));
await t('admin saves a valid workflow with labels', async () => eq((await save(A, { statuses: ['NEW', 'ASSIGNED', 'CLOSED'], labels: { NEW: 'Requested' } })).status, 200));
await t('fetchAll returns the workflow', async () => eq((await call('fetchAll', {}, A)).body.departments[0].workflow, { statuses: ['NEW', 'ASSIGNED', 'CLOSED'], labels: { NEW: 'Requested' } }));
await t('a status outside the workflow is rejected on update', async () => eq((await call('updateIssue', { issueId: bulk[1].id, updates: { status: 'PENDING' } }, A)).status, 400));
await t('...on comment', async () => eq((await call('addComment', { issueId: bulk[1].id, text: 'x', newStatus: 'PENDING' }, A)).status, 400));
await t('...on create', async () => eq((await call('createIssue', { data: { title: 't', description: 'd', departmentId: deptA, priority: 'P2', status: 'PENDING', customAttributes: attrs } }, A)).status, 400));
await t('...on bulk', async () => eq((await call('bulkUpdateIssues', { ids: [bulk[1].id], updates: { status: 'PENDING' } }, A)).status, 400));
await t('a status inside the workflow works', async () => eq((await call('updateIssue', { issueId: bulk[1].id, updates: { status: 'CLOSED' } }, A)).status, 200));
await t('resetting to the default workflow works', async () => eq((await save(A, null)).status, 200) && (await call('fetchAll', {}, A)).body.departments[0].workflow === undefined);

console.log('\nvalidation of ordinary edits');
await t('unknown status on update is a 400', async () => eq((await call('updateIssue', { issueId: i1.id, updates: { status: 'DONE' } }, A)).status, 400));
await t('unknown priority on update is a 400', async () => eq((await call('updateIssue', { issueId: i1.id, updates: { priority: 'P7' } }, A)).status, 400));
await t('assigning someone from another org is a 400', async () => eq((await call('updateIssue', { issueId: i1.id, updates: { assignee: { id: id.zed } } }, A)).status, 400));
await t('empty comment with no status is a 400', async () => eq((await call('addComment', { issueId: i1.id, text: '   ' }, A)).status, 400));
await t('unauthenticated calls are 401', async () => eq((await call('listNotifications', {}, '')).status, 401));

console.log(`\n${pass} passed, ${fail} failed`);

// ------------------------------------------------------------------------------------------
console.log('\n=== without migration 006 (deploying before running it) ===');
const old = await makeApi('005_status_and_issue_types.sql');
const o = old.call;
const oa = await o('register', { orgMode: 'create', name: 'Old Admin', email: 'o@o.io', password: PW, orgName: 'Old', nickname: 'old', department: 'Engineering' });
const ob = await o('register', { orgMode: 'join', orgCode: oa.body.user.organization.code, name: 'Olly', email: 'ol@o.io', password: PW, nickname: 'olly', department: 'Engineering' }, '', '3.3.3.3');
const oAll = (await o('fetchAll', {}, oa.cookie)).body;
await t('fetchAll still works (no stars/views)', () => oAll.issues && Array.isArray(oAll.savedViews) && oAll.savedViews.length === 0);
const od = oAll.departments[0].id;
const oi = (await o('createIssue', { data: { title: 't', description: 'd', departmentId: od, priority: 'P1', assigneeId: ob.body.user.id, customAttributes: attrs } }, oa.cookie)).body.issue;
await t('creating a ticket still works', () => !!oi?.id);
await t('commenting with a mention still works', async () => eq((await o('addComment', { issueId: oi.id, text: 'hi @olly' }, oa.cookie)).status, 200));
await t('updating status/priority/assignee still works', async () => eq((await o('updateIssue', { issueId: oi.id, updates: { status: 'ACCEPTED', priority: 'P0' } }, oa.cookie)).status, 200));
await t('saving a department without a workflow still works', async () => eq((await o('saveDepartment', { department: { ...oAll.departments[0] } }, oa.cookie)).status, 200));
await t('saving a workflow says what to do (503)', async () => { const r2 = await o('saveDepartment', { department: { ...oAll.departments[0], workflow: { statuses: ['NEW', 'CLOSED'] } } }, oa.cookie); return eq(r2.status, 503) && /migration/i.test(r2.body.error); });
await t('star/save-view/notifications give a clear 503, not a crash', async () => {
  const a1 = await o('toggleStar', { issueId: oi.id, starred: true }, oa.cookie);
  const a2 = await o('saveView', { name: 'x', config: {} }, oa.cookie);
  const a3 = await o('listNotifications', {}, oa.cookie);
  return [a1, a2, a3].every((r2) => r2.status === 503 && /migration/i.test(r2.body.error));
});

console.log(`\nTOTAL ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
