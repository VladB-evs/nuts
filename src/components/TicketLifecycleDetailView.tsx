import React, { useMemo } from 'react';
import { Issue, Status } from '../types';
import { useIssues } from '../context/TicketContext';
import {
  computeTicketLifecycle,
  formatDuration,
  STATUS_META,
  TicketLifecycle,
} from '../lib/timelineUtils';
import { formatDateTime, timeAgo } from '../lib/utils';
import { UserAvatar } from './UserAvatar';
import { UserHoverCard } from './UserHoverCard';
import {
  ArrowLeft,
  ExternalLink,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Check,
  Calendar,
  ShieldCheck,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface TicketLifecycleDetailViewProps {
  issue: Issue;
  onBack: () => void;
  onOpenTicket: () => void;
}

const LIFECYCLE_STAGES: Status[] = [
  'NEW',
  'ASSIGNED',
  'ACCEPTED',
  'PENDING',
  'COMPLETED',
  'VERIFIED',
  'CLOSED',
];

export const TicketLifecycleDetailView: React.FC<TicketLifecycleDetailViewProps> = ({
  issue,
  onBack,
  onOpenTicket,
}) => {
  const { departments } = useIssues();

  const lifecycle: TicketLifecycle = useMemo(() => {
    return computeTicketLifecycle(issue);
  }, [issue]);

  const currentDept = departments.find((d) => d.id === issue.departmentId);

  // Status order index helper
  const currentStatusMeta = STATUS_META[lifecycle.currentStatus] || STATUS_META.NEW;
  const currentStageOrder = currentStatusMeta.order;

  return (
    <div className="flex-1 overflow-hidden bg-white flex flex-col h-full min-h-0 select-none">
      {/* 1. Header Toolbar */}
      <div className="px-3.5 sm:px-6 py-2.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between text-xs shrink-0 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-gray-700 hover:text-black font-medium py-1 px-2 rounded hover:bg-gray-200/80 transition-colors shrink-0 cursor-pointer"
            title="Return to Lifecycle overview"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Back to Lifecycle</span>
            <span className="sm:hidden">Back</span>
          </button>
          <span className="text-gray-300 shrink-0">/</span>
          <span className="font-mono font-bold text-gray-900 shrink-0">
            #{issue.number}
          </span>
          <span className="font-mono text-gray-400 truncate max-w-[100px] sm:max-w-none">
            ({issue.code})
          </span>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <span className="text-gray-500 font-mono text-[11px] hidden sm:inline truncate">
            Timeline Analysis
          </span>
        </div>

        {/* Primary Action: Link to actual ticket */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenTicket}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-gray-800 text-white rounded text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            title="Open ticket details, comments, and properties"
          >
            <span>Open Ticket</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Scrollable Body Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gray-50/40">
        {/* Ticket Overview Banner */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-xs bg-gray-100 border border-gray-200 text-gray-800 px-2 py-0.5 rounded">
                  {currentDept?.name || issue.departmentId} ({issue.code})
                </span>
                <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${lifecycle.sla.badgeClass}`}>
                  {lifecycle.sla.priority} — {lifecycle.sla.label}
                </span>
                <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${currentStatusMeta.bgClass} ${currentStatusMeta.textClass} ${currentStatusMeta.borderClass}`}>
                  {currentStatusMeta.label}
                </span>

                {lifecycle.isResolved ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Resolved
                  </span>
                ) : lifecycle.isSlaPaused ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                    <Clock className="w-3 h-3" /> SLA Paused (Pending)
                  </span>
                ) : lifecycle.isStalled ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                    <AlertTriangle className="w-3 h-3" /> SLA Stalled ({lifecycle.slaUsagePercent}%)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    <Clock className="w-3 h-3" /> In Progress ({lifecycle.slaUsagePercent}%)
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-snug break-words">
                {issue.title}
              </h2>
            </div>

            {/* Quick Open Button on Right */}
            <div className="shrink-0 flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={onOpenTicket}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Edit or Comment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Metadata Footprint */}
          <div className="pt-2 border-t border-gray-100 flex items-center gap-3 sm:gap-6 text-xs text-gray-500 font-mono flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Reporter:</span>
              <UserHoverCard user={issue.reporter}>
                <div className="inline-flex items-center gap-1 font-sans text-gray-800 hover:text-black cursor-pointer font-medium">
                  <UserAvatar user={issue.reporter} size="xs" />
                  <span>{issue.reporter.name}</span>
                </div>
              </UserHoverCard>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Assignee:</span>
              {issue.assignee ? (
                <UserHoverCard user={issue.assignee}>
                  <div className="inline-flex items-center gap-1 font-sans text-gray-800 hover:text-black cursor-pointer font-medium">
                    <UserAvatar user={issue.assignee} size="xs" />
                    <span>{issue.assignee.name}</span>
                  </div>
                </UserHoverCard>
              ) : (
                <span className="text-gray-400 italic">Unassigned</span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>Created {formatDateTime(issue.createdAt)}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>Updated {timeAgo(issue.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Warning Banners if Stalled or Regressed */}
        {lifecycle.isStalled && (
          <div className="p-3.5 sm:p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold text-rose-900 font-mono uppercase tracking-wide">
                SLA Breached • Ticket Stalled
              </p>
              <p className="text-rose-800 font-sans leading-relaxed">
                {lifecycle.stalledReason}. This exceeds the allowable Service Level Agreement for <strong>{lifecycle.sla.priority} ({lifecycle.sla.stageMaxFormatted} max per stage)</strong>.
              </p>
            </div>
          </div>
        )}

        {lifecycle.hasRegressions && (
          <div className="p-3.5 sm:p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 shadow-2xs">
            <RotateCcw className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold text-amber-900 font-mono uppercase tracking-wide">
                Regression & Rework Detected
              </p>
              <p className="text-amber-800 font-sans leading-relaxed">
                This ticket moved backwards in the lifecycle <strong>{lifecycle.regressionCount} time(s)</strong> (e.g. from Completed/Verified back to Assigned or Accepted), indicating rework, test failure, or reopened scope.
              </p>
            </div>
          </div>
        )}

        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Current Stage Duration */}
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 sm:p-4 space-y-1 shadow-2xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold block">
              Current Stage Elapsed
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold font-mono text-gray-900">
                {formatDuration(lifecycle.stalledDurationMs)}
              </span>
              <span className="text-[10px] font-mono text-gray-500">
                in {currentStatusMeta.label}
              </span>
            </div>
            {/* SLA Progress Bar */}
            <div className="pt-2 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                <span>Stage SLA</span>
                <span>{lifecycle.isSlaPaused ? 'paused' : `${lifecycle.slaUsagePercent}%`}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    lifecycle.slaUsagePercent >= 100
                      ? 'bg-rose-500'
                      : lifecycle.slaUsagePercent >= 75
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, lifecycle.slaUsagePercent)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Lead Time */}
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 sm:p-4 space-y-1 shadow-2xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold block">
              Total Lead Time
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold font-mono text-gray-900">
                {formatDuration(lifecycle.leadTimeMs)}
              </span>
            </div>
            <p className="text-[10px] font-mono text-gray-500 pt-2">
              Target: {lifecycle.sla.resolutionMaxFormatted} resolution max
            </p>
          </div>

          {/* Cycle Time */}
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 sm:p-4 space-y-1 shadow-2xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold block">
              Active Cycle Time
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold font-mono text-gray-900">
                {formatDuration(lifecycle.cycleTimeMs)}
              </span>
            </div>
            <p className="text-[10px] font-mono text-gray-500 pt-2">
              Work time (Accepted & Completed)
            </p>
          </div>

          {/* Triage Time */}
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 sm:p-4 space-y-1 shadow-2xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold block">
              Triage Duration
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold font-mono text-gray-900">
                {formatDuration(lifecycle.triageDurationMs)}
              </span>
            </div>
            <p className="text-[10px] font-mono text-gray-500 pt-2">
              Time in NEW before assignment
            </p>
          </div>
        </div>

        {/* 3. Stage Pipeline Progression Stepper */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider font-bold text-gray-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-gray-500" />
              <span>Lifecycle Pipeline Progression</span>
            </span>
            <span className="text-[11px] font-mono text-gray-400">
              {LIFECYCLE_STAGES.length} Standard Stages
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
            {LIFECYCLE_STAGES.map((stg) => {
              const meta = STATUS_META[stg];
              const duration = lifecycle.statusDurations[stg] || 0;
              const isPast = meta.order < currentStageOrder || lifecycle.isResolved;
              const isCurrent = lifecycle.currentStatus === stg && !lifecycle.isResolved;
              const isPending = meta.order > currentStageOrder && !lifecycle.isResolved;

              return (
                <div
                  key={stg}
                  className={`p-3 rounded-lg border transition-all text-xs space-y-1.5 ${
                    isCurrent
                      ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300 shadow-2xs'
                      : isPast && duration > 0
                      ? 'bg-gray-50/80 border-gray-200'
                      : isPending
                      ? 'bg-gray-50/30 border-gray-100 opacity-60'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-gray-500">
                      Step {meta.order}
                    </span>
                    {isCurrent ? (
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" title="Active Stage" />
                    ) : isPast && duration > 0 ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                    ) : null}
                  </div>

                  <div className="font-bold text-gray-900 text-xs">
                    {meta.label}
                  </div>

                  <div className="font-mono text-[11px] text-gray-600">
                    {duration > 0 ? formatDuration(duration) : isPending ? 'Pending' : '0m'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Chronological Step-by-Step Transition Log */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <span className="text-xs font-mono uppercase tracking-wider font-bold text-gray-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span>Chronological Stage Timeline ({lifecycle.segments.length} segments)</span>
            </span>
            <span className="text-[11px] font-mono text-gray-400">
              Initial creation to present
            </span>
          </div>

          <div className="relative pl-6 sm:pl-8 space-y-5 before:absolute before:left-2 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
            {lifecycle.segments.map((seg, idx) => {
              const meta = STATUS_META[seg.status] || STATUS_META.NEW;

              return (
                <div key={seg.id} className="relative text-xs space-y-1.5 group">
                  {/* Timeline node icon */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white shadow-xs flex items-center justify-center ${
                      seg.isCurrent
                        ? 'bg-blue-600 ring-2 ring-blue-200'
                        : 'bg-gray-400'
                    }`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>

                  {/* Header row */}
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                      >
                        {meta.label}
                      </span>

                      {seg.isCurrent ? (
                        <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded animate-pulse">
                          Active Stage (Ongoing)
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.2 rounded">
                          Segment #{idx + 1}
                        </span>
                      )}

                      {seg.isRegression && (
                        <span className="font-mono text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                          Regression
                        </span>
                      )}
                    </div>

                    <span className="font-mono font-bold text-gray-800 text-[11px] bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                      Duration: {formatDuration(seg.durationMs)}
                    </span>
                  </div>

                  {/* Details card */}
                  <div className="p-3 bg-gray-50/70 border border-gray-200 rounded-lg space-y-1 font-mono text-[11px] text-gray-600">
                    <div className="flex items-center justify-between flex-wrap gap-1 text-gray-500">
                      <span>Started: {formatDateTime(seg.startTime)}</span>
                      <span>
                        {seg.endTime ? `Ended: ${formatDateTime(seg.endTime)}` : 'Ongoing (Present)'}
                      </span>
                    </div>

                    {seg.actor && (
                      <div className="pt-1 flex items-center gap-1.5 text-gray-700">
                        <span className="text-gray-400">Transitioned by:</span>
                        <UserHoverCard user={seg.actor}>
                          <div className="inline-flex items-center gap-1 font-sans text-gray-900 font-medium hover:underline cursor-pointer">
                            <UserAvatar user={seg.actor} size="xs" />
                            <span>{seg.actor.name}</span>
                          </div>
                        </UserHoverCard>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Cumulative Status Distribution Bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider font-bold text-gray-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
              <span>Cumulative Time Allocation</span>
            </span>
            <span className="text-[11px] font-mono text-gray-400">
              Total {formatDuration(lifecycle.totalDurationMs)}
            </span>
          </div>

          {/* Stacked bar */}
          <div className="w-full bg-gray-100 rounded-lg h-3 overflow-hidden flex">
            {LIFECYCLE_STAGES.map((stg) => {
              const dur = lifecycle.statusDurations[stg] || 0;
              if (dur <= 0 || lifecycle.totalDurationMs <= 0) return null;
              const pct = (dur / lifecycle.totalDurationMs) * 100;
              const meta = STATUS_META[stg];

              return (
                <div
                  key={stg}
                  style={{ width: `${pct}%` }}
                  className={`h-full ${meta.barColor} transition-all`}
                  title={`${meta.label}: ${formatDuration(dur)} (${Math.round(pct)}%)`}
                />
              );
            })}
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">
            {LIFECYCLE_STAGES.map((stg) => {
              const meta = STATUS_META[stg];
              const dur = lifecycle.statusDurations[stg] || 0;
              const pct =
                lifecycle.totalDurationMs > 0
                  ? Math.round((dur / lifecycle.totalDurationMs) * 100)
                  : 0;

              return (
                <div key={stg} className="flex items-center gap-2 text-[11px] font-mono">
                  <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${meta.barColor}`} />
                  <span className="text-gray-500 truncate">{meta.label}:</span>
                  <span className="font-bold text-gray-800">{formatDuration(dur)}</span>
                  <span className="text-gray-400 text-[10px]">({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. Action Callout Footer */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="space-y-1">
            <h4 className="font-bold text-sm">Need to update ticket details or take action?</h4>
            <p className="text-xs text-gray-300 font-sans">
              Jump directly to ticket #{issue.number} to change priority, reassign, add comments, or update custom fields.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenTicket}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white text-gray-900 hover:bg-gray-100 rounded-lg text-xs font-semibold transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            <span>Open Ticket #{issue.number}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
