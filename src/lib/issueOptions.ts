import type { SelectOption } from '../components/CustomSelect';
import type { Department, Status } from '../types';
import { departmentStatuses, statusLabel } from './workflow';

export const ISSUE_TYPES = ['Bug', 'Feature', 'Update', 'Adjustment'];

/**
 * Departments saved before Update/Adjustment existed still carry the old two-option Issue Type
 * list. Add the standard types to any such field so every workspace gets them without edits.
 */
export const withStandardIssueTypes = (dept: Department): Department => ({
  ...dept,
  customFields: dept.customFields?.map((f) =>
    f.id === 'issueType' && f.type === 'select'
      ? { ...f, options: [...(f.options || []), ...ISSUE_TYPES.filter((t) => !f.options?.includes(t))] }
      : f
  ),
});

export const STATUS_OPTIONS: SelectOption[] = [
  { value: 'NEW', label: 'NEW', badge: 'NEW', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'ASSIGNED', label: 'ASSIGNED', badge: 'ASSIGNED', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'ACCEPTED', label: 'ACCEPTED', badge: 'ACCEPTED', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'PENDING', label: 'PENDING', badge: 'PENDING', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'COMPLETED', label: 'COMPLETED', badge: 'COMPLETED', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'VERIFIED', label: 'VERIFIED', badge: 'VERIFIED', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200' },
  { value: 'CLOSED', label: 'CLOSED', badge: 'CLOSED', badgeClass: 'bg-gray-100 text-gray-700 border-gray-300' },
];

export const PRIORITY_OPTIONS: SelectOption[] = [
  {
    value: 'P0',
    label: 'P0 — Blocker',
    badge: 'P0',
    badgeClass: 'bg-red-50 text-red-700 border-red-200 font-bold',
    description: '24h stage · 48h resolve',
  },
  {
    value: 'P1',
    label: 'P1 — Critical',
    badge: 'P1',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
    description: '3d stage · 7d resolve',
  },
  {
    value: 'P2',
    label: 'P2 — Major',
    badge: 'P2',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    description: '7d stage · 14d resolve',
  },
  {
    value: 'P3',
    label: 'P3 — Minor',
    badge: 'P3',
    badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
    description: '14d stage · 30d resolve',
  },
];

/**
 * Status choices for a department: only the statuses its workflow uses, under the names it gives
 * them. A ticket sitting in a status the workflow later dropped keeps showing it (`current`).
 */
export const getStatusOptions = (dept?: Pick<Department, 'workflow'> | null, current?: Status): SelectOption[] => {
  const allowed = departmentStatuses(dept);
  return STATUS_OPTIONS.filter((o) => (allowed as string[]).includes(o.value) || o.value === current).map((o) => {
    const label = statusLabel(dept, o.value as Status);
    return { ...o, label, badge: label };
  });
};
