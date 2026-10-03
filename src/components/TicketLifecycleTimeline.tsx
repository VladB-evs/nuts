import React, { useState, useMemo } from 'react';
import { useIssues } from '../context/TicketContext';
import { Issue, Priority } from '../types';
import {
  computeTicketLifecycle,
  computeDepartmentLifecycleMetrics,
  formatDuration,
  STATUS_META,
  TicketLifecycle,
} from '../lib/timelineUtils';
import { CustomSelect } from './CustomSelect';
import { UserAvatar } from './UserAvatar';
import {
  Clock,
  List,
  Filter,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Layers,
  ArrowRight,
  TrendingUp,
  Search,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';

export const TicketLifecycleTimeline: React.FC = () => {
  const { issues, departments, setSelectedIssue, currentUser, activeTab, setActiveTab } = useIssues();

  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [healthFilter, setHealthFilter] = useState<'all' | 'in_progress' | 'resolved' | 'stalled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'duration' | 'cycle_time' | 'recent' | 'priority' | 'id'>('recent');

  // Filter issues by department, priority, health, and search
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
    { value: 'priority', label: 'Highest Priority (P0 first)' },
    { value: 'id', label: 'Ticket ID (Latest)' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-white flex flex-col select-none">
      {/* View Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2 py-0.5 rounded">
              Velocity & Lifecycle
            </span>
            {/* View Switcher: Table View vs Lifecycle Timeline */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded border border-gray-200 text-[11px] font-mono">
              <button
                onClick={() => setActiveTab('table')}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded transition-colors cursor-pointer ${
                  activeTab === 'table'
                    ? 'bg-white text-gray-900 font-bold shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Table View</span>
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded transition-colors cursor-pointer ${
                  activeTab === 'timeline'
                    ? 'bg-white text-gray-900 font-bold shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Lifecycle Timeline</span>
              </button>
            </div>
            <span className="font-mono text-xs text-gray-400 hidden sm:inline">•</span>
            <span className="font-mono text-xs text-gray-500 hidden sm:inline">
              Stage Durations & Bottlenecks
            </span>
          </div>
          <h1 className="text-base font-bold text-gray-900 font-mono tracking-tight flex items-center gap-2">
            <Clock className="w-4 h-4 text-black" />
            <span>Ticket Lifecycle Timeline</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Visualize how long tickets take from assigned to accepted to closed across company departments.
          </p>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="p-2 rounded bg-gray-50 border border-gray-200">
            <span className="text-[10px] text-gray-400 block uppercase">Avg Triage</span>
            <span className="font-bold text-gray-900 text-sm">
              {formatDuration(departmentMetrics.avgTriageTimeMs)}
            </span>
          </div>

          <div className="p-2 rounded bg-gray-50 border border-gray-200">
            <span className="text-[10px] text-gray-400 block uppercase">Avg Work Cycle</span>
            <span className="font-bold text-gray-900 text-sm">
              {formatDuration(departmentMetrics.avgCycleTimeMs)}
            </span>
          </div>

          <div className="p-2 rounded bg-gray-50 border border-gray-200">
            <span className="text-[10px] text-gray-400 block uppercase">Avg Lead Time</span>
            <span className="font-bold text-gray-900 text-sm">
              {formatDuration(departmentMetrics.avgLeadTimeMs)}
            </span>
          </div>

          <div
            onClick={() => setHealthFilter(healthFilter === 'stalled' ? 'all' : 'stalled')}
            className={`p-2 rounded border cursor-pointer transition-colors ${
              departmentMetrics.stalledTickets > 0
                ? healthFilter === 'stalled'
                  ? 'bg-amber-100 border-amber-400 text-amber-900 ring-1 ring-amber-400'
                  : 'bg-amber-50/70 border-amber-200 hover:bg-amber-100 text-amber-900'
                : 'bg-gray-50 border-gray-200 text-gray-600'
            }`}
            title="Click to filter to stalled tickets (> 5 days in same stage)"
          >
            <span className="text-[10px] text-amber-700 block uppercase font-semibold flex items-center gap-1">
              {departmentMetrics.stalledTickets > 0 && <AlertTriangle className="w-3 h-3 text-amber-600" />}
              <span>Stalled ({'>'}5d)</span>
            </span>
            <span className="font-bold text-sm">
              {departmentMetrics.stalledTickets}
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="px-6 py-2.5 border-b border-gray-200 bg-gray-50/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-gray-500 text-[11px] font-medium">Department:</span>
            <CustomSelect
              value={selectedDeptId}
              onChange={(val) => setSelectedDeptId(val)}
              options={deptSelectOptions}
              className="w-44"
              size="xs"
            />
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-gray-500 text-[11px] font-medium">Priority:</span>
            <CustomSelect
              value={priorityFilter}
              onChange={(val) => setPriorityFilter(val)}
              options={priorityOptions}
              className="w-36"
              size="xs"
            />
          </div>

          {/* Health Segmented Buttons */}
          <div className="flex items-center bg-white border border-gray-200 rounded p-0.5 font-mono text-[11px]">
            {(
              [
                { id: 'all', label: 'All Tickets' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'resolved', label: 'Resolved' },
                { id: 'stalled', label: `Stalled (${departmentMetrics.stalledTickets})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setHealthFilter(tab.id)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  healthFilter === tab.id
                    ? 'bg-black text-white font-semibold'
                    : 'text-gray-600 hover:text-black hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Tools: Search & Sort */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-48">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, ID, assignee..."
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-white border border-gray-300 rounded font-sans focus:outline-none focus:border-black"
            />
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-gray-500 text-[11px] font-medium">Sort:</span>
            <CustomSelect
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              options={sortOptions}
              className="w-44"
              size="xs"
            />
          </div>
        </div>
      </div>

      {/* Pipeline Stage Legend */}
      <div className="px-6 py-2 bg-white border-b border-gray-100 flex items-center justify-between text-[11px] font-mono text-gray-500">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-gray-400 uppercase text-[10px] font-bold">Standard Flow:</span>
          {Object.entries(STATUS_META).map(([statusKey, meta], idx) => (
            <div key={statusKey} className="flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-full ${meta.barColor}`} />
              <span className="font-medium text-gray-700">{meta.label}</span>
              {idx < Object.keys(STATUS_META).length - 1 && (
                <ArrowRight className="w-2.5 h-2.5 text-gray-300 ml-1" />
              )}
            </div>
          ))}
        </div>

        <span className="text-gray-400">
          Showing {ticketLifecycles.length} of {issues.length} tickets
        </span>
      </div>

      {/* Main Timeline Ticket List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {ticketLifecycles.length > 0 ? (
          ticketLifecycles.map((ticket) => {
            const rawIssue = issues.find((i) => i.id === ticket.issueId);
            const dept = departments.find((d) => d.id === ticket.departmentId);
            const totalMs = Math.max(1, ticket.totalDurationMs);

            return (
              <div
                key={ticket.issueId}
                onClick={() => rawIssue && setSelectedIssue(rawIssue)}
                className="px-6 py-3.5 hover:bg-gray-50/80 transition-colors cursor-pointer group"
              >
                {/* Top Row: ID, Priority, Title, Assignee, Department, Status */}
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="font-mono font-bold text-xs text-gray-700 group-hover:text-black">
                      #{ticket.code.split('-')[1] || ticket.code}
                    </span>

                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        ticket.priority === 'P0'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : ticket.priority === 'P1'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : ticket.priority === 'P2'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      {ticket.priority}
                    </span>

                    <span className="font-medium text-xs text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {ticket.title}
                    </span>

                    {dept && (
                      <span className="font-mono text-[10px] bg-gray-100 border border-gray-200 text-gray-700 px-1.5 py-0.2 rounded shrink-0">
                        {dept.name} [{dept.code}]
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
                    {/* Assignee */}
                    {ticket.assignee ? (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <UserAvatar user={ticket.assignee} size="xs" />
                        <span className="text-[11px]">{ticket.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-400 font-mono">Unassigned</span>
                    )}

                    {/* Regressions badge */}
                    {ticket.hasRegressions && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                        title="Ticket regressed or was reopened during its lifecycle"
                      >
                        <RotateCcw className="w-3 h-3 text-rose-500" />
                        <span>Reopened ({ticket.regressionCount})</span>
                      </span>
                    )}

                    {/* Stalled Alert */}
                    {ticket.isStalled && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                        title={`Stalled in ${ticket.currentStatus} for ${formatDuration(ticket.stalledDurationMs)}`}
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>Stalled ({formatDuration(ticket.stalledDurationMs)})</span>
                      </span>
                    )}

                    {/* Total Duration Badge */}
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block">Total Elapsed</span>
                      <span className="font-bold text-gray-900">
                        {formatDuration(ticket.totalDurationMs)}
                      </span>
                    </div>

                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-black transition-colors" />
                  </div>
                </div>

                {/* Bottom Row: Proportional Timeline Progression Bar */}
                <div className="h-6 w-full bg-gray-100 rounded border border-gray-200 flex overflow-hidden p-0.5 gap-0.5">
                  {ticket.segments.map((seg) => {
                    const meta = STATUS_META[seg.status] || STATUS_META.NEW;

                    return (
                      <div
                        key={seg.id}
                        style={{ flexGrow: Math.max(1, Math.round(seg.durationMs / 1000)) }}
                        className={`relative h-full flex items-center justify-between px-2 text-[10px] font-mono font-medium rounded-xs transition-all duration-150 group/seg cursor-default ${
                          meta.barColor
                        } text-white ${
                          seg.isCurrent
                            ? 'ring-1 ring-black/40 ring-inset animate-pulse'
                            : 'opacity-90 hover:opacity-100'
                        }`}
                        title={`${meta.label}: ${formatDuration(seg.durationMs)} ${
                          seg.isCurrent ? '(Active / Ongoing)' : ''
                        }${seg.actor ? ` • by ${seg.actor.name}` : ''}`}
                      >
                        <span className="truncate drop-shadow-xs">{meta.label}</span>
                        <span className="text-[9px] opacity-90 truncate ml-1 drop-shadow-xs">
                          {formatDuration(seg.durationMs)}
                        </span>

                        {/* Tooltip on Segment Hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/seg:flex flex-col bg-gray-900 text-white p-2.5 rounded shadow-xl text-left text-[11px] z-30 pointer-events-none min-w-[180px] whitespace-normal">
                          <div className="flex items-center justify-between gap-2 border-b border-gray-700 pb-1 mb-1">
                            <span className="font-bold text-white uppercase font-mono">{meta.label}</span>
                            {seg.isCurrent && (
                              <span className="text-[9px] bg-emerald-600 text-white px-1 rounded font-mono">
                                Active Stage
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-300 font-mono space-y-0.5">
                            <p>
                              Duration: <span className="text-white font-bold">{formatDuration(seg.durationMs)}</span>
                            </p>
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
              </div>
            );
          })
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-16 text-center space-y-2">
            <Clock className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-700 font-mono">
              No tickets match your timeline filters
            </p>
            <p className="text-xs text-gray-400 font-sans max-w-sm">
              Try switching your department or priority filter, or clear your search query to see lifecycle durations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
