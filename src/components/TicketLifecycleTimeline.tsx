import React, { useState, useMemo } from 'react';
import { useIssues } from '../context/TicketContext';
import { Priority } from '../types';
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
import { TicketLifecycleDetailView } from './TicketLifecycleDetailView';
import {
  Clock,
  Search,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  X,
  ChevronRight,
} from 'lucide-react';

export const TicketLifecycleTimeline: React.FC = () => {
  const { issues, departments, setSelectedIssue } = useIssues();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [healthFilter, setHealthFilter] = useState<'all' | 'in_progress' | 'resolved' | 'stalled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'duration' | 'cycle_time' | 'priority' | 'id'>('recent');
  const [isSlaModalOpen, setIsSlaModalOpen] = useState(false);

  // Filter issues
  const filteredIssues = useMemo(() => {
    return issues.filter((iss) => {
      if (selectedDeptId !== 'all' && iss.departmentId !== selectedDeptId) {
        return false;
      }
      if (priorityFilter !== 'ALL' && iss.priority !== priorityFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = String(iss.code || '').toLowerCase().includes(q);
        const matchesNum = String(iss.number ?? '').includes(q);
        const matchesTitle = String(iss.title || '').toLowerCase().includes(q);
        const matchesAssignee = iss.assignee?.name ? iss.assignee.name.toLowerCase().includes(q) : false;
        if (!matchesCode && !matchesNum && !matchesTitle && !matchesAssignee) {
          return false;
        }
      }
      return true;
    });
  }, [issues, selectedDeptId, priorityFilter, searchQuery]);

  // Compute lifecycles
  const ticketLifecycles: TicketLifecycle[] = useMemo(() => {
    const list = filteredIssues.map((iss) => computeTicketLifecycle(iss));

    const afterHealth = list.filter((l) => {
      if (healthFilter === 'in_progress') return !l.isResolved;
      if (healthFilter === 'resolved') return l.isResolved;
      if (healthFilter === 'stalled') return l.isStalled;
      return true;
    });

    return afterHealth.sort((a, b) => {
      if (sortBy === 'duration') return b.totalDurationMs - a.totalDurationMs;
      if (sortBy === 'cycle_time') return b.cycleTimeMs - a.cycleTimeMs;
      if (sortBy === 'priority') {
        const pOrder: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
        return pOrder[a.priority] - pOrder[b.priority];
      }
      if (sortBy === 'id') {
        const aNum = parseInt(String(a.code || '').split('-')[1] || '0', 10);
        const bNum = parseInt(String(b.code || '').split('-')[1] || '0', 10);
        return bNum - aNum;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [filteredIssues, healthFilter, sortBy]);

  // Department metrics
  const departmentMetrics = useMemo(() => {
    return computeDepartmentLifecycleMetrics(filteredIssues);
  }, [filteredIssues]);

  const priorityOptions = [
    { value: 'ALL', label: 'All Priorities' },
    { value: 'P0', label: 'P0 — Blocker', badge: 'P0', badgeClass: 'bg-red-50 text-red-700 border-red-200' },
    { value: 'P1', label: 'P1 — Critical', badge: 'P1', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
    { value: 'P2', label: 'P2 — Major', badge: 'P2', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'P3', label: 'P3 — Minor', badge: 'P3', badgeClass: 'bg-gray-50 text-gray-700 border-gray-200' },
  ];

  const sortOptions = [
    { value: 'recent', label: 'Recently Active' },
    { value: 'duration', label: 'Longest Elapsed' },
    { value: 'cycle_time', label: 'Longest Work Cycle' },
    { value: 'priority', label: 'Highest Priority' },
    { value: 'id', label: 'Ticket ID' },
  ];

  const selectedTimelineIssue = useMemo(() => {
    if (!selectedTicketId) return null;
    return issues.find((i) => i.id === selectedTicketId) || null;
  }, [selectedTicketId, issues]);

  if (selectedTimelineIssue) {
    return (
      <TicketLifecycleDetailView
        issue={selectedTimelineIssue}
        onBack={() => setSelectedTicketId(null)}
        onOpenTicket={() => {
          setSelectedIssue(selectedTimelineIssue);
        }}
      />
    );
  }

  return (
    <div className="flex-1 overflow-hidden bg-white flex flex-col select-none">
      {/* 1. Header with Inline Stats & Policy Button (Mobile & Web Optimized) */}
      <div className="px-4 sm:px-6 py-2.5 border-b border-gray-200 bg-white flex items-center justify-between gap-3 shrink-0 flex-wrap">
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-800 shrink-0" />
            <h1 className="text-sm font-bold text-gray-900 font-mono tracking-tight whitespace-nowrap">
              Lifecycle
            </h1>
            <span className="text-[11px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.2 rounded font-medium">
              {ticketLifecycles.length}
            </span>
          </div>

          <div className="h-3 w-px bg-gray-200 hidden md:block" />

          {/* Desktop Inline KPI stats */}
          <div className="hidden md:flex items-center gap-3.5 text-[11px] font-mono text-gray-500">
            <span>Cycle: <strong className="text-gray-900">{formatDuration(departmentMetrics.avgCycleTimeMs)}</strong></span>
            <span>Lead: <strong className="text-gray-900">{formatDuration(departmentMetrics.avgLeadTimeMs)}</strong></span>
            <span>Triage: <strong className="text-gray-900">{formatDuration(departmentMetrics.avgTriageTimeMs)}</strong></span>

            {departmentMetrics.stalledTickets > 0 ? (
              <button
                type="button"
                onClick={() => setHealthFilter(healthFilter === 'stalled' ? 'all' : 'stalled')}
                className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded font-semibold cursor-pointer transition-colors ${
                  healthFilter === 'stalled'
                    ? 'bg-amber-200 text-amber-950 ring-1 ring-amber-400'
                    : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                }`}
                title="Click to filter to stalled tickets"
              >
                <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                <span>{departmentMetrics.stalledTickets} Stalled</span>
              </button>
            ) : (
              <span className="text-emerald-700 font-medium">✓ All on track</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsSlaModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-mono transition-colors cursor-pointer shrink-0"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
          <span>SLA Policy</span>
        </button>
      </div>

      {/* Mobile-only KPI Quick Strip */}
      <div className="md:hidden px-4 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-[10px] font-mono text-gray-500 overflow-x-auto whitespace-nowrap gap-3">
        <span>Cycle: <strong className="text-gray-900">{formatDuration(departmentMetrics.avgCycleTimeMs)}</strong></span>
        <span>Lead: <strong className="text-gray-900">{formatDuration(departmentMetrics.avgLeadTimeMs)}</strong></span>
        <span>Triage: <strong className="text-gray-900">{formatDuration(departmentMetrics.avgTriageTimeMs)}</strong></span>
        {departmentMetrics.stalledTickets > 0 ? (
          <button
            type="button"
            onClick={() => setHealthFilter(healthFilter === 'stalled' ? 'all' : 'stalled')}
            className="text-amber-800 font-bold bg-amber-100 px-1 rounded flex items-center gap-0.5"
          >
            <AlertTriangle className="w-2.5 h-2.5" />
            {departmentMetrics.stalledTickets} Stalled
          </button>
        ) : (
          <span className="text-emerald-700 font-medium">✓ All on track</span>
        )}
      </div>

      {/* 2. Responsive Toolbar */}
      <div className="px-4 sm:px-6 py-2 border-b border-gray-200 bg-gray-50/60 flex items-center justify-between gap-2.5 text-xs shrink-0 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-0.5 sm:pb-0 [scrollbar-width:none]">
          {/* Department Tabs */}
          <div className="flex items-center bg-gray-200/70 p-0.5 rounded font-mono text-[11px] shrink-0">
            <button
              type="button"
              onClick={() => setSelectedDeptId('all')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                selectedDeptId === 'all'
                  ? 'bg-white text-gray-900 font-bold shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
            {departments.map((dept) => (
              <button
                key={dept.id}
                type="button"
                onClick={() => setSelectedDeptId(dept.id)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  selectedDeptId === dept.id
                    ? 'bg-white text-gray-900 font-bold shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {dept.code}
              </button>
            ))}
          </div>

          {/* Health Segmented Tabs */}
          <div className="flex items-center bg-gray-200/70 p-0.5 rounded font-mono text-[11px] shrink-0">
            {[
              { id: 'all', label: 'All' },
              { id: 'in_progress', label: 'Active' },
              { id: 'stalled', label: `Stalled${departmentMetrics.stalledTickets > 0 ? ` (${departmentMetrics.stalledTickets})` : ''}` },
              { id: 'resolved', label: 'Resolved' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setHealthFilter(tab.id as any)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
                  healthFilter === tab.id
                    ? 'bg-white text-gray-900 font-bold shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Tools: Search, Priority, Sort */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end pt-1 sm:pt-0">
          <div className="relative flex-1 sm:w-36 md:w-44">
            <Search className="w-3 h-3 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-6 pr-5 py-0.5 text-xs bg-white border border-gray-300 rounded font-sans focus:outline-none focus:border-black"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <CustomSelect
            value={priorityFilter}
            onChange={(val) => setPriorityFilter(val)}
            options={priorityOptions}
            className="w-24 sm:w-28"
            size="xs"
          />

          <CustomSelect
            value={sortBy}
            onChange={(val) => setSortBy(val as any)}
            options={sortOptions}
            className="w-32 sm:w-36"
            size="xs"
          />
        </div>
      </div>

      {/* 3. Ticket List: Responsive for Web Table & Mobile Cards */}
      <div className="flex-1 overflow-auto">
        {ticketLifecycles.length > 0 ? (
          <>
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block min-w-[850px]">
              <div className="grid grid-cols-[80px_1fr_90px_280px_75px_110px_100px] items-center gap-3 px-6 py-2 bg-gray-50 border-b border-gray-200 text-[10px] font-mono font-semibold text-gray-400 uppercase tracking-wider sticky top-0 z-10">
                <div>Ticket</div>
                <div>Title</div>
                <div>Stage</div>
                <div>Timeline</div>
                <div className="text-right">Elapsed</div>
                <div>SLA Status</div>
                <div>Assignee</div>
              </div>

              <div className="divide-y divide-gray-100">
                {ticketLifecycles.map((ticket) => {
                  const rawIssue = issues.find((i) => i.id === ticket.issueId);
                  const activeMeta = STATUS_META[ticket.currentStatus] || STATUS_META.NEW;

                  return (
                    <div
                      key={ticket.issueId}
                      onClick={() => setSelectedTicketId(ticket.issueId)}
                      className="grid grid-cols-[80px_1fr_90px_280px_75px_110px_100px] items-center gap-3 px-6 py-2.5 hover:bg-blue-50/40 transition-colors cursor-pointer group text-xs font-mono"
                      title={`View timeline analysis for ${ticket.code}`}
                    >
                      {/* Ticket Code */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                          {ticket.code}
                        </span>
                        {ticket.hasRegressions && (
                          <span title={`Reopened ${ticket.regressionCount} time(s)`}>
                            <RotateCcw className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                          </span>
                        )}
                      </div>

                      {/* Title & Priority tag */}
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span
                          className={`text-[9px] font-bold px-1 py-0.2 rounded border shrink-0 whitespace-nowrap ${ticket.sla.badgeClass}`}
                          title={`${ticket.priority}: ${ticket.sla.stageMaxFormatted} max per stage`}
                        >
                          {ticket.priority}
                        </span>
                        <span className="text-gray-800 font-sans truncate font-medium group-hover:text-gray-900">
                          {ticket.title}
                        </span>
                      </div>

                      {/* Current Stage */}
                      <div className="min-w-0">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium whitespace-nowrap ${activeMeta.bgClass} ${activeMeta.textClass} ${activeMeta.borderClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${activeMeta.barColor}`} />
                          <span className="truncate">{activeMeta.label}</span>
                        </span>
                      </div>

                      {/* Timeline Progression Bar */}
                      <div className="h-2 w-full bg-gray-100 rounded-xs border border-gray-200 flex overflow-hidden gap-0.5 p-0.2">
                        {ticket.segments.map((seg) => {
                          const meta = STATUS_META[seg.status] || STATUS_META.NEW;

                          return (
                            <div
                              key={seg.id}
                              style={{ flexGrow: Math.max(1, Math.round(seg.durationMs / 1000)) }}
                              className={`relative h-full rounded-xs transition-opacity duration-150 group/seg ${
                                meta.barColor
                              } ${
                                seg.isCurrent
                                  ? 'ring-1 ring-black/40 ring-inset'
                                  : 'opacity-80 hover:opacity-100'
                              }`}
                            >
                              {/* Hover Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/seg:flex flex-col bg-gray-900 text-white p-2.5 rounded shadow-xl text-left text-[11px] z-30 pointer-events-none min-w-[210px] whitespace-normal font-mono">
                                <div className="flex items-center justify-between gap-2 border-b border-gray-700 pb-1 mb-1">
                                  <span className="font-bold text-white uppercase">{meta.label}</span>
                                  {seg.isCurrent && (
                                    <span className="text-[9px] bg-emerald-600 text-white px-1 rounded font-medium">
                                      Active Stage
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-300 space-y-0.5">
                                  <p>Duration: <span className="text-white font-bold">{formatDuration(seg.durationMs)}</span></p>
                                  {seg.isCurrent && (
                                    <p>Priority SLA: <span className={ticket.isStalled ? 'text-amber-400 font-bold' : 'text-emerald-400 font-semibold'}>
                                      {ticket.sla.stageMaxFormatted} Max ({ticket.slaUsagePercent}% used)
                                    </span></p>
                                  )}
                                  {seg.isCurrent && ticket.isStalled && (
                                    <p className="text-amber-300 font-semibold">Overdue by: +{formatDuration(ticket.slaOverdueMs)}</p>
                                  )}
                                  {seg.isCurrent && !ticket.isStalled && (
                                    <p className="text-emerald-400">Remaining budget: {formatDuration(ticket.slaRemainingMs)}</p>
                                  )}
                                  {seg.startTime && (
                                    <p className="truncate text-gray-400">Started: {new Date(seg.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                  )}
                                  {seg.actor && (
                                    <p className="text-gray-400 truncate">Actor: <span className="text-white font-medium">{seg.actor.name}</span></p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Total Elapsed */}
                      <div className="text-right font-bold text-gray-900 truncate">
                        {formatDuration(ticket.totalDurationMs)}
                      </div>

                      {/* SLA Status */}
                      <div className="min-w-0">
                        {ticket.isResolved ? (
                          <span className="text-gray-400 text-[10px]">Resolved</span>
                        ) : ticket.isSlaPaused ? (
                          <span className="text-[10px] text-sky-700 font-medium whitespace-nowrap" title={ticket.stalledReason}>
                            Paused
                          </span>
                        ) : ticket.isStalled ? (
                          <span
                            className="inline-flex items-center gap-1 font-bold text-[10px] text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded whitespace-nowrap"
                            title={ticket.stalledReason}
                          >
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                            <span>+{formatDuration(ticket.slaOverdueMs)}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium whitespace-nowrap">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                            <span>{formatDuration(ticket.slaRemainingMs)}</span>
                          </span>
                        )}
                      </div>

                      {/* Assignee */}
                      <div className="min-w-0 flex items-center gap-1.5">
                        {ticket.assignee ? (
                          <>
                            <UserAvatar user={ticket.assignee} size="xs" />
                            <span className="text-gray-600 text-[11px] truncate font-sans">
                              {ticket.assignee.name.split(' ')[0]}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-400 text-[11px] italic">None</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Card View (< 768px) */}
            <div className="md:hidden divide-y divide-gray-100">
              {ticketLifecycles.map((ticket) => {
                const rawIssue = issues.find((i) => i.id === ticket.issueId);
                const activeMeta = STATUS_META[ticket.currentStatus] || STATUS_META.NEW;

                return (
                  <div
                    key={ticket.issueId}
                    onClick={() => setSelectedTicketId(ticket.issueId)}
                    className="p-3.5 hover:bg-gray-50/70 transition-colors cursor-pointer space-y-2 active:bg-gray-100"
                    title={`View timeline analysis for ${ticket.code}`}
                  >
                    {/* Top row: Code, Priority, Stage, Elapsed */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span className="font-mono font-bold text-xs text-gray-900">
                          {ticket.code}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border whitespace-nowrap ${ticket.sla.badgeClass}`}>
                          {ticket.priority}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded border font-medium whitespace-nowrap ${activeMeta.bgClass} ${activeMeta.textClass} ${activeMeta.borderClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${activeMeta.barColor}`} />
                          <span>{activeMeta.label}</span>
                        </span>
                        {ticket.hasRegressions && (
                          <span title={`Reopened ${ticket.regressionCount} time(s)`}>
                            <RotateCcw className="w-2.5 h-2.5 text-rose-500" />
                          </span>
                        )}
                      </div>

                      <span className="font-mono font-bold text-xs text-gray-900 shrink-0">
                        {formatDuration(ticket.totalDurationMs)}
                      </span>
                    </div>

                    {/* Title */}
                    <p className="text-xs text-gray-800 font-sans font-medium line-clamp-2 leading-snug">
                      {ticket.title}
                    </p>

                    {/* Proportional Timeline Bar on Mobile */}
                    <div className="h-2 w-full bg-gray-100 rounded-xs border border-gray-200 flex overflow-hidden gap-0.5 p-0.2">
                      {ticket.segments.map((seg) => {
                        const meta = STATUS_META[seg.status] || STATUS_META.NEW;
                        return (
                          <div
                            key={seg.id}
                            style={{ flexGrow: Math.max(1, Math.round(seg.durationMs / 1000)) }}
                            className={`h-full rounded-xs ${meta.barColor} ${
                              seg.isCurrent ? 'ring-1 ring-black/40 ring-inset' : 'opacity-85'
                            }`}
                          />
                        );
                      })}
                    </div>

                    {/* Footer: Assignee & SLA Status */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-gray-500 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        {ticket.assignee ? (
                          <>
                            <UserAvatar user={ticket.assignee} size="xs" />
                            <span className="text-gray-700 font-sans text-xs">{ticket.assignee.name}</span>
                          </>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {ticket.isResolved ? (
                          <span className="text-gray-400 text-[10px]">Resolved</span>
                        ) : ticket.isSlaPaused ? (
                          <span className="text-[10px] text-sky-700 font-medium whitespace-nowrap">Paused</span>
                        ) : ticket.isStalled ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[10px] text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded whitespace-nowrap">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                            +{formatDuration(ticket.slaOverdueMs)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium whitespace-nowrap">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            {formatDuration(ticket.slaRemainingMs)}
                          </span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="py-16 text-center text-gray-400 space-y-1">
            <Clock className="w-6 h-6 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-gray-600 font-mono">No tickets match filters</p>
            <p className="text-[11px] text-gray-400 font-sans">Try selecting another department or priority.</p>
          </div>
        )}
      </div>

      {/* 4. Priority SLA & Stall Policy Modal (Fully Responsive on Web & Mobile) */}
      {isSlaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-scrim/50 backdrop-blur-xs select-none animate-fade-in">
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-gray-900" />
                <h3 className="font-mono font-bold text-sm sm:text-base text-gray-900">
                  Priority SLA & Stall Policy
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSlaModalOpen(false)}
                className="text-gray-400 hover:text-black p-1.5 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explanatory callout */}
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3.5 text-xs text-sky-950 space-y-1.5">
              <span className="font-bold block font-mono text-sm text-sky-900">What does "Stalled" mean in NUTS?</span>
              <p className="text-xs leading-relaxed text-sky-900 font-sans">
                A ticket is marked as <strong>Stalled (SLA Breached)</strong> when it remains in an active, unresolved stage (<code className="bg-white px-1.5 py-0.5 rounded border border-sky-300 font-mono font-bold text-[11px]">NEW</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-sky-300 font-mono font-bold text-[11px]">ASSIGNED</code>, or <code className="bg-white px-1.5 py-0.5 rounded border border-sky-300 font-mono font-bold text-[11px]">ACCEPTED</code>) longer than the Service Level Agreement (SLA) configured for its Priority.
              </p>
              <p className="text-xs leading-relaxed text-sky-900 font-sans">
                Once a ticket is resolved (<code className="bg-white px-1.5 py-0.5 rounded border border-sky-300 font-mono font-bold text-[11px]">COMPLETED</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-sky-300 font-mono font-bold text-[11px]">VERIFIED</code>, or <code className="bg-white px-1.5 py-0.5 rounded border border-sky-300 font-mono font-bold text-[11px]">CLOSED</code>), stage timers halt.
              </p>
            </div>

            {/* Desktop Table View (>= 640px) */}
            <div className="hidden sm:block border border-gray-200 rounded-lg overflow-x-auto text-xs font-mono">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 text-[10px] text-gray-500 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-4 w-44 whitespace-nowrap">Priority</th>
                    <th className="py-2.5 px-4 w-36 whitespace-nowrap">Stage SLA (Stall Limit)</th>
                    <th className="py-2.5 px-4 w-32 whitespace-nowrap">Resolution SLA</th>
                    <th className="py-2.5 px-4 min-w-[200px]">Scope & Criteria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[11px]">
                  {Object.values(PRIORITY_SLAS).map((sla) => (
                    <tr key={sla.priority} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded border font-bold text-xs whitespace-nowrap ${sla.badgeClass}`}>
                          {sla.priority} — {sla.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900 whitespace-nowrap">
                        {sla.stageMaxFormatted}
                      </td>
                      <td className="py-3 px-4 text-gray-700 whitespace-nowrap">
                        {sla.resolutionMaxFormatted}
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-sans text-xs leading-relaxed">
                        {sla.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< 640px) */}
            <div className="sm:hidden space-y-2.5">
              {Object.values(PRIORITY_SLAS).map((sla) => (
                <div key={sla.priority} className="p-3 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded border font-bold text-xs whitespace-nowrap ${sla.badgeClass}`}>
                      {sla.priority} — {sla.label}
                    </span>
                    <span className="font-mono text-xs font-bold text-gray-900">
                      {sla.stageMaxFormatted} Stage SLA
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-white p-2 rounded border border-gray-100">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase">Stage Limit (Stall)</span>
                      <span className="font-bold text-gray-900">{sla.stageMaxFormatted}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase">Resolution SLA</span>
                      <span className="font-bold text-gray-900">{sla.resolutionMaxFormatted}</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 font-sans leading-relaxed">
                    {sla.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsSlaModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-md font-mono text-xs font-medium transition-colors cursor-pointer text-center"
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
