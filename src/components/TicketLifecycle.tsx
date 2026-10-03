import React, { useState, useMemo } from 'react';
import { Issue } from '../types';
import {
  getTicketLifecycle,
  TicketLifecycleSummary,
  formatDuration,
} from '../lib/lifecycle';
import { formatDateTime, timeAgo } from '../lib/utils';
import { UserAvatar } from './UserAvatar';
import {
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
  Sparkles,
  Check,
} from 'lucide-react';

interface TicketLifecycleProps {
  issue: Issue;
  className?: string;
}

export const TicketLifecycle: React.FC<TicketLifecycleProps> = ({
  issue,
  className = '',
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const lifecycle: TicketLifecycleSummary = useMemo(() => {
    return getTicketLifecycle(issue);
  }, [issue]);

  // Color mapping for cumulative status progress bar
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'bg-blue-400';
      case 'ASSIGNED':
        return 'bg-indigo-400';
      case 'ACCEPTED':
        return 'bg-amber-400';
      case 'FIXED':
        return 'bg-emerald-500';
      case 'VERIFIED':
        return 'bg-teal-500';
      case 'CLOSED':
        return 'bg-gray-400';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ASSIGNED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'ACCEPTED':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'FIXED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'VERIFIED':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white shadow-2xs overflow-hidden select-none text-xs font-sans ${className}`}
    >
      {/* Header bar */}
      <div className="px-4 py-3 bg-gray-50/70 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-600" />
          <span className="font-mono text-xs font-bold text-gray-900 uppercase tracking-wider">
            Ticket Lifecycle & Duration
          </span>
          {lifecycle.isTerminal ? (
            <span className="font-mono text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-300 px-1.5 py-0.5 rounded">
              Resolved & Closed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live In Progress
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          className="inline-flex items-center gap-1 text-[11px] font-mono text-gray-600 hover:text-black hover:underline cursor-pointer"
        >
          <span>{showDetails ? 'Hide Transition Log' : 'View Transition Log'}</span>
          {showDetails ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Stalled SLA Warning if applicable */}
      {lifecycle.isStalled && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          <span className="font-medium">{lifecycle.stalledReason}</span>
        </div>
      )}

      {/* Key Metrics Cards Row */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-gray-100 bg-white">
        {/* Metric 1: Total Lead Time */}
        <div className="p-2.5 rounded bg-gray-50 border border-gray-200">
          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-0.5">
            Total Lead Time
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-gray-900">
              {lifecycle.leadTimeFormatted}
            </span>
          </div>
          <span className="text-[10px] text-gray-500 font-mono">
            {lifecycle.isTerminal ? 'Created → Closed' : 'Created → Active'}
          </span>
        </div>

        {/* Metric 2: Active Cycle Time */}
        <div className="p-2.5 rounded bg-gray-50 border border-gray-200">
          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-0.5">
            Active Cycle Time
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-gray-900">
              {lifecycle.cycleTimeFormatted}
            </span>
          </div>
          <span className="text-[10px] text-gray-500 font-mono">
            Work started → Fixed
          </span>
        </div>

        {/* Metric 3: Time in Current State */}
        <div className="p-2.5 rounded bg-gray-50 border border-gray-200">
          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-0.5">
            In Current State ({issue.status})
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-gray-900">
              {lifecycle.currentStageFormatted}
            </span>
            {!lifecycle.isTerminal && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            )}
          </div>
          <span className="text-[10px] text-gray-500 font-mono">
            {lifecycle.isTerminal ? 'Final state' : 'Active elapsed'}
          </span>
        </div>

        {/* Metric 4: Reopens / Regressions */}
        <div className="p-2.5 rounded bg-gray-50 border border-gray-200">
          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-0.5">
            Reopen Count
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-base font-bold font-mono ${
                lifecycle.reopenCount > 0 ? 'text-amber-700' : 'text-gray-900'
              }`}
            >
              {lifecycle.reopenCount}
            </span>
            {lifecycle.reopenCount > 0 && (
              <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            )}
          </div>
          <span className="text-[10px] text-gray-500 font-mono">
            {lifecycle.reopenCount === 0
              ? 'Smooth progression'
              : `${lifecycle.reopenCount} regressions logged`}
          </span>
        </div>
      </div>

      {/* Stepper: Standard Workflow Stage Progression */}
      <div className="p-4 bg-gray-50/40 border-b border-gray-100">
        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold block mb-2.5">
          Workflow Stage Progression
        </span>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          {lifecycle.standardStages.map((stage, idx) => {
            const isLast = idx === lifecycle.standardStages.length - 1;

            return (
              <React.Fragment key={stage.status}>
                <div
                  className={`flex-1 min-w-[95px] p-2 rounded border flex flex-col justify-between transition-all ${
                    stage.isCurrent
                      ? 'bg-white border-black ring-1 ring-black shadow-2xs font-semibold'
                      : stage.visited
                      ? 'bg-white border-gray-300 text-gray-900'
                      : stage.isSkipped
                      ? 'bg-gray-100/70 border-dashed border-gray-300 text-gray-400 opacity-60'
                      : 'bg-gray-50 border-gray-200 text-gray-400 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono text-[10px] font-bold">
                      {stage.label}
                    </span>
                    {stage.isCurrent ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    ) : stage.visited ? (
                      <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                    ) : null}
                  </div>

                  <div className="text-[10px] font-mono">
                    {stage.isCurrent ? (
                      <span className="text-emerald-700 font-semibold">
                        {stage.durationFormatted || '< 1m'} (Live)
                      </span>
                    ) : stage.visited && stage.durationFormatted ? (
                      <span className="text-gray-600 font-medium">
                        {stage.durationFormatted}
                      </span>
                    ) : stage.isSkipped ? (
                      <span className="text-gray-400 italic">Bypassed</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                </div>

                {!isLast && (
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Cumulative Time Distribution Bar */}
      {lifecycle.cumulativeTimes.length > 0 && (
        <div className="px-4 py-3 bg-white border-b border-gray-100 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-gray-500">
            <span>State Time Breakdown</span>
            <span>100% = {lifecycle.leadTimeFormatted}</span>
          </div>

          {/* Distribution multi-segment bar */}
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
            {lifecycle.cumulativeTimes.map((item) => (
              <div
                key={item.status}
                style={{ width: `${Math.max(item.percentage, 3)}%` }}
                className={`h-full ${getStatusColor(item.status)} transition-all`}
                title={`${item.status}: ${item.formatted} (${item.percentage}%)`}
              />
            ))}
          </div>

          {/* Legend items */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] font-mono">
            {lifecycle.cumulativeTimes.map((item) => (
              <div key={item.status} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`} />
                <span className="font-semibold text-gray-700">{item.status}:</span>
                <span className="text-gray-500 font-medium">{item.formatted}</span>
                <span className="text-gray-400 text-[10px]">({item.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expandable Transition Log Table (Every hop & change) */}
      {showDetails && (
        <div className="p-4 bg-gray-50/70 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-1 border-b border-gray-200">
            <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-gray-500" />
              <span>Full Transition History ({lifecycle.segments.length} steps)</span>
            </span>
            <span className="text-[10px] text-gray-400 font-mono">
              Chronological log
            </span>
          </div>

          <div className="space-y-1.5">
            {lifecycle.segments.map((seg, idx) => (
              <div
                key={seg.id}
                className={`p-2.5 rounded border text-xs flex flex-wrap items-center justify-between gap-2 ${
                  seg.isActive
                    ? 'bg-white border-black ring-1 ring-black shadow-2xs'
                    : seg.isRegression
                    ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                    : 'bg-white border-gray-200 text-gray-800'
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="font-mono text-[10px] text-gray-400 font-bold">
                    #{idx + 1}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded border ${getStatusBadgeClass(
                      seg.status
                    )}`}
                  >
                    {seg.status}
                  </span>

                  {seg.isRegression && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded">
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Reopened</span>
                    </span>
                  )}

                  {seg.isActive && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Active Now</span>
                    </span>
                  )}

                  <span className="text-gray-400">•</span>
                  <span className="text-[11px] text-gray-500 font-mono">
                    {formatDateTime(seg.enteredAt)}
                  </span>
                  {seg.exitedAt && (
                    <>
                      <span className="text-gray-400">→</span>
                      <span className="text-[11px] text-gray-500 font-mono">
                        {formatDateTime(seg.exitedAt)}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 font-mono">
                  {seg.actor && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-600">
                      <UserAvatar user={seg.actor} size="xs" />
                      <span className="truncate font-sans max-w-[120px]">
                        {seg.actor.name}
                      </span>
                    </div>
                  )}

                  <span className="font-bold text-gray-900 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-[11px]">
                    {seg.durationFormatted}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
