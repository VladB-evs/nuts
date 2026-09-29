import React from 'react';
import { useIssues } from '../context/TicketContext';
import { Priority, Status } from '../types';
import { getDepartmentRuleKind, getDepartmentBadges } from '../lib/departmentRules';
import { UserAvatar } from './UserAvatar';
import { UserHoverCard } from './UserHoverCard';
import { Star, Plus } from 'lucide-react';
import { formatDate } from '../lib/utils';

export const IssueTable: React.FC = () => {
  const {
    filteredIssues,
    setSelectedIssue,
    toggleStar,
    priorityFilter,
    setPriorityFilter,
    selectedDepartment,
    subFilter,
    setSubFilter,
    departments,
    setIsCreateModalOpen,
  } = useIssues();

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

  const getStatusBadge = (s: Status) => {
    const isDone = s === 'FIXED' || s === 'VERIFIED' || s === 'CLOSED';
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
        {s}
      </span>
    );
  };

  const currentDeptKind = getDepartmentRuleKind(selectedDepartment);

  const getSubFilterOptions = () => {
    if (selectedDepartment === 'all') return null;

    switch (currentDeptKind) {
      case 'engineering':
        return { label: 'Env', options: ['ALL', 'LOCAL', 'STAGING', 'PROD'] };
      case 'marketing':
        return {
          label: 'Channel',
          options: ['ALL', 'Product Launch', 'Social Media', 'Content & SEO', 'Paid Ads'],
        };
      case 'sales':
        return {
          label: 'Segment',
          options: ['ALL', 'Enterprise', 'Mid-Market', 'SMB / Startup', 'Strategic Partner'],
        };
      case 'operations':
        return {
          label: 'Category',
          options: ['ALL', 'IT & Access', 'Finance & Billing', 'People & HR', 'Office & Facilities'],
        };
      default:
        return null;
    }
  };

  const subFilterConfig = getSubFilterOptions();

  return (
    <div className="flex-1 overflow-y-auto bg-white flex flex-col">
      {/* Table Toolbar */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50/70 flex flex-wrap items-center justify-between gap-2 text-xs select-none">
        <div className="flex flex-wrap items-center gap-4">
          {/* Priority filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium mr-1">Priority:</span>
            {['ALL', 'P0', 'P1', 'P2', 'P3'].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2 py-0.5 rounded font-mono text-[11px] transition-colors ${
                  priorityFilter === p
                    ? 'bg-black text-white font-medium'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Department-specific sub filter */}
          {subFilterConfig && (
            <>
              <div className="h-4 w-px bg-gray-200 hidden sm:block" />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-gray-500 font-medium mr-1">{subFilterConfig.label}:</span>
                {subFilterConfig.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSubFilter(opt)}
                    className={`px-2 py-0.5 rounded font-mono text-[11px] transition-colors ${
                      subFilter === opt
                        ? 'bg-black text-white font-medium'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <span className="font-mono text-[11px] text-gray-500">
          {filteredIssues.length} {filteredIssues.length === 1 ? 'issue' : 'issues'}
        </span>
      </div>

      {/* Issues Table */}
      {filteredIssues.length > 0 ? (
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-white text-gray-500 font-mono text-[11px] select-none">
                <th className="py-2 px-3 w-8 text-center"></th>
                <th className="py-2 px-3 w-16">ID</th>
                <th className="py-2 px-3 w-14">PRI</th>
                <th className="py-2 px-3">TITLE</th>
                {selectedDepartment === 'all' && (
                  <th className="py-2 px-3 w-28 hidden md:table-cell">COMPONENT</th>
                )}
                <th className="py-2 px-3 w-48 hidden sm:table-cell">ATTRIBUTES</th>
                <th className="py-2 px-3 w-24">STATUS</th>
                <th className="py-2 px-3 w-32 hidden sm:table-cell">ASSIGNEE</th>
                <th className="py-2 px-3 w-24 text-right hidden md:table-cell">MODIFIED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredIssues.map((issue) => {
                const dept = departments.find((d) => d.id === issue.departmentId);
                const badges = getDepartmentBadges(issue);

                return (
                  <tr
                    key={issue.id}
                    onClick={() => setSelectedIssue(issue)}
                    className="hover:bg-gray-50/80 cursor-pointer transition-colors group"
                  >
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

                    {/* Component (shown when viewing all departments) */}
                    {selectedDepartment === 'all' && (
                      <td className="py-2.5 px-3 font-mono text-gray-600 hidden md:table-cell truncate">
                        {dept?.name || issue.departmentId}
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
                    <td className="py-2.5 px-3">{getStatusBadge(issue.status)}</td>

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
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
          <p className="text-sm font-medium text-gray-500">No issues match this view or query.</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-black text-white rounded-md hover:bg-gray-800"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Issue</span>
          </button>
        </div>
      )}
    </div>
  );
};
