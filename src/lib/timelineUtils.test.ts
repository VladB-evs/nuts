import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTicketLifecycle, STATUS_META } from './timelineUtils';
import type { Issue, Status, UserProfile } from '../types';

const user: UserProfile = { id: 'u', name: 'U', email: 'u@x.io', department: 'Engineering' };
const HOUR = 60 * 60 * 1000;
const T0 = Date.parse('2026-01-01T00:00:00Z');
const iso = (offsetHours: number) => new Date(T0 + offsetHours * HOUR).toISOString();

/** An issue created at T0 that moved through the given [hoursAfterCreation, newStatus] steps. */
const issue = (priority: Issue['priority'], status: Status, steps: [number, Status][]): Issue => ({
  id: 'i',
  number: 1,
  code: 'DEV-1',
  title: 't',
  description: 'd',
  departmentId: 'engineering',
  priority,
  status,
  assignee: user,
  reporter: user,
  createdAt: iso(0),
  updatedAt: iso(0),
  comments: [],
  history: steps.map(([h, to], n) => ({
    id: `h${n}`,
    actor: user,
    field: 'Status',
    oldValue: n === 0 ? 'ASSIGNED' : steps[n - 1][1],
    newValue: to,
    message: '',
    createdAt: iso(h),
  })),
});

test('status metadata covers PENDING and COMPLETED in lifecycle order', () => {
  const order = (['NEW', 'ASSIGNED', 'ACCEPTED', 'PENDING', 'COMPLETED', 'VERIFIED', 'CLOSED'] as Status[]).map(
    (s) => STATUS_META[s].order
  );
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  assert.equal(new Set(order).size, order.length);
});

test('an overdue ACCEPTED ticket is stalled', () => {
  // P1 stage SLA is 3 days; sat in ACCEPTED for 5 days
  const lc = computeTicketLifecycle(issue('P1', 'ACCEPTED', [[0, 'ACCEPTED']]), T0 + 120 * HOUR);
  assert.equal(lc.isStalled, true);
  assert.equal(lc.isSlaPaused, false);
});

test('a PENDING ticket does not stall, however long it waits', () => {
  const lc = computeTicketLifecycle(issue('P1', 'PENDING', [[0, 'PENDING']]), T0 + 400 * HOUR);
  assert.equal(lc.isSlaPaused, true);
  assert.equal(lc.isStalled, false);
  assert.equal(lc.slaResolutionBreached, false);
  assert.match(lc.stalledReason, /paused/i);
});

test('time spent PENDING is excluded from the resolution SLA once work resumes', () => {
  // P1 resolution SLA is 7 days (168h). 2h accepted, 200h pending, then accepted again for 1h.
  const steps: [number, Status][] = [[0, 'ACCEPTED'], [2, 'PENDING'], [202, 'ACCEPTED']];
  const lc = computeTicketLifecycle(issue('P1', 'ACCEPTED', steps), T0 + 203 * HOUR);
  assert.equal(lc.isSlaPaused, false);
  assert.equal(lc.slaResolutionBreached, false); // 3h of real work, not 203h
});

test('a COMPLETED ticket counts as resolved', () => {
  const lc = computeTicketLifecycle(issue('P0', 'COMPLETED', [[0, 'ACCEPTED'], [5, 'COMPLETED']]), T0 + 999 * HOUR);
  assert.equal(lc.isResolved, true);
  assert.equal(lc.isStalled, false);
});
