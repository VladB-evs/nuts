import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findMentionedIds, splitMentions, activeMentionQuery } from './mentions';
import { sanitizeWorkflow, statusLabel, isStatusAllowed, departmentStatuses, ALL_STATUSES } from './workflow';
import { sanitizeViewConfig, cleanViewName } from './savedViews';
import { sortIssues } from './issueSort';
import type { Issue } from '../types';

const users = [
  { id: 'u1', nickname: 'sam' },
  { id: 'u2', nickname: 'samantha' },
  { id: 'u3', nickname: 'liam' },
  { id: 'u4', nickname: '' },
  { id: 'u5' },
  { id: 'u6', nickname: 'dr.who' },
];

// ---------------- mentions ----------------
test('findMentionedIds finds @nicknames case-insensitively', () => {
  assert.deepEqual(findMentionedIds('hey @Liam can you look', users), ['u3']);
  assert.deepEqual(findMentionedIds('@liam, @dr.who!', users).sort(), ['u3', 'u6']);
});

test('a short nickname does not match inside a longer one', () => {
  assert.deepEqual(findMentionedIds('ping @samantha', users), ['u2']);
  assert.deepEqual(findMentionedIds('ping @sam and @samantha', users).sort(), ['u1', 'u2']);
  assert.deepEqual(findMentionedIds('ping @samuel', users), []);
});

test('email addresses and mid-word @ are not mentions', () => {
  assert.deepEqual(findMentionedIds('mail me at liam@example.com', users), []);
  assert.deepEqual(findMentionedIds('x@liam', users), []);
  assert.deepEqual(findMentionedIds('', users), []);
  assert.deepEqual(findMentionedIds('no mentions here', users), []);
});

test('users without a nickname can never be matched', () => {
  assert.deepEqual(findMentionedIds('@ @@ @undefined @null', users), []);
});

test('regex metacharacters in nicknames are treated literally', () => {
  const tricky = [{ id: 'x', nickname: 'a.*+?^${}()|[]\\b' }, { id: 'y', nickname: 'ab' }];
  assert.deepEqual(findMentionedIds('hi @ab', tricky), ['y']);
  assert.deepEqual(findMentionedIds('hi @a.*+?^${}()|[]\\b', tricky), ['x']);
});

test('splitMentions never produces markup, only text parts', () => {
  const parts = splitMentions('hi @liam <script>alert(1)</script> @sam', users);
  assert.deepEqual(parts.filter((p) => p.mention).map((p) => p.text), ['@liam', '@sam']);
  assert.equal(parts.map((p) => p.text).join(''), 'hi @liam <script>alert(1)</script> @sam');
});

test('activeMentionQuery follows the caret', () => {
  assert.deepEqual(activeMentionQuery('hello @li', 9), { start: 6, query: 'li' });
  assert.deepEqual(activeMentionQuery('@', 1), { start: 0, query: '' });
  assert.equal(activeMentionQuery('hello world', 5), null);
  assert.equal(activeMentionQuery('mail a@b', 8), null);
  assert.equal(activeMentionQuery('hi @li there', 12), null);
});

// ---------------- workflow ----------------
test('sanitizeWorkflow accepts null as "default"', () => {
  assert.deepEqual(sanitizeWorkflow(null), { ok: true, value: null });
  assert.deepEqual(sanitizeWorkflow(undefined), { ok: true, value: null });
});

test('a workflow must include NEW and CLOSED (the status that leaves Open)', () => {
  assert.equal(sanitizeWorkflow({ statuses: ['ASSIGNED', 'CLOSED'] }).ok, false);
  assert.equal(sanitizeWorkflow({ statuses: ['NEW', 'ASSIGNED'] }).ok, false);
  assert.equal(sanitizeWorkflow({ statuses: ['NEW', 'COMPLETED'] }).ok, false); // COMPLETED alone would never leave Open
  assert.equal(sanitizeWorkflow({ statuses: ['NEW', 'CLOSED'] }).ok, true);
});

test('unknown statuses, wrong shapes and duplicates are handled', () => {
  assert.equal(sanitizeWorkflow({ statuses: ['NEW', 'DONE'] }).ok, false);
  assert.equal(sanitizeWorkflow({ statuses: 'NEW' }).ok, false);
  assert.equal(sanitizeWorkflow('NEW').ok, false);
  assert.equal(sanitizeWorkflow([]).ok, false);
  const r = sanitizeWorkflow({ statuses: ['CLOSED', 'NEW', 'NEW', 'ASSIGNED'] });
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.value?.statuses, ['NEW', 'ASSIGNED', 'CLOSED']); // canonical order, deduped
});

test('labels are plain, short, and only for included statuses', () => {
  const r = sanitizeWorkflow({
    statuses: ['NEW', 'CLOSED'],
    labels: {
      NEW: '  <b>Requested</b>\n\u0000 ',
      CLOSED: 'x'.repeat(100),
      PENDING: 'ignored',
      __proto__: 'evil',
    },
  });
  assert.ok(r.ok && r.value);
  if (r.ok && r.value) {
    assert.equal(r.value.labels?.NEW, 'bRequested/b');
    assert.equal(r.value.labels?.CLOSED?.length, 30);
    assert.equal((r.value.labels as any).PENDING, undefined);
    assert.equal(({} as any).evil, undefined);
  }
});

