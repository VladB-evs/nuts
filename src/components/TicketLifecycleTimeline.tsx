import React, { useState, useMemo } from 'react';
import { useIssues } from '../context/TicketContext';
import { Issue, Priority } from '../types';
import {
  computeTicketLifecycle,
  computeDepartmentLifecycleMetrics,
  formatDuration,
  STATUS_META,
  PRIORITY_SLAS,
  TicketLifecycle,
} from '../lib/timelineUtils';
import { CustomSelect } from './CustomSelect';
import { UserAvatar } from './UserAvatar';
import {
  Clock,
  Search,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  X,
} from 'lucide-react';

export const TicketLifecycleTimeline: React.FC = () => {
  const { issues, departments, setSelectedIssue } = useIssues();

  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [healthFilter, setHealthFilter] = useState<'all' | 'in_progress' | 'resolved' | 'stalled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'duration' | 'cycle_time' | 'recent' | 'priority' | 'id'>('recent');
  const [isSlaModalOpen, setIsSlaModalOpen] = useState(false);

  // Filter issues by department, priority, and search
  const filteredIssues = useMemo(() => {
    return issues.filter((iss) => {
      // Department filter
      if (selectedDeptId !== 'all' && iss.departmentId !== selectedDeptId) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'ALL' && iss.priority !== priorityFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = iss.code.toLowerCase().includes(q);
        const matchesNum = String(iss.number).includes(q);
        const matchesTitle = iss.title.toLowerCase().includes(q);
        const matchesAssignee = iss.assignee?.name.toLowerCase().includes(q) || false;
        if (!matchesCode && !matchesNum && !matchesTitle && !matchesAssignee) {
          return false;
        }
      }

      return true;
    });
  }, [issues, selectedDeptId, priorityFilter, searchQuery]);

  // Compute lifecycles for all filtered issues
  const ticketLifecycles: TicketLifecycle[] = useMemo(() => {
    const list = filteredIssues.map((iss) => computeTicketLifecycle(iss));

    // Health filter
    const afterHealth = list.filter((l) => {
      if (healthFilter === 'in_progress') return !l.isResolved;
      if (healthFilter === 'resolved') return l.isResolved;
      if (healthFilter === 'stalled') return l.isStalled;
      return true;
    });

    // Sorting
    return afterHealth.sort((a, b) => {
      if (sortBy === 'duration') return b.totalDurationMs - a.totalDurationMs;
      if (sortBy === 'cycle_time') return b.cycleTimeMs - a.cycleTimeMs;
      if (sortBy === 'priority') {
        const pOrder: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
        return pOrder[a.priority] - pOrder[b.priority];
      }
      if (sortBy === 'id') {
        const aNum = parseInt(a.code.split('-')[1] || '0', 10);
        const bNum = parseInt(b.code.split('-')[1] || '0', 10);
        return bNum - aNum;
      }
      // default: recent activity
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [filteredIssues, healthFilter, sortBy]);

  // Compute aggregated department metrics for the current department filter
  const departmentMetrics = useMemo(() => {
    return computeDepartmentLifecycleMetrics(filteredIssues);
  }, [filteredIssues]);

  // Priority options for CustomSelect
  const priorityOptions = [
    { value: 'ALL', label: 'All Priorities' },
    { value: 'P0', label: 'P0 — Blocker', badge: 'P0', badgeClass: 'bg-red-50 text-red-700 border-red-200' },
    { value: 'P1', label: 'P1 — Critical', badge: 'P1', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
    { value: 'P2', label: 'P2 — Major', badge: 'P2', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'P3', label: 'P3 — Minor', badge: 'P3', badgeClass: 'bg-gray-50 text-gray-700 border-gray-200' },
  ];

  // Department options for CustomSelect
  const deptSelectOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Departments' },
      ...departments.map((d) => ({
        value: d.id,
        label: d.name,
        badge: d.code,
      })),
    ];
  }, [departments]);

  const sortOptions = [
    { value: 'recent', label: 'Recently Active' },
    { value: 'duration', label: 'Longest Elapsed Time' },
    { value: 'cycle_time', label: 'Longest Work Cycle' },
    { value: 'priority', label: 'Highest Priority' },
    { value: 'id', label: 'Ticket ID' },
  ];

  const hasActiveFilters = selectedDeptId !== 'all' || priorityFilter !== 'ALL' || healthFilter !== 'all' || Boolean(searchQuery);

  return (
    <div className="flex-1 overflow-y-auto bg-white flex flex-col select-none">
      {/* 1. Clean Top Header */}
      <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-800 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-gray-900 font-mono tracking-tight">
                Ticket Lifecycle
              </h1>
              <span className="text-[10px] font-mono text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.2 rounded font-medium">
                {ticketLifecycles.length} of {issues.length}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-sans">
              Stage durations, lead time, and SLA progression across company departments.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsSlaModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-mono font-medium transition-colors cursor-pointer shadow-2xs hover:border-gray-300"
          title="View Priority SLA policy and stall threshold definitions"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
          <span>SLA Policy</span>
        </button>
      </div>

      {/* 2. Calm, Streamlined KPI Metrics Bar */}
      <div className="px-6 py-2 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap text-xs font-mono">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400 font-sans">Avg Work Cycle:</span>
            <span className="font-bold text-gray-900">{formatDuration(departmentMetrics.avgCycleTimeMs)}</span>
          </div>
          <div className="h-3 w-px bg-gray-200 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400 font-sans">Avg Lead Time:</span>
            <span className="font-bold text-gray-900">{formatDuration(departmentMetrics.avgLeadTimeMs)}</span>
          </div>
          <div className="h-3 w-px bg-gray-200 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400 font-sans">Avg Triage:</span>
            <span className="font-bold text-gray-900">{formatDuration(departmentMetrics.avgTriageTimeMs)}</span>
          </div>
          <div className="h-3 w-px bg-gray-200 hidden sm:block" />

          {/* SLA Breached toggle */}
          <button
            onClick={() => setHealthFilter(healthFilter === 'stalled' ? 'all' : 'stalled')}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
              departmentMetrics.stalledTickets > 0
                ? healthFilter === 'stalled'
                  ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                : 'text-gray-500 hover:text-gray-800'
            }`}
            title="Click to toggle SLA Breached / Stalled tickets filter"
          >
            {departmentMetrics.stalledTickets > 0 ? (
              <>
                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                <span>{departmentMetrics.stalledTickets} SLA Breached</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="text-gray-500">All within SLA</span>
              </>
            )}
          </button>
        </div>

        {/* Minimal Pipeline Legend */}
        <div className="hidden xl:flex items-center gap-1.5 text-[10px] font-mono text-gray-400">
          <span className="text-gray-400 mr-1 uppercase">Stages:</span>
          {Object.entries(STATUS_META).map(([k, meta], idx) => (
            <React.Fragment key={k}>
              <span className="inline-flex items-center gap-1">
                <span className={`w-2 h-2 rounded-xs ${meta.barColor}`} />
                <span className="text-gray-600">{meta.label}</span>
              </span>
              {idx < Object.keys(STATUS_META).length - 1 && (
                <span className="text-gray-300">→</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 3. Unified Toolbar & Filters */}
      <div className="px-6 py-2.5 border-b border-gray-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          {/* Search Box */}
          <div className="relative w-52">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, title, assignee..."
              className="w-full pl-8 pr-7 py-1 text-xs bg-gray-50 border border-gray-200 rounded font-sans focus:outline-none focus:border-gray-400 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Department Select */}
          <CustomSelect
            value={selectedDeptId}
            onChange={(val) => setSelectedDeptId(val)}
            options={deptSelectOptions}
            className="w-40"
            size="xs"
          />

          {/* Priority Select */}
          <CustomSelect
            value={priorityFilter}
            onChange={(val) => setPriorityFilter(val)}
            options={priorityOptions}
            className="w-36"
            size="xs"
          />

          {/* Health Segmented Buttons */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded border border-gray-200 font-mono text-[11px]">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'resolved', label: 'Resolved' },
                {
                  id: 'stalled',
                  label: `Stalled${departmentMetrics.stalledTickets > 0 ? ` (${departmentMetrics.stalledTickets})` : ''}`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setHealthFilter(tab.id)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  healthFilter === tab.id
                    ? 'bg-white text-gray-900 font-semibold shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Reset Filters Link */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSelectedDeptId('all');
                setPriorityFilter('ALL');
                setHealthFilter('all');
                setSearchQuery('');
              }}
              className="text-[11px] font-mono text-gray-400 hover:text-black underline cursor-pointer ml-1"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Right Sort Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-mono text-gray-400">Sort:</span>
          <CustomSelect
            value={sortBy}
            onChange={(val) => setSortBy(val as any)}
            options={sortOptions}
            className="w-40"
            size="xs"
          />
        </div>
      </div>

      {/* 4. Main Timeline Ticket List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {ticketLifecycles.length > 0 ? (
          ticketLifecycles.map((ticket) => {
            const rawIssue = issues.find((i) => i.id === ticket.issueId);
            const dept = departments.find((d) => d.id === ticket.departmentId);
            const activeMeta = STATUS_META[ticket.currentStatus] || STATUS_META.NEW;

            return (
              <div
                key={ticket.issueId}
                onClick={() => rawIssue && setSelectedIssue(rawIssue)}
                className="px-6 py-3 hover:bg-gray-50/70 transition-colors cursor-pointer group"
              >
                {/* Row Header: Code, Priority, Title, Dept, Assignee, Status, Elapsed */}
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                    {/* Ticket Code */}
                    <span className="font-mono font-bold text-xs text-gray-900 group-hover:text-blue-600 transition-colors shrink-0">
                      {ticket.code}
                    </span>

                    {/* Priority Badge */}
                    <span
                      className={`font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded border shrink-0 ${ticket.sla.badgeClass}`}
                      title={`${ticket.priority} (${ticket.sla.label}): Max ${ticket.sla.stageMaxFormatted} in active stage, ${ticket.sla.resolutionMaxFormatted} resolution`}
                    >
                      {ticket.priority} · {ticket.sla.stageMaxFormatted} SLA
                    </span>

                    {/* Department Badge */}
                    {dept && (
                      <span className="font-mono text-[9px] bg-gray-100 border border-gray-200 text-gray-600 px-1.5 py-0.2 rounded shrink-0">
                        {dept.code}
                      </span>
                    )}

                    {/* Title */}
                    <span className="font-medium text-xs text-gray-800 truncate">
                      {ticket.title}
                    </span>
                  </div>

                  {/* Right Meta Column */}
                  <div className="flex items-center gap-2.5 shrink-0 text-xs font-mono">
                    {/* Assignee */}
                    {ticket.assignee ? (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <UserAvatar user={ticket.assignee} size="xs" />
                        <span className="text-[11px] hidden sm:inline">{ticket.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-400 font-mono hidden sm:inline">Unassigned</span>
                    )}

                    {/* Reopened Indicator */}
                    {ticket.hasRegressions && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                        title="Ticket regressed or was reopened during its lifecycle"
                      >
                        <RotateCcw className="w-2.5 h-2.5 text-rose-500" />
                        <span>Reopened ({ticket.regressionCount})</span>
                      </span>
                    )}

                    {/* Stalled / SLA Breached Tag */}
                    {ticket.isStalled && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                        title={ticket.stalledReason}
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>+{formatDuration(ticket.slaOverdueMs)}</span>
                      </span>
                    )}

                    {/* Status Pill */}
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded border font-medium ${activeMeta.bgClass} ${activeMeta.textClass} ${activeMeta.borderClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${activeMeta.barColor}`} />
                      <span>{activeMeta.label}</span>
                    </span>

                    {/* Total Elapsed Time */}
                    <span className="font-mono text-gray-900 font-bold text-xs w-16 text-right shrink-0">
                      {formatDuration(ticket.totalDurationMs)}
                    </span>

                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-black transition-colors" />
                  </div>
                </div>

                {/* Refined Lifecycle Progression Bar (8px sleek modern bar) */}
                <div className="h-2 w-full bg-gray-100 rounded-sm border border-gray-200 flex overflow-hidden gap-0.5 p-0.2">
                  {ticket.segments.map((seg) => {
                    const meta = STATUS_META[seg.status] || STATUS_META.NEW;

                    return (
                      <div
                        key={seg.id}
                        style={{ flexGrow: Math.max(1, Math.round(seg.durationMs / 1000)) }}
                        className={`relative h-full rounded-xs transition-opacity duration-150 group/seg cursor-default ${
                          meta.barColor
                        } ${
                          seg.isCurrent
                            ? 'ring-1 ring-black/40 ring-inset'
                            : 'opacity-85 hover:opacity-100'
                        }`}
                      >
                        {/* Hover Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/seg:flex flex-col bg-gray-900 text-white p-2.5 rounded shadow-xl text-left text-[11px] z-30 pointer-events-none min-w-[210px] whitespace-normal">
                          <div className="flex items-center justify-between gap-2 border-b border-gray-700 pb-1 mb-1">
                            <span className="font-bold text-white uppercase font-mono">{meta.label}</span>
                            {seg.isCurrent && (
                              <span className="text-[9px] bg-emerald-600 text-white px-1 rounded font-mono font-medium">
                                Active Stage
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-300 font-mono space-y-0.5">
                            <p>
                              Duration: <span className="text-white font-bold">{formatDuration(seg.durationMs)}</span>
                            </p>
                            {seg.isCurrent && (
                              <p>
                                Priority SLA: <span className={ticket.isStalled ? 'text-amber-400 font-bold' : 'text-emerald-400 font-semibold'}>
                                  {ticket.sla.stageMaxFormatted} Max ({ticket.slaUsagePercent}% used)
                                </span>
                              </p>
                            )}
                            {seg.isCurrent && ticket.isStalled && (
                              <p className="text-amber-300 font-semibold">
                                Overdue by: +{formatDuration(ticket.slaOverdueMs)}
                              </p>
                            )}
                            {seg.isCurrent && !ticket.isStalled && (
                              <p className="text-emerald-400">
                                Remaining budget: {formatDuration(ticket.slaRemainingMs)}
                              </p>
                            )}
                            {seg.startTime && (
                              <p className="truncate">
                                From: {new Date(seg.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                              </p>
                            )}
                            {seg.endTime && (
                              <p className="truncate">
                                To: {new Date(seg.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                              </p>
                            )}
                            {seg.actor && (
                              <p className="text-gray-400 truncate">
                                Moved by: <span className="text-white font-medium">{seg.actor.name}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sub-row Status Caption */}
                <div className="mt-1 text-[10px] font-mono flex items-center justify-between text-gray-400">
                  {ticket.isResolved ? (
                    <span>
                      ✓ Resolved · Lead time: <strong className="text-gray-700">{formatDuration(ticket.leadTimeMs || ticket.totalDurationMs)}</strong> · Work cycle: <strong className="text-gray-700">{formatDuration(ticket.cycleTimeMs)}</strong>
                    </span>
                  ) : (
                    <span>
                      Active in {activeMeta.label} for <strong className="text-gray-700">{formatDuration(ticket.stalledDurationMs)}</strong> · {ticket.isStalled ? (
                        <span className="text-amber-700 font-semibold">
                          Breached {ticket.priority} SLA by +{formatDuration(ticket.slaOverdueMs)} ({ticket.slaUsagePercent}% used)
                        </span>
                      ) : (
                        <span>
                          {formatDuration(ticket.slaRemainingMs)} left before stall ({ticket.slaUsagePercent}% used)
                        </span>
                      )}
                    </span>
                  )}

                  <span className="text-gray-400 hidden md:inline">
                    Updated {new Date(ticket.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-16 text-center space-y-2">
            <Clock className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-700 font-mono">
              No tickets match your filters
            </p>
            <p className="text-xs text-gray-400 font-sans max-w-sm">
              Try adjusting your department, priority, or search query to view ticket lifecycle timelines.
            </p>
          </div>
        )}
      </div>

      {/* 5. SLA Policy & Stall Definition Modal */}
      {isSlaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none animate-fade-in">
          <div className="bg-white rounded-lg border border-gray-200 shadow-xl max-w-xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-gray-900" />
                <h3 className="font-mono font-bold text-sm text-gray-900">
                  Priority SLA & Stall Policy
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSlaModalOpen(false)}
                className="text-gray-400 hover:text-black p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Clear definition explanation */}
            <div className="bg-sky-50/70 border border-sky-200 rounded p-3 text-xs text-sky-950 space-y-1">
              <span className="font-bold block font-mono">What does "Stalled" mean in NUTS?</span>
              <p className="text-[11px] leading-relaxed text-sky-900">
                A ticket is marked as <strong>Stalled (SLA Breached)</strong> when it remains in an active, unresolved stage (<code className="bg-white px-1 py-0.5 rounded border border-sky-200">NEW</code>, <code className="bg-white px-1 py-0.5 rounded border border-sky-200">ASSIGNED</code>, or <code className="bg-white px-1 py-0.5 rounded border border-sky-200">ACCEPTED</code>) longer than the Service Level Agreement (SLA) configured for its Priority.
              </p>
              <p className="text-[11px] leading-relaxed text-sky-900">
                Once a ticket is resolved (<code className="bg-white px-1 py-0.5 rounded border border-sky-200">FIXED</code>, <code className="bg-white px-1 py-0.5 rounded border border-sky-200">VERIFIED</code>, or <code className="bg-white px-1 py-0.5 rounded border border-sky-200">CLOSED</code>), stage timers halt.
              </p>
            </div>

            {/* SLA Table */}
            <div className="border border-gray-200 rounded overflow-hidden text-xs font-mono">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-[10px] text-gray-500 uppercase font-semibold">
                  <tr>
                    <th className="py-2 px-3">Priority</th>
                    <th className="py-2 px-3">Stage SLA (Stall Limit)</th>
                    <th className="py-2 px-3">Resolution SLA</th>
                    <th className="py-2 px-3">Scope & Criteria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[11px]">
                  {Object.values(PRIORITY_SLAS).map((sla) => (
                    <tr key={sla.priority} className="hover:bg-gray-50/80">
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded border font-bold text-[10px] ${sla.badgeClass}`}>
                          {sla.priority} — {sla.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">
                        {sla.stageMaxFormatted}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">
                        {sla.resolutionMaxFormatted}
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 font-sans text-[11px]">
                        {sla.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setIsSlaModalOpen(false)}
                className="px-3.5 py-1.5 bg-black text-white hover:bg-gray-800 rounded font-mono text-xs font-medium cursor-pointer"
              >
                Close Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
