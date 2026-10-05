import React, { useMemo, useState } from 'react';
import { Issue } from '../types';
import {
  computeTicketLifecycle,
  formatDuration,
  STATUS_META,
  TicketLifecycle,
} from '../lib/timelineUtils';
import { Clock, AlertTriangle, ArrowRight, RotateCcw, CheckCircle2, ChevronDown } from 'lucide-react';

interface TicketLifecycleBarProps {
  issue: Issue;
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export const TicketLifecycleBar: React.FC<TicketLifecycleBarProps> = ({
  issue,
  className = '',
  showDetails = true,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const lifecycle: TicketLifecycle = useMemo(() => {
    return computeTicketLifecycle(issue);
  }, [issue]);

  const { segments, totalDurationMs, leadTimeMs, cycleTimeMs, isStalled, isSlaPaused, isResolved } = lifecycle;

  // Calculate percentage width for each segment, with minimum width for visibility
  const totalMs = Math.max(1, totalDurationMs);

  if (compact) {
    return (
      <div className={`p-2.5 rounded-md border border-gray-200 bg-gray-50/70 text-xs font-mono select-none space-y-1.5 ${className}`}>
        {/* Compact Summary Header */}
        <div className="flex items-center justify-between text-[11px] text-gray-600 flex-wrap gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="font-semibold text-gray-900">
              {STATUS_META[lifecycle.currentStatus]?.label || lifecycle.currentStatus}
            </span>
            <span className="text-gray-500">
              ({formatDuration(lifecycle.stalledDurationMs)})
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-gray-500">
              SLA: <strong className="text-gray-800">{lifecycle.sla.stageMaxFormatted}</strong>
            </span>
            {isStalled ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                <span>SLA Breached (+{formatDuration(lifecycle.slaOverdueMs)})</span>
              </span>
            ) : isSlaPaused ? (
              <span className="text-[10px] text-sky-700 font-medium">(SLA paused while pending)</span>
            ) : !isResolved ? (
              <span className="text-[10px] text-emerald-700 font-medium">
                ({formatDuration(lifecycle.slaRemainingMs)} left)
              </span>
            ) : (
              <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>Resolved</span>
              </span>
            )}
            {lifecycle.hasRegressions && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <RotateCcw className="w-2.5 h-2.5 text-rose-500" />
                <span>Reopened ({lifecycle.regressionCount})</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 text-gray-500">
            <span>Elapsed: <strong className="text-gray-900">{formatDuration(totalDurationMs)}</strong></span>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[10px] text-gray-500 hover:text-black flex items-center gap-0.5 underline cursor-pointer"
            >
              <span>{isExpanded ? 'Less' : 'Details'}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Slim 6px Proportional Multi-Segment Progress Bar */}
        <div className="h-1.5 w-full bg-gray-200 rounded-full flex overflow-hidden gap-0.5">
          {segments.map((seg) => {
            const meta = STATUS_META[seg.status] || STATUS_META.NEW;

            return (
              <div
                key={seg.id}
                style={{ flexGrow: Math.max(1, Math.round(seg.durationMs / 1000)) }}
                className={`h-full ${meta.barColor} group relative cursor-default transition-opacity hover:opacity-80`}
                title={`${meta.label}: ${formatDuration(seg.durationMs)}`}
              >
                {/* Hover Tooltip Card */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col bg-gray-900 text-white p-2 rounded shadow-xl text-left text-[11px] z-30 pointer-events-none min-w-[160px] whitespace-normal">
                  <div className="flex items-center justify-between border-b border-gray-700 pb-1 mb-1">
                    <span className="font-bold text-white uppercase font-mono">{meta.label}</span>
                    {seg.isCurrent && (
                      <span className="text-[9px] bg-emerald-600 text-white px-1 rounded font-mono">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-300 font-mono space-y-0.5">
                    <p>
                      Duration: <span className="text-white font-bold">{formatDuration(seg.durationMs)}</span>
                    </p>
                    {seg.isCurrent && (
                      <p>
                        Stage SLA: <span className={isStalled ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                          {lifecycle.sla.stageMaxFormatted} ({lifecycle.slaUsagePercent}% used)
                        </span>
                      </p>
                    )}
                    {seg.actor && (
                      <p className="text-gray-400 truncate">
                        By: <span className="text-white">{seg.actor.name}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Collapsible Expanded Details */}
        {isExpanded && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-200/80 text-[11px] font-mono">
            <div className="p-1.5 rounded bg-white border border-gray-200">
              <span className="text-[10px] text-gray-400 block uppercase font-medium">Triage Time</span>
              <span className="font-bold text-gray-900 text-xs block">
                {formatDuration(lifecycle.triageDurationMs)}
              </span>
              <span className="text-[9px] text-gray-400 block">Time in NEW</span>
            </div>

            <div className="p-1.5 rounded bg-white border border-gray-200">
              <span className="text-[10px] text-gray-400 block uppercase font-medium">Work Cycle</span>
              <span className="font-bold text-gray-900 text-xs block">
                {formatDuration(cycleTimeMs)}
              </span>
              <span className="text-[9px] text-gray-400 block">Accepted → Resolved</span>
            </div>

            <div className="p-1.5 rounded bg-white border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400 block uppercase font-medium">Lead Time</span>
                <span className="text-[9px] text-gray-500">
                  Target: {lifecycle.sla.resolutionMaxFormatted}
                </span>
              </div>
              <span className="font-bold text-gray-900 text-xs block">
                {formatDuration(leadTimeMs)}
              </span>
              <span className="text-[9px] text-gray-400 block">Creation → Resolution</span>
            </div>

            <div
              className={`p-1.5 rounded border ${
                isStalled
                  ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                  : isResolved
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500 block uppercase font-medium">
                  Stage SLA ({lifecycle.priority})
                </span>
                <span
                  className={`text-[9px] font-bold px-1 rounded ${
                    isStalled ? 'bg-amber-200 text-amber-900' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {lifecycle.sla.stageMaxFormatted} Max
                </span>
              </div>
              <span className="font-bold text-xs block mt-0.5">
                {STATUS_META[lifecycle.currentStatus]?.label || lifecycle.currentStatus}: {formatDuration(lifecycle.stalledDurationMs)}
              </span>
              <span
                className={`text-[9px] block mt-0.5 font-medium ${
                  isStalled ? 'text-amber-800' : isResolved ? 'text-emerald-700' : 'text-gray-500'
                }`}
              >
                {isResolved
                  ? 'Ticket Completed'
                  : isSlaPaused
                  ? 'SLA paused while pending'
                  : isStalled
                  ? `Breached by +${formatDuration(lifecycle.slaOverdueMs)} (${lifecycle.slaUsagePercent}%)`
                  : `${formatDuration(lifecycle.slaRemainingMs)} left before stall (${lifecycle.slaUsagePercent}%)`}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 select-none ${className}`}>
      {/* Header Summary */}
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 flex-wrap">
          <Clock className="w-3.5 h-3.5 text-gray-500" />
          <span className="font-semibold text-gray-800">Lifecycle Progression</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${lifecycle.sla.badgeClass}`}>
            {lifecycle.priority} SLA: {lifecycle.sla.stageMaxFormatted}/stage
          </span>
          {isStalled && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
              title={lifecycle.stalledReason}
            >
              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
              <span>STALLED (+{formatDuration(lifecycle.slaOverdueMs)} overdue)</span>
            </span>
          )}
          {lifecycle.hasRegressions && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <RotateCcw className="w-3 h-3 text-rose-500" />
              <span>Rework / Reopened</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <span>
            Total: <strong className="text-gray-900">{formatDuration(totalDurationMs)}</strong>
          </span>
          {isResolved && (
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Resolved</span>
            </span>
          )}
        </div>
      </div>

      {/* Proportional Multi-Segment Progress Bar */}
      <div className="h-5 w-full bg-gray-100 rounded border border-gray-200 flex overflow-hidden p-0.5 gap-0.5">
        {segments.map((seg, idx) => {
          const rawPct = (seg.durationMs / totalMs) * 100;
          // Ensure every segment has at least 8% width so its text is readable
          const minWidthPct = Math.max(rawPct, 8);
          const meta = STATUS_META[seg.status] || STATUS_META.NEW;

          return (
            <div
              key={seg.id}
              style={{ flexGrow: Math.max(1, Math.round(seg.durationMs / 1000)) }}
              className={`relative h-full flex items-center justify-between px-2 text-[10px] font-mono font-medium rounded-xs transition-all duration-150 group cursor-default ${
                meta.barColor
              } text-white ${seg.isCurrent ? 'ring-1 ring-black/40 ring-inset' : 'opacity-90 hover:opacity-100'}`}
              title={`${meta.label}: ${formatDuration(seg.durationMs)} ${
                seg.isCurrent ? '(Active / Ongoing)' : ''
              }${seg.actor ? ` • by ${seg.actor.name}` : ''}`}
            >
              <span className="truncate drop-shadow-xs">{meta.label}</span>
              <span className="text-[9px] opacity-90 truncate ml-1 drop-shadow-xs">
                {formatDuration(seg.durationMs)}
              </span>

              {/* Hover Tooltip Card */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col bg-gray-900 text-white p-2 rounded shadow-xl text-left text-[11px] z-30 pointer-events-none min-w-[160px] whitespace-normal">
                <div className="flex items-center justify-between gap-2 border-b border-gray-700 pb-1 mb-1">
                  <span className="font-bold text-white uppercase font-mono">{meta.label}</span>
                  {seg.isCurrent && (
                    <span className="text-[9px] bg-emerald-600 text-white px-1 rounded font-mono">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-300 font-mono space-y-0.5">
                  <p>
                    Duration: <span className="text-white font-bold">{formatDuration(seg.durationMs)}</span>
                  </p>
                  {seg.startTime && (
                    <p className="truncate">
                      Started: {new Date(seg.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                    </p>
                  )}
                  {seg.endTime && (
                    <p className="truncate">
                      Ended: {new Date(seg.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                    </p>
                  )}
                  {seg.actor && (
                    <p className="text-gray-400 truncate">
                      Updated by: <span className="text-white">{seg.actor.name}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Metric Breakdown Badges with Priority SLA Targets */}
      {showDetails && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
          <div className="p-2 rounded bg-gray-50 border border-gray-200">
            <span className="text-[10px] text-gray-400 block uppercase font-medium">Triage Time</span>
            <span className="font-bold text-gray-900 text-xs block">
              {formatDuration(lifecycle.triageDurationMs)}
            </span>
            <span className="text-[9px] text-gray-400 block mt-0.5">Time in NEW</span>
          </div>

          <div className="p-2 rounded bg-gray-50 border border-gray-200">
            <span className="text-[10px] text-gray-400 block uppercase font-medium">Work Cycle Time</span>
            <span className="font-bold text-gray-900 text-xs block">
              {formatDuration(cycleTimeMs)}
            </span>
            <span className="text-[9px] text-gray-400 block mt-0.5">Accepted → Resolved</span>
          </div>

          <div className="p-2 rounded bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 block uppercase font-medium">Lead Time</span>
              <span className="text-[9px] text-gray-500 font-medium">
                Goal: {lifecycle.sla.resolutionMaxFormatted}
              </span>
            </div>
            <span className="font-bold text-gray-900 text-xs block">
              {formatDuration(leadTimeMs)}
            </span>
            <span className="text-[9px] text-gray-400 block mt-0.5">Creation → Resolution</span>
          </div>

          <div
            className={`p-2 rounded border ${
              isStalled
                ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                : isResolved
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                : 'bg-gray-50 border-gray-200 text-gray-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500 block uppercase font-medium">
                Stage SLA ({lifecycle.priority})
              </span>
              <span
                className={`text-[9px] font-bold px-1 rounded ${
                  isStalled
                    ? 'bg-amber-200 text-amber-900'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {lifecycle.sla.stageMaxFormatted} Max
              </span>
            </div>
            <span className="font-bold text-xs block mt-0.5">
              {STATUS_META[lifecycle.currentStatus]?.label || lifecycle.currentStatus}: {formatDuration(lifecycle.stalledDurationMs)}
            </span>
            <span
              className={`text-[9px] block mt-0.5 font-medium ${
                isStalled
                  ? 'text-amber-800'
                  : isResolved
                  ? 'text-emerald-700'
                  : 'text-gray-500'
              }`}
            >
              {isResolved
                ? 'Ticket Resolved'
                : isSlaPaused
                ? 'SLA paused while pending'
                : isStalled
                ? `Breached by +${formatDuration(lifecycle.slaOverdueMs)} (${lifecycle.slaUsagePercent}% used)`
                : `${formatDuration(lifecycle.slaRemainingMs)} left before stall (${lifecycle.slaUsagePercent}%)`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