test('the full status list with default names collapses to null (no override)', () => {
  const r = sanitizeWorkflow({ statuses: [...ALL_STATUSES] });
  assert.deepEqual(r, { ok: true, value: null });
});

test('workflow helpers', () => {
  const dept = { workflow: { statuses: ['NEW', 'ASSIGNED', 'CLOSED'] as any, labels: { NEW: 'Requested' } as any } };
  assert.deepEqual(departmentStatuses(dept), ['NEW', 'ASSIGNED', 'CLOSED']);
  assert.deepEqual(departmentStatuses({}), ALL_STATUSES);
  assert.equal(statusLabel(dept, 'NEW'), 'Requested');
  assert.equal(statusLabel(dept, 'ASSIGNED'), 'ASSIGNED');
  assert.equal(isStatusAllowed(dept.workflow, 'PENDING'), false);
  assert.equal(isStatusAllowed(dept.workflow, 'CLOSED'), true);
  assert.equal(isStatusAllowed(null, 'PENDING'), true);
});

// ---------------- saved views ----------------
test('sanitizeViewConfig drops unknown keys and fixes bad values', () => {
  const c = sanitizeViewConfig({
    departmentId: 'd1',
    navView: 'hack',
    priority: 'P9',
    fieldFilters: { issueType: 'Bug', 'bad key!': 'x', long: 'y'.repeat(101), n: 5 },
    sort: { key: 'password', dir: 'sideways' },
    search: 's'.repeat(500),
    extra: 'nope',
  });
  assert.equal(c.departmentId, 'd1');
  assert.equal(c.navView, 'open');
  assert.equal(c.priority, 'ALL');
  assert.deepEqual(c.fieldFilters, { issueType: 'Bug' });
  assert.deepEqual(c.sort, { key: 'updatedAt', dir: 'desc' });
  assert.equal(c.search.length, 200);
  assert.equal((c as any).extra, undefined);
});

test('sanitizeViewConfig survives junk and prototype pollution attempts', () => {
  for (const junk of [null, undefined, 5, 'x', [], JSON.parse('{"__proto__":{"polluted":1},"fieldFilters":{"__proto__":"x"}}')]) {
    const c = sanitizeViewConfig(junk);
    assert.equal(c.navView, 'open');
    assert.equal(({} as any).polluted, undefined);
  }
  const many: Record<string, string> = {};
  for (let i = 0; i < 50; i++) many['k' + i] = 'v';
  assert.equal(Object.keys(sanitizeViewConfig({ fieldFilters: many }).fieldFilters).length, 10);
});

test('cleanViewName trims, collapses and limits', () => {
  assert.equal(cleanViewName('  My   P0s \n'), 'My P0s');
  assert.equal(cleanViewName('x'.repeat(100)).length, 60);
  assert.equal(cleanViewName(42), '');
  assert.equal(cleanViewName('a\u0000b'), 'ab');
});

// ---------------- sorting ----------------
const mk = (over: Partial<Issue>): Issue => ({
  id: over.id || 'i',
  number: 1,
  code: 'DEV-1',
  title: 't',
  description: '',
  departmentId: 'd',
  priority: 'P2',
  status: 'NEW',
  assignee: null,
  reporter: { id: 'r', name: 'R', email: 'r@x', department: '' },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  comments: [],
  history: [],
  ...over,
});

test('sortIssues orders by priority (P0 first ascending) and does not mutate', () => {
  const list = [mk({ id: 'a', priority: 'P3' }), mk({ id: 'b', priority: 'P0' }), mk({ id: 'c', priority: 'P1' })];
  assert.deepEqual(sortIssues(list, 'priority', 'asc').map((i) => i.id), ['b', 'c', 'a']);
  assert.deepEqual(sortIssues(list, 'priority', 'desc').map((i) => i.id), ['a', 'c', 'b']);
  assert.deepEqual(list.map((i) => i.id), ['a', 'b', 'c']);
});

test('sortIssues puts unassigned last when sorting by assignee ascending', () => {
  const p = (n: string) => ({ id: n, name: n, email: n, department: '' });
  const list = [mk({ id: '1' }), mk({ id: '2', assignee: p('Zed') }), mk({ id: '3', assignee: p('Amy') })];
  assert.deepEqual(sortIssues(list, 'assignee', 'asc').map((i) => i.id), ['3', '2', '1']);
});

test('sortIssues orders by status lifecycle and by date', () => {
  const list = [mk({ id: 'a', status: 'COMPLETED' }), mk({ id: 'b', status: 'NEW' }), mk({ id: 'c', status: 'PENDING' })];
  assert.deepEqual(sortIssues(list, 'status', 'asc').map((i) => i.id), ['b', 'c', 'a']);
  const dated = [mk({ id: 'old', updatedAt: '2026-01-01T00:00:00Z' }), mk({ id: 'new', updatedAt: '2026-02-01T00:00:00Z' })];
  assert.deepEqual(sortIssues(dated, 'updatedAt', 'desc').map((i) => i.id), ['new', 'old']);
});
