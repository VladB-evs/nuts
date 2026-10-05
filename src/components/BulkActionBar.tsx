import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { useIssues } from '../context/TicketContext';
import { CustomSelect, SelectOption } from './CustomSelect';
import { UserAvatar } from './UserAvatar';
import { PRIORITY_OPTIONS, STATUS_OPTIONS, getStatusOptions } from '../lib/issueOptions';
import { departmentStatuses } from '../lib/workflow';
import type { Issue, Priority, Status } from '../types';

interface Props {
  selected: Issue[];
  onClear: () => void;
}

/** Appears over the issue list while tickets are selected: change status, priority or assignee for all of them. */
export const BulkActionBar: React.FC<Props> = ({ selected, onClear }) => {
  const { bulkUpdateIssues, users, departments } = useIssues();

  // Only statuses every selected ticket's department allows (and that department's own names if they share one).
  const statusOptions = useMemo<SelectOption[]>(() => {
    const deptIds = [...new Set(selected.map((i) => i.departmentId))];
    const depts = deptIds.map((id) => departments.find((d) => d.id === id));
    if (depts.length === 1) return getStatusOptions(depts[0]);
    const allowed = depts.map((d) => departmentStatuses(d) as string[]);
    return STATUS_OPTIONS.filter((o) => allowed.every((list) => list.includes(o.value)));
  }, [selected, departments]);

  const assigneeOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'unassigned', label: 'Unassigned', description: 'Remove the assignee' },
      ...users
        .filter((u) => u.status !== 'departed')
        .map((u) => ({
          value: u.id,
          label: u.name,
          badge: u.nickname ? `@${u.nickname}` : undefined,
          badgeClass: 'bg-gray-50 text-gray-500 border-gray-200 font-mono text-[9px]',
          icon: <UserAvatar user={u} size="xs" />,
        })),
    ],
    [users]
  );

  const count = selected.length;
  const ids = selected.map((i) => i.id);

  const apply = async (
    what: string,
    updates: { status?: Status; priority?: Priority; assigneeId?: string }
  ) => {
    if (!window.confirm(`${what} for ${count} ${count === 1 ? 'ticket' : 'tickets'}?`)) return;
    if (await bulkUpdateIssues(ids, updates)) onClear();
  };

  return (
    <div
      className="sticky bottom-0 z-20 mt-auto flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2 bg-blue-50 border-t border-blue-200 shadow-[0_-4px_10px_rgba(0,0,0,0.12)] text-xs"
      role="region"
      aria-label="Bulk actions"
    >
      <span className="font-semibold text-blue-900">{count} selected</span>
      <div className="w-36">
        <CustomSelect
          value=""
          placeholder="Set status…"
          size="xs"
          options={statusOptions}
          onChange={(v) => apply(`Set status to ${v}`, { status: v as Status })}
        />
      </div>
      <div className="w-36">
        <CustomSelect
          value=""
          placeholder="Set priority…"
          size="xs"
          options={PRIORITY_OPTIONS}
          onChange={(v) => apply(`Set priority to ${v}`, { priority: v as Priority })}
        />
      </div>
      <div className="w-40">
        <CustomSelect
          value=""
          placeholder="Assign to…"
          size="xs"
          searchable={users.length > 5}
          options={assigneeOptions}
          onChange={(v) =>
            apply(v === 'unassigned' ? 'Remove the assignee' : `Assign to ${users.find((u) => u.id === v)?.name || 'this person'}`, {
              assigneeId: v,
            })
          }
        />
      </div>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-blue-800 hover:bg-blue-100 rounded cursor-pointer"
      >
        <X className="w-3.5 h-3.5" /> Clear
      </button>
    </div>
  );
};
