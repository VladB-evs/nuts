import type { NavView, SavedViewConfig, SortDir, SortKey } from '../types';

export const SORT_KEYS: SortKey[] = ['number', 'priority', 'status', 'title', 'assignee', 'updatedAt', 'createdAt'];
const NAV_VIEWS: NavView[] = ['open', 'assigned_to_me', 'reported_by_me', 'starred', 'closed', 'all'];
const PRIORITIES = ['ALL', 'P0', 'P1', 'P2', 'P3'];

export const DEFAULT_SORT: { key: SortKey; dir: SortDir } = { key: 'updatedAt', dir: 'desc' };

const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');

/**
 * Turns whatever the client sent into a safe saved-view config: unknown keys are dropped,
 * enums are checked, strings are length-limited. Used by the API before storing, and by the UI
 * before applying a stored view.
 */
export function sanitizeViewConfig(raw: unknown): SavedViewConfig {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, any>) : {};

  const filters: Record<string, string> = {};
  if (r.fieldFilters && typeof r.fieldFilters === 'object' && !Array.isArray(r.fieldFilters)) {
    for (const [k, v] of Object.entries(r.fieldFilters as Record<string, unknown>).slice(0, 10)) {
      if (/^[\w.-]{1,64}$/.test(k) && typeof v === 'string' && v.length <= 100) filters[k] = v;
    }
  }

  const sortKey = SORT_KEYS.includes(r.sort?.key) ? (r.sort.key as SortKey) : DEFAULT_SORT.key;
  const sortDir: SortDir = r.sort?.dir === 'asc' ? 'asc' : 'desc';

  return {
    departmentId: text(r.departmentId, 200) || 'all',
    navView: NAV_VIEWS.includes(r.navView) ? r.navView : 'open',
    priority: PRIORITIES.includes(r.priority) ? r.priority : 'ALL',
    fieldFilters: filters,
    sort: { key: sortKey, dir: sortDir },
    search: text(r.search, 200),
  };
}

/** A view name is 1-60 visible characters. */
export const cleanViewName = (v: unknown): string =>
  text(v, 200).replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
