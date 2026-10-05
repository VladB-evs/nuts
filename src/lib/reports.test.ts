import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReport, csvCell, issuesToCsv } from './reports';
import type { Department, Issue } from '../types';

const NOW = Date.parse('2026-03-15T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const iso = (offsetDays: number) => new Date(NOW + offsetDays * DAY).toISOString();
const person = { id: 'p', name: 'Pat', email: 'p@x.io', department: '' };

const depts: Department[] = [
  { id: 'd1', name: 'Engineering', code: 'DEV' },
  { id: 'd2', name: 'HR', code: 'HR' },
];

const mk = (over: Partial<Issue> & { id: string }): Issue => ({
  number: 1, code: 'DEV-1', title: 't', description: '', departmentId: 'd1', priority: 'P2', status: 'NEW',
  assignee: person, reporter: person, createdAt: iso(-1), updatedAt: iso(-1), comments: [], history: [],
  ...over,
});

test('buildReport counts open, closed, priorities and departments', () => {
  const issues = [
    mk({ id: '1', priority: 'P0', status: 'ASSIGNED' }),
    mk({ id: '2', priority: 'P0', status: 'PENDING' }),
    mk({ id: '3', priority: 'P3', status: 'COMPLETED', createdAt: iso(-5), updatedAt: iso(-2) }),
    mk({ id: '4', departmentId: 'd2', status: 'CLOSED', createdAt: iso(-40), updatedAt: iso(-35) }),
    mk({ id: '5', departmentId: 'd2', status: 'NEW' }),
  ];
  const r = buildReport(issues, depts, NOW);
  assert.equal(r.total, 5);
  assert.equal(r.open, 4); // everything but the CLOSED one: a COMPLETED ticket stays "open" until closed
  assert.equal(r.openByPriority.P0, 2);
  assert.equal(r.openByPriority.P3, 1);
  assert.equal(r.byStatus.PENDING, 1);
  assert.equal(r.paused, 1);
  assert.equal(r.resolvedLast30Days, 1); // #3 resolved 2 days ago; #4 was resolved 35 days ago
  const eng = r.perDepartment.find((d) => d.code === 'DEV')!;
  const hr = r.perDepartment.find((d) => d.code === 'HR')!;
  assert.deepEqual([eng.open, eng.closed], [3, 0]);
  assert.deepEqual([hr.open, hr.closed], [1, 1]);
  assert.ok(r.avgLeadTimeMs > 0);
});

test('a COMPLETED ticket is open and never stalled; a CLOSED one is not open', () => {
  const r = buildReport(
    [mk({ id: 'c', status: 'COMPLETED', priority: 'P0', createdAt: iso(-200), updatedAt: iso(-100) }), mk({ id: 'x', status: 'CLOSED' })],
    depts,
    NOW
  );
  assert.equal(r.open, 1);
  assert.equal(r.stalled, 0); // SLA stopped at COMPLETED however long ago
  assert.equal(r.perDepartment.find((d) => d.code === 'DEV')!.closed, 1);
});

test('buildReport tolerates an empty workspace and unknown departments', () => {
  const empty = buildReport([], depts, NOW);
  assert.equal(empty.total, 0);
  assert.equal(empty.avgLeadTimeMs, 0);
  assert.equal(empty.daily.length, 14);
  const orphan = buildReport([mk({ id: 'x', departmentId: 'gone' })], depts, NOW);
  assert.equal(orphan.open, 1);
});

test('the daily chart buckets creations and resolutions', () => {
  const issues = [
    mk({ id: '1', createdAt: iso(-1), status: 'NEW' }),
    mk({ id: '2', createdAt: iso(-1), status: 'COMPLETED', updatedAt: iso(0) }),
    mk({ id: '3', createdAt: iso(-60), status: 'NEW' }), // outside the window
  ];
  const r = buildReport(issues, depts, NOW);
  assert.equal(r.daily.reduce((n, d) => n + d.created, 0), 2);
  assert.equal(r.daily[r.daily.length - 1].resolved, 1);
});

test('csvCell quotes, escapes and defuses spreadsheet formulas', () => {
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('line1\nline2'), '"line1\nline2"');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(42), '42');
  for (const evil of ['=1+1', '+SUM(A1)', '-2+3', '@cmd', '=HYPERLINK("http://evil","x")', '\t=1']) {
    assert.ok(csvCell(evil).replace(/^"/, '').startsWith("'"), `${evil} not defused`);
  }
});

test('issuesToCsv has a header and one line per ticket, titles are defused', () => {
  const csv = issuesToCsv([mk({ id: '1', title: '=cmd|"/C calc"!A0', code: 'DEV-1' })], depts);
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[0].startsWith('Code,Title,Department'));
  assert.ok(lines[1].includes(`"'=cmd|""/C calc""!A0"`));
});
