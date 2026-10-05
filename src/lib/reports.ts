import type { Department, Issue, Priority, Status } from '../types';
import { computeTicketLifecycle } from './timelineUtils';
import { DONE_STATUSES } from './workflow';

export interface DepartmentReportRow {
  departmentId: string;
  name: string;
  code: string;
  open: number;
  closed: number;
  stalled: number;
  avgLeadTimeMs: number; // creation to resolution, resolved tickets only
}

export interface Report {
  total: number;
  open: number;
  stalled: number;
  paused: number;
  resolvedLast30Days: number;
  avgLeadTimeMs: number;
  byStatus: Record<Status, number>;
  openByPriority: Record<Priority, number>;
  perDepartment: DepartmentReportRow[];
  /** Tickets created / resolved on each of the last `days` days, oldest first. */
  daily: { date: string; created: number; resolved: number }[];
}

const DAY = 24 * 60 * 60 * 1000;
const isDone = (s: Status) => (DONE_STATUSES as string[]).includes(s);
const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Aggregates the issues already loaded in the app. Pure: pass `now` to make it testable. */
export function buildReport(issues: Issue[], departments: Department[], now = Date.now(), days = 14): Report {
  const byStatus: Record<Status, number> = {
    NEW: 0, ASSIGNED: 0, ACCEPTED: 0, PENDING: 0, COMPLETED: 0, VERIFIED: 0, CLOSED: 0,
  };
  const openByPriority: Record<Priority, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
  const rows = new Map<string, DepartmentReportRow & { leadSum: number; leadN: number }>(
    departments.map((d) => [d.id, { departmentId: d.id, name: d.name, code: d.code, open: 0, closed: 0, stalled: 0, avgLeadTimeMs: 0, leadSum: 0, leadN: 0 }])
  );

  const daily = Array.from({ length: days }, (_, i) => ({ date: dayKey(now - (days - 1 - i) * DAY), created: 0, resolved: 0 }));
  const dailyIndex = new Map(daily.map((d, i) => [d.date, i]));

  let open = 0, stalled = 0, paused = 0, resolvedLast30 = 0, leadSum = 0, leadN = 0;

  for (const issue of issues) {
    if (issue.status in byStatus) byStatus[issue.status]++;
    const row = rows.get(issue.departmentId);
    const lc = computeTicketLifecycle(issue, now);
    const done = isDone(issue.status);

    const created = dailyIndex.get(dayKey(new Date(issue.createdAt).getTime()));
    if (created !== undefined) daily[created].created++;

    if (done) {
      if (row) row.closed++;
      const finishedAt = new Date(issue.updatedAt).getTime();
      if (now - finishedAt <= 30 * DAY) resolvedLast30++;
      const resolvedDay = dailyIndex.get(dayKey(finishedAt));
      if (resolvedDay !== undefined) daily[resolvedDay].resolved++;
      leadSum += lc.leadTimeMs; leadN++;
      if (row) { row.leadSum += lc.leadTimeMs; row.leadN++; }
    } else {
      open++;
      if (issue.priority in openByPriority) openByPriority[issue.priority]++;
      if (row) row.open++;
      if (lc.isStalled) { stalled++; if (row) row.stalled++; }
      if (lc.isSlaPaused) paused++;
    }
  }

  return {
    total: issues.length,
    open,
    stalled,
    paused,
    resolvedLast30Days: resolvedLast30,
    avgLeadTimeMs: leadN ? Math.round(leadSum / leadN) : 0,
    byStatus,
    openByPriority,
    perDepartment: [...rows.values()].map(({ leadSum: ls, leadN: ln, ...r }) => ({ ...r, avgLeadTimeMs: ln ? Math.round(ls / ln) : 0 })),
    daily,
  };
}

/** One CSV cell. Cells that start with = + - @ (or a control character) would run as formulas in Excel/Sheets, so they are prefixed with an apostrophe. */
export const csvCell = (value: unknown): string => {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function issuesToCsv(issues: Issue[], departments: Department[]): string {
  const header = ['Code', 'Title', 'Department', 'Status', 'Priority', 'Assignee', 'Reporter', 'Created', 'Updated'];
  const lines = [header.map(csvCell).join(',')];
  for (const i of issues) {
    const dept = departments.find((d) => d.id === i.departmentId);
    lines.push(
      [i.code, i.title, dept?.name || '', i.status, i.priority, i.assignee?.name || '', i.reporter?.name || '', i.createdAt, i.updatedAt]
        .map(csvCell)
        .join(',')
    );
  }
  return lines.join('\r\n');
}
