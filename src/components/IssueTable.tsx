import React, { useState } from 'react';
import { useIssues } from '../context/TicketContext';
import { NavView, Priority, Status } from '../types';
import { getDepartmentBadges, getUserDepartmentId } from '../lib/departmentRules';
import { UserAvatar } from './UserAvatar';
import { UserHoverCard } from './UserHoverCard';
import { Star, Plus, Link2, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { BulkActionBar } from './BulkActionBar';
import { SavedViewsMenu } from './SavedViewsMenu';
import { CustomSelect, SelectOption } from './CustomSelect';
import { statusLabel } from '../lib/workflow';
import type { SortKey } from '../types';
import { formatDate, timeAgo } from '../lib/utils';

export const IssueTable: React.FC = () => {
  const {
    filteredIssues,
    setSelectedIssue,
    toggleStar,
    priorityFilter,
    setPriorityFilter,
    selectedDepartment,
    fieldFilters,
    setFieldFilter,
    setNavView,
    issues,
    departments,
    currentUser,
    navView,
    setIsCreatingIssue,
    sort,
    setSort,
  } = useIssues();

  // Tickets ticked for a bulk action. Only ids still in the list count (filters can hide ticked rows).
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (!currentUser) return null;

  const selectedIssues = filteredIssues.filter((i) => selected.has(i.id));
  const allSelected = filteredIssues.length > 0 && selectedIssues.length === filteredIssues.length;
  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(filteredIssues.map((i) => i.id)));

  const FIRST_DIRECTION: Record<SortKey, 'asc' | 'desc'> = {
    number: 'desc', priority: 'asc', title: 'asc', status: 'asc', assignee: 'asc', updatedAt: 'desc', createdAt: 'desc',
  };
  const SORT_LABELS: Record<SortKey, string> = {
    updatedAt: 'Recently updated', createdAt: 'Newest created', number: 'Ticket number', priority: 'Priority',
    status: 'Status', title: 'Title', assignee: 'Assignee',
  };
  const sortOptions: SelectOption[] = (Object.keys(SORT_LABELS) as SortKey[]).map((k) => ({
    value: k,
    label: SORT_LABELS[k],
  }));
  const sortHeader = (label: string, key: SortKey, className = '') => {
    const active = sort.key === key;
    return (
      <th
        className={`py-2 px-3 ${className}`}
        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <button
          type="button"
          onClick={() =>
            setSort({ key, dir: active ? (sort.dir === 'asc' ? 'desc' : 'asc') : FIRST_DIRECTION[key] })
          }
          className={`inline-flex items-center gap-1 uppercase cursor-pointer hover:text-black ${active ? 'text-gray-900' : ''}`}
          title={`Sort by ${label.toLowerCase()}`}
        >
          {label}
          {active ? (
            sort.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
          ) : (
            <ChevronsUpDown className="w-3 h-3 opacity-30" />
          )}
        </button>
      </th>
    );
  };

  const getPriorityBadge = (p: Priority) => {
    switch (p) {
      case 'P0':
        return (
          <span className="font-mono font-bold text-xs text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
            P0
          </span>
        );
      case 'P1':
        return (
          <span className="font-mono font-medium text-xs text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
            P1
          </span>
        );
      case 'P2':
        return (
          <span className="font-mono text-xs text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
            P2
          </span>
        );
      case 'P3':
        return (
          <span className="font-mono text-xs text-gray-600 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">
            P3
          </span>
        );
    }
  };

  const getStatusBadge = (s: Status, deptId?: string) => {
    const label = statusLabel(departments.find((d) => d.id === deptId), s);
    const isDone = s === 'COMPLETED' || s === 'VERIFIED' || s === 'CLOSED';
    return (
      <span
        className={`font-mono text-[11px] px-1.5 py-0.5 rounded border ${
          isDone
            ? 'bg-gray-100 text-gray-700 border-gray-300'
            : s === 'ASSIGNED'
            ? 'bg-gray-50 text-gray-900 border-gray-300 font-medium'
            : 'bg-white text-gray-800 border-gray-300'
        }`}
      >
        {label}
      </span>
    );
  };

  const userDeptId = getUserDepartmentId(currentUser, departments);
  const userDept = departments.find((d) => d.id === userDeptId);
  const selectedDeptObj = departments.find((d) => d.id === selectedDepartment);

  // Besides Priority, only the custom properties the department admin enabled as filters.
  const filterFields = (selectedDeptObj?.customFields || []).filter(
    (f) => f.type === 'select' && f.showAsFilter && (f.options?.length ?? 0) > 0
  );

  const getViewHeader = () => {
    if (selectedDepartment !== 'all') {
      const name = selectedDeptObj?.name || selectedDepartment;
      const which =
        navView === 'closed' ? 'closed issues' : navView === 'all' ? 'all issues' : 'open issues (completed ones stay until closed)';
      return {
        title: name,
        badge: selectedDeptObj?.code,
        subtitle: `Showing ${which} in ${name}`,
      };
    }
    if (navView === 'open') {
      return {
        title: `Open Issues in ${userDept?.name || currentUser.department}`,
        badge: userDept?.code || 'DEV',
        subtitle: `Everything not yet closed in your department, completed tickets included (${userDept?.name || currentUser.department})`,
      };
    }
    if (navView === 'assigned_to_me') {
      return {
        title: 'Assigned to Me',
        badge: userDept?.code || 'DEV',
        subtitle: `Open tickets assigned to you in your department (${userDept?.name || currentUser.department})`,
      };
    }
    if (navView === 'reported_by_me') {
      return {
        title: 'Reported by Me',
        subtitle: 'Tickets you reported, across all departments',
      };
    }
    if (navView === 'starred') {
      return {
        title: 'Starred Issues',
        subtitle: 'Your bookmarked tickets, across all departments',
      };
    }
    if (navView === 'closed') {
      return {
        title: `Closed Issues (${userDept?.name || currentUser.department})`,
        badge: userDept?.code,
        subtitle: `Closed tickets in your department (${userDept?.name || currentUser.department})`,
      };
    }
    return {
      title: 'Issues',
      subtitle: '',
    };
  };

  // Open / Closed / All tabs on a department page
  const deptIssues = selectedDeptObj ? issues.filter((i) => i.departmentId === selectedDeptObj.id) : [];
  const isClosed = (st: Status) => st === 'CLOSED';
  const deptTabs: { id: NavView; label: string; count: number }[] = [
    { id: 'open', label: 'Open', count: deptIssues.filter((i) => !isClosed(i.status)).length },
    { id: 'closed', label: 'Closed', count: deptIssues.filter((i) => isClosed(i.status)).length },
    { id: 'all', label: 'All', count: deptIssues.length },
  ];

  const viewHeader = getViewHeader();

  return (
    <div className="flex-1 overflow-y-auto bg-white flex flex-col">
      {/* Contextual View Header Bar */}
      <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center justify-between select-none">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-bold text-xs text-gray-900 font-mono tracking-tight">
            {viewHeader.title}
          </h2>
          {viewHeader.badge && (
            <span className="font-mono text-[10px] font-semibold bg-gray-100 border border-gray-300 text-gray-800 px-1.5 py-0.2 rounded">
              {viewHeader.badge}
            </span>
          )}
          <span className="text-gray-300 hidden sm:inline">•</span>
          <span className="text-[11px] text-gray-500 font-mono hidden sm:inline">
            {viewHeader.subtitle}
          </span>
        </div>

        {selectedDeptObj && (
          <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded border border-gray-200 text-[11px] font-mono shrink-0">
            {deptTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setNavView(t.id)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  navView === t.id
                    ? 'bg-white text-gray-900 font-semibold shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {t.label} <span className="text-gray-400">{t.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table Toolbar */}
      <div className="px-3 sm:px-4 py-2 border-b border-gray-200 bg-gray-50/70 flex flex-wrap items-center justify-between gap-2 text-xs select-none">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
          {/* Priority filter */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto max-w-full py-0.5">
            <span className="text-gray-500 font-medium mr-1 text-[11px] shrink-0">Priority:</span>
            {['ALL', 'P0', 'P1', 'P2', 'P3'].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2 py-0.5 rounded font-mono text-[11px] transition-colors shrink-0 ${
                  priorityFilter === p
                    ? 'bg-black text-white font-medium'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Custom property filters (opt-in per field by the department admin) */}
          {filterFields.map((field) => (
            <React.Fragment key={field.id}>
              <div className="h-4 w-px bg-gray-200 hidden sm:block shrink-0" />
              <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto max-w-full py-0.5">
                <span className="text-gray-500 font-medium mr-1 text-[11px] shrink-0">{field.name}:</span>
                {['ALL', ...(field.options || [])].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setFieldFilter(field.id, opt)}
                    className={`px-2 py-0.5 rounded font-mono text-[11px] transition-colors shrink-0 ${
                      (fieldFilters[field.id] || 'ALL') === opt
                        ? 'bg-black text-white font-medium'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="md:hidden w-40">
            <CustomSelect
              value={sort.key}
              size="xs"
              options={sortOptions}
              onChange={(v) => setSort({ key: v as SortKey, dir: FIRST_DIRECTION[v as SortKey] })}
            />
          </div>
          <SavedViewsMenu />
          <span className="font-mono text-[11px] text-gray-500">
            {filteredIssues.length} {filteredIssues.length === 1 ? 'issue' : 'issues'}
          </span>
        </div>
      </div>

      {/* Issues Content: Mobile Card List (< 768px) and Desktop Table (>= 768px) */}
      {filteredIssues.length > 0 ? (
        <>
          {/* 1. Mobile & Narrow Screen Card List (< 768px) - Zero Horizontal Scrolling */}
          <div className="md:hidden divide-y divide-gray-100 flex-1 overflow-y-auto">
            {filteredIssues.map((issue) => {
              const dept = departments.find((d) => d.id === issue.departmentId);
              const badges = getDepartmentBadges(issue, departments);

              return (
                <div
                  key={issue.id}
                  onClick={() => setSelectedIssue(issue)}
                  className="p-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer space-y-2 select-none"
                >
                  {/* Top Row: Star + ID + Dept Code | Priority + Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <input
                        type="checkbox"
                        checked={selected.has(issue.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelected(issue.id)}
                        aria-label={`Select ${issue.code}`}
                        className="w-4 h-4 accent-black cursor-pointer shrink-0"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(issue.id);
                        }}
                        className="p-1 -ml-1 text-gray-300 hover:text-amber-500 rounded cursor-pointer shrink-0"
                        aria-label="Star issue"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            issue.starred
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                      <span className="font-mono font-bold text-xs text-gray-900 shrink-0">
                        #{issue.number}
                      </span>
                      {dept && (
                        <span className="font-mono text-[10px] font-semibold bg-gray-100 border border-gray-200 text-gray-700 px-1.5 py-0.2 rounded shrink-0">
                          {dept.code}
                        </span>
                      )}
                      {issue.linkedIssues && issue.linkedIssues.length > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 font-mono text-[9px] text-gray-500 bg-gray-100 border border-gray-200 px-1 py-0.2 rounded shrink-0"
                          title={`${issue.linkedIssues.length} linked ticket${issue.linkedIssues.length > 1 ? 's' : ''}`}
                        >
                          <Link2 className="w-2.5 h-2.5 text-gray-400" />
                          <span>{issue.linkedIssues.length}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {getPriorityBadge(issue.priority)}
                      {getStatusBadge(issue.status, issue.departmentId)}
                    </div>
                  </div>

                  {/* Middle Row: Ticket Title (wraps naturally, 100% visible, NO side-scroll!) */}
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors break-words leading-snug">
                      {issue.title}
                    </h3>
                  </div>

                  {/* Bottom Row: Attributes on left, Assignee & Time on right */}
                  <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] font-mono text-gray-500 flex-wrap">
                    <div className="flex items-center gap-1 flex-wrap min-w-0">
                      {badges.slice(0, 2).map((b, i) => (
                        <span
                          key={i}
                          className={`text-[9px] px-1.5 py-0.2 rounded border font-mono shrink-0 ${b.badgeClass}`}
                        >
                          {b.label}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                      {issue.assignee ? (
                        <div className="flex items-center gap-1 text-gray-700">
                          <UserAvatar user={issue.assignee} size="xs" />
                          <span className="font-sans text-[11px] font-medium max-w-[90px] truncate">
                            {issue.assignee.name.split(' ')[0]}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[10px]">—</span>
                      )}
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-400 text-[10px]">
                        {timeAgo(issue.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. Desktop Full Table (>= 768px) */}
          <div className="hidden md:block flex-1 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-white text-gray-500 font-mono text-[11px] select-none">
                  <th className="py-2 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all tickets in this list"
                      className="w-3.5 h-3.5 accent-black cursor-pointer"
                    />
                  </th>
                  <th className="py-2 px-3 w-8 text-center"></th>
                  {sortHeader('ID', 'number', 'w-16')}
                  {sortHeader('PRI', 'priority', 'w-14')}
                  {sortHeader('Title', 'title')}
                  {(selectedDepartment === 'all' || navView === 'assigned_to_me') && (
                    <th className="py-2 px-3 w-28 hidden md:table-cell">DEPARTMENT</th>
                  )}
                  <th className="py-2 px-3 w-48 hidden sm:table-cell">ATTRIBUTES</th>
                  {sortHeader('Status', 'status', 'w-24')}
                  {sortHeader('Assignee', 'assignee', 'w-32 hidden sm:table-cell')}
                  {sortHeader('Modified', 'updatedAt', 'w-24 text-right hidden md:table-cell')}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredIssues.map((issue) => {
                  const dept = departments.find((d) => d.id === issue.departmentId);
                  const badges = getDepartmentBadges(issue, departments);

                  return (
                    <tr
                      key={issue.id}
                      onClick={() => setSelectedIssue(issue)}
                      className="hover:bg-gray-50/80 cursor-pointer transition-colors group"
                    >
                      {/* Select for bulk actions */}
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(issue.id)}
                          onChange={() => toggleSelected(issue.id)}
                          aria-label={`Select ${issue.code}`}
                          className="w-3.5 h-3.5 accent-black cursor-pointer"
                        />
                      </td>

                      {/* Star */}
                      <td
                        className="py-2.5 px-3 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(issue.id);
                        }}
                      >
                        <Star
                          className={`w-3.5 h-3.5 mx-auto ${
                            issue.starred
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-gray-300 group-hover:text-gray-400'
                          }`}
                        />
                      </td>

                      {/* ID */}
                      <td className="py-2.5 px-3 font-mono font-medium text-gray-600 group-hover:text-black">
                        #{issue.number}
                      </td>

                      {/* Priority */}
                      <td className="py-2.5 px-3">{getPriorityBadge(issue.priority)}</td>

                      {/* Title */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {issue.title}
                          </span>
                          {issue.linkedIssues && issue.linkedIssues.length > 0 && (
                            <span
                              className="inline-flex items-center gap-0.5 font-mono text-[9px] text-gray-500 bg-gray-100 border border-gray-200 px-1 py-0.2 rounded shrink-0"
                              title={`${issue.linkedIssues.length} linked ticket${issue.linkedIssues.length > 1 ? 's' : ''}`}
                            >
                              <Link2 className="w-2.5 h-2.5 text-gray-400" />
                              <span>{issue.linkedIssues.length}</span>
                            </span>
                          )}
                          {badges.slice(0, 1).map((b, i) => (
                            <span
                              key={i}
                              className={`sm:hidden font-mono text-[9px] px-1 py-0.5 rounded border ${b.badgeClass}`}
                            >
                              {b.label}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Department (shown when viewing all departments or cross-department assigned_to_me) */}
                      {(selectedDepartment === 'all' || navView === 'assigned_to_me') && (
                        <td className="py-2.5 px-3 font-mono text-gray-600 hidden md:table-cell truncate">
                          <span className="font-semibold text-gray-700 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded text-[10px]">
                            {dept?.name || issue.departmentId}
                          </span>
                        </td>
                      )}

                      {/* Department Specific Attributes */}
                      <td className="py-2.5 px-3 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {badges.length > 0 ? (
                            badges.map((badge, idx) => (
                              <span
                                key={idx}
                                className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${badge.badgeClass}`}
                                title={badge.tooltip}
                              >
                                {badge.label}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 font-mono text-[10px]">—</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3">{getStatusBadge(issue.status, issue.departmentId)}</td>

                      {/* Assignee */}
                      <td
                        className="py-2.5 px-3 text-gray-700 hidden sm:table-cell"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {issue.assignee ? (
                          <UserHoverCard user={issue.assignee}>
                            <div className="flex items-center gap-1.5 truncate group/assignee hover:text-black">
                              <UserAvatar user={issue.assignee} size="xs" />
                              <span className="truncate group-hover/assignee:underline decoration-dotted decoration-gray-400">
                                {issue.assignee.name}
                              </span>
                              {issue.assignee.nickname && (
                                <span className="text-[10px] text-gray-400 font-mono hidden xl:inline">
                                  @{issue.assignee.nickname}
                                </span>
                              )}
                            </div>
                          </UserHoverCard>
                        ) : (
                          <span className="text-gray-400 font-mono">—</span>
                        )}
                      </td>

                      {/* Modified */}
                      <td className="py-2.5 px-3 text-right text-gray-400 font-mono text-[11px] hidden md:table-cell">
                        {formatDate(issue.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bulk actions: a sticky footer, so it never pushes the rows around while you tick them */}
          {selectedIssues.length > 0 && (
            <BulkActionBar selected={selectedIssues} onClear={() => setSelected(new Set())} />
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-3">
          <p className="text-sm font-medium text-gray-500">No issues match this view or query.</p>
          <button
            onClick={() => setIsCreatingIssue(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-black text-white rounded-md hover:bg-gray-800 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Issue</span>
          </button>
        </div>
      )}
    </div>
  );
};
