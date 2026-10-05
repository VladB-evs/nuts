import type { Department, DepartmentWorkflow, Status } from '../types';

export const ALL_STATUSES: Status[] = [
  'NEW',
  'ASSIGNED',
  'ACCEPTED',
  'PENDING',
  'COMPLETED',
  'VERIFIED',
  'CLOSED',
];

/** A ticket leaves the main (Open) area only when it is CLOSED. COMPLETED tickets stay visible with their SLA stopped. */
export const isClosedStatus = (status: string): boolean => status === 'CLOSED';

const MAX_LABEL = 30;

export type WorkflowResult =
  | { ok: true; value: DepartmentWorkflow | null }
  | { ok: false; error: string };

/**
 * Validates a workflow from the client. A workflow must start somewhere (NEW) and be able to
 * leave the Open area (CLOSED); labels are short plain text. `null`/`undefined` means "use
 * every status with the default names".
 */
export function sanitizeWorkflow(raw: unknown): WorkflowResult {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  if (typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'Invalid workflow.' };

  const r = raw as { statuses?: unknown; labels?: unknown };
  if (!Array.isArray(r.statuses)) return { ok: false, error: 'Invalid workflow.' };

  const chosen = new Set<string>();
  for (const s of r.statuses) {
    if (typeof s !== 'string' || !(ALL_STATUSES as string[]).includes(s)) {
      return { ok: false, error: 'Unknown status in workflow.' };
    }
    chosen.add(s);
  }
  if (!chosen.has('NEW')) return { ok: false, error: 'A workflow must include NEW.' };
  if (!chosen.has('CLOSED')) {
    return { ok: false, error: 'A workflow must include CLOSED, the status that takes a ticket out of Open.' };
  }
  const statuses = ALL_STATUSES.filter((s) => chosen.has(s)); // canonical order

  const labels: Partial<Record<Status, string>> = {};
  if (r.labels && typeof r.labels === 'object' && !Array.isArray(r.labels)) {
    for (const [key, val] of Object.entries(r.labels as Record<string, unknown>)) {
      if (!chosen.has(key) || typeof val !== 'string') continue;
      // plain text only: drop control characters, collapse whitespace
      const clean = val.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL);
      if (clean && clean !== key) labels[key as Status] = clean;
    }
  }
  const allDefault = statuses.length === ALL_STATUSES.length && Object.keys(labels).length === 0;
  if (allDefault) return { ok: true, value: null };
  return { ok: true, value: { statuses, ...(Object.keys(labels).length ? { labels } : {}) } };
}

export const departmentStatuses = (dept?: Pick<Department, 'workflow'> | null): Status[] =>
  dept?.workflow?.statuses?.length ? dept.workflow.statuses : ALL_STATUSES;

export const isStatusAllowed = (workflow: DepartmentWorkflow | null | undefined, status: string): boolean =>
  (workflow?.statuses?.length ? (workflow.statuses as string[]) : (ALL_STATUSES as string[])).includes(status);

/** What this department calls a status (the stored value never changes). */
export const statusLabel = (dept: Pick<Department, 'workflow'> | null | undefined, status: Status): string =>
  dept?.workflow?.labels?.[status] || status;
