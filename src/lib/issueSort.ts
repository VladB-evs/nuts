import type { Issue, SortDir, SortKey } from '../types';
import { STATUS_META } from './timelineUtils';

const PRIORITY_RANK: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

const compare = (a: Issue, b: Issue, key: SortKey): number => {
  switch (key) {
    case 'priority':
      return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
    case 'status':
      return (STATUS_META[a.status]?.order ?? 99) - (STATUS_META[b.status]?.order ?? 99);
    case 'title':
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    case 'assignee': {
      // unassigned tickets sort last in ascending order
      const an = a.assignee?.name, bn = b.assignee?.name;
      if (!an && !bn) return 0;
      if (!an) return 1;
      if (!bn) return -1;
      return an.localeCompare(bn, undefined, { sensitivity: 'base' });
    }
    case 'createdAt':
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    case 'updatedAt':
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    case 'number':
    default:
      return (a.number ?? 0) - (b.number ?? 0);
  }
};

/** Returns a sorted copy. Ties fall back to newest-first so the order is stable and predictable. */
export function sortIssues(issues: Issue[], key: SortKey, dir: SortDir): Issue[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...issues].sort((a, b) => {
    const c = compare(a, b, key) * sign;
    if (c !== 0) return c;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}
