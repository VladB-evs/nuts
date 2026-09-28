import React from 'react';
import { useIssues } from '../context/TicketContext';
import { Priority, Status, Environment, DevScope } from '../types';
import { Star, Plus } from 'lucide-react';
import { formatDate } from '../lib/utils';

export const IssueTable: React.FC = () => {
  const {
    filteredIssues,
    setSelectedIssue,
    toggleStar,
    priorityFilter,
    setPriorityFilter,
    envFilter,
    setEnvFilter,
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

  const getEnvBadge = (env?: Environment) => {
    switch (env) {
      case 'PROD':
        return (
          <span className="font-mono text-[10px] font-semibold text-purple-800 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
            PROD
          </span>
        );
      case 'STAGING':
        return (
          <span className="font-mono text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
            STAGING
          </span>
        );
      case 'LOCAL':
      default:
        return (
          <span className="font-mono text-[10px] font-medium text-gray-700 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
            LOCAL
          </span>
        );
    }
  };

  const getScopeBadge = (scope?: DevScope) => {
    if (!scope) return null;
    switch (scope) {
      case 'both':
        return (
          <span className="font-mono text-[10px] font-medium text-gray-700 bg-gray-100 border border-gray-200 px-1 py-0.5 rounded" title="Frontend + Backend">
            FE+BE
          </span>
        );
      case 'frontend':
        return (
          <span className="font-mono text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-1 py-0.5 rounded" title="Frontend">
            FE
          </span>
        );
      case 'backend':
        return (
          <span className="font-mono text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded" title="Backend">
            BE
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

  return (
    <div className="flex-1 overflow-y-auto bg-white flex flex-col">
      {/* Table Toolbar */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50/70 flex flex-wrap items-center justify-between gap-2 text-xs select-none">
        <div className="flex flex-wrap items-center gap-4">
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

          <div className="h-4 w-px bg-gray-200 hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium mr-1">Env:</span>
            {['ALL', 'LOCAL', 'STAGING', 'PROD'].map((env) => (
              <button
                key={env}
                onClick={() => setEnvFilter(env)}
                className={`px-2 py-0.5 rounded font-mono text-[11px] transition-colors ${
                  envFilter === env
                    ? 'bg-black text-white font-medium'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {env}
              </button>
            ))}
          </div>
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
                <th className="py-2 px-3 w-20 hidden sm:table-cell">ENV</th>
                <th className="py-2 px-3 w-16 hidden lg:table-cell">LAYER</th>
                <th className="py-2 px-3 w-28 hidden md:table-cell">COMPONENT</th>
                <th className="py-2 px-3 w-24">STATUS</th>
                <th className="py-2 px-3 w-32 hidden sm:table-cell">ASSIGNEE</th>
                <th className="py-2 px-3 w-24 text-right hidden md:table-cell">MODIFIED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredIssues.map((issue) => {
                const dept = departments.find((d) => d.id === issue.departmentId);

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
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {issue.title}
                        </span>
                        <span className="sm:hidden font-mono text-[10px] text-gray-500">
                          [{issue.environment}]
                        </span>
                      </div>
                    </td>

                    {/* Env */}
                    <td className="py-2.5 px-3 hidden sm:table-cell">
                      {getEnvBadge(issue.environment)}
                    </td>

                    {/* Dev Layer / Scope */}
                    <td className="py-2.5 px-3 hidden lg:table-cell">
                      {getScopeBadge(issue.devScope)}
                    </td>

                    {/* Component */}
                    <td className="py-2.5 px-3 font-mono text-gray-600 hidden md:table-cell truncate">
                      {dept?.name || issue.departmentId}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3">{getStatusBadge(issue.status)}</td>

                    {/* Assignee */}
                    <td className="py-2.5 px-3 text-gray-700 hidden sm:table-cell truncate">
                      {issue.assignee?.name || <span className="text-gray-400 font-mono">—</span>}
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
