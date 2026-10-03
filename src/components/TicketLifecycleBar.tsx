import React, { useMemo } from 'react';
import { Issue } from '../types';
import {
  computeTicketLifecycle,
  formatDuration,
  STATUS_META,
  TicketLifecycle,
} from '../lib/timelineUtils';
import { Clock, AlertTriangle, ArrowRight, RotateCcw, CheckCircle2 } from 'lucide-react';

interface TicketLifecycleBarProps {
  issue: Issue;
  className?: string;
  showDetails?: boolean;
}

export const TicketLifecycleBar: React.FC<TicketLifecycleBarProps> = ({
  issue,
  className = '',
  showDetails = true,
}) => {
  const lifecycle: TicketLifecycle = useMemo(() => {
    return computeTicketLifecycle(issue);
  }, [issue]);

  const { segments, totalDurationMs, leadTimeMs, cycleTimeMs, isStalled, isResolved } = lifecycle;

  // Calculate percentage width for each segment, with minimum width for visibility
  const totalMs = Math.max(1, totalDurationMs);

  return (
    <div className={`space-y-2 select-none ${className}`}>
      {/* Header Summary */}
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-gray-500" />
          <span className="font-semibold text-gray-800">Lifecycle Progression</span>
          {isStalled && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span>STALLED</span>
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

      {/* Metric Breakdown Badges */}
      {showDetails && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
          <div className="p-1.5 rounded bg-gray-50 border border-gray-200">
            <span className="text-[10px] text-gray-400 block uppercase">Triage Time</span>
            <span className="font-bold text-gray-900">
              {formatDuration(lifecycle.triageDurationMs)}
            </span>
          </div>

          <div className="p-1.5 rounded bg-gray-50 border border-gray-200">
            <span className="text-[10px] text-gray-400 block uppercase">Work Cycle Time</span>
            <span className="font-bold text-gray-900">
              {formatDuration(cycleTimeMs)}
            </span>
          </div>

          <div className="p-1.5 rounded bg-gray-50 border border-gray-200">
            <span className="text-[10px] text-gray-400 block uppercase">Lead Time</span>
            <span className="font-bold text-gray-900">
              {formatDuration(leadTimeMs)}
            </span>
          </div>

          <div className="p-1.5 rounded bg-gray-50 border border-gray-200">
            <span className="text-[10px] text-gray-400 block uppercase">Current Stage</span>
            <span className="font-bold text-indigo-700">
              {STATUS_META[lifecycle.currentStatus]?.label || lifecycle.currentStatus} ({formatDuration(lifecycle.stalledDurationMs)})
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
