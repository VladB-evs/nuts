import { Issue, Status, Priority, UserProfile } from '../types';

export interface LifecycleSegment {
  id: string;
  status: Status;
  label: string;
  startTime: string;
  endTime?: string;
  durationMs: number;
  actor?: UserProfile;
  isCurrent: boolean;
  isRegression: boolean;
}

export interface PrioritySla {
  priority: Priority;
  label: string;
  stageMaxMs: number;             // Maximum allowable duration in a single active stage before stalling (breaching stage SLA)
  stageMaxFormatted: string;       // e.g. "24h", "3d", "7d", "14d"
  stageMaxDays: number;
  resolutionMaxMs: number;        // Maximum allowable total lead time before breaching resolution SLA
  resolutionMaxFormatted: string;  // e.g. "48h", "7d", "14d", "30d"
  badgeClass: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  description: string;
}

export const PRIORITY_SLAS: Record<Priority, PrioritySla> = {
  P0: {
    priority: 'P0',
    label: 'Blocker',
    stageMaxMs: 24 * 60 * 60 * 1000, // 24 hours
    stageMaxFormatted: '24h',
    stageMaxDays: 1,
    resolutionMaxMs: 48 * 60 * 60 * 1000, // 48 hours
    resolutionMaxFormatted: '48h',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    textClass: 'text-red-700',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    description: 'Outages & critical blockers. Maximum 24h per active stage, 48h to resolve.',
  },
  P1: {
    priority: 'P1',
    label: 'Critical',
    stageMaxMs: 3 * 24 * 60 * 60 * 1000, // 3 days (72 hours)
    stageMaxFormatted: '3d',
    stageMaxDays: 3,
    resolutionMaxMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    resolutionMaxFormatted: '7d',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    textClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    description: 'High impact functionality defects. Maximum 3 days per active stage, 7 days to resolve.',
  },
  P2: {
    priority: 'P2',
    label: 'Major',
    stageMaxMs: 7 * 24 * 60 * 60 * 1000, // 7 days (1 week)
    stageMaxFormatted: '7d',
    stageMaxDays: 7,
    resolutionMaxMs: 14 * 24 * 60 * 60 * 1000, // 14 days
    resolutionMaxFormatted: '14d',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    textClass: 'text-blue-700',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    description: 'Standard product defects & planned tasks. Maximum 7 days per active stage, 14 days to resolve.',
  },
  P3: {
    priority: 'P3',
    label: 'Minor',
    stageMaxMs: 14 * 24 * 60 * 60 * 1000, // 14 days (2 weeks)
    stageMaxFormatted: '14d',
    stageMaxDays: 14,
    resolutionMaxMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    resolutionMaxFormatted: '30d',
    badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
    textClass: 'text-gray-700',
    bgClass: 'bg-gray-50',
    borderClass: 'border-gray-200',
    description: 'Low-severity polish, cosmetic issues, or enhancements. Maximum 14 days per active stage, 30 days to resolve.',
  },
};

export interface TicketLifecycle {
  issueId: string;
  code: string;
  title: string;
  departmentId: string;
  priority: Priority;
  currentStatus: Status;
  createdAt: string;
  updatedAt: string;
  assignee: UserProfile | null;
  reporter: UserProfile;

  // Segment breakdown in chronological order (including any regressions / rework)
  segments: LifecycleSegment[];

  // Cumulative time spent in each status
  statusDurations: Record<Status, number>;

  // Key performance metrics
  totalDurationMs: number;       // From creation to now (or closed)
  triageDurationMs: number;      // Time in NEW before first ASSIGNED
  cycleTimeMs: number;           // Time from ACCEPTED to COMPLETED / CLOSED
  leadTimeMs: number;            // Total time from Creation to COMPLETED / CLOSED

  // Edge-case flags
  isResolved: boolean;           // Currently in COMPLETED, VERIFIED, or CLOSED
  isStalled: boolean;            // Stuck in current active status beyond priority stage SLA
  stalledDurationMs: number;     // How long it has been in current status
  hasRegressions: boolean;       // Moved backwards at least once (e.g. COMPLETED -> ASSIGNED)
  regressionCount: number;

  // SLA Specific Metrics
  sla: PrioritySla;
  slaStageBreached: boolean;     // Active stage duration > Priority Stage SLA
  slaResolutionBreached: boolean;// Overall lead time > Priority Resolution SLA
  slaOverdueMs: number;          // How much time beyond SLA (0 if healthy)
  slaRemainingMs: number;        // Time left in stage before breaching SLA (negative if overdue)
  slaUsagePercent: number;       // Percentage of stage SLA consumed (e.g. 75%, 150%)
  stalledReason: string;         // Human-friendly explanation of why it is stalled / breached
}

export interface DepartmentLifecycleMetrics {
  totalTickets: number;
  resolvedTickets: number;
  inProgressTickets: number;
  stalledTickets: number;
  avgLeadTimeMs: number;
  avgCycleTimeMs: number;
  avgTriageTimeMs: number;
  statusDistribution: Record<Status, number>;
  stalledTicketsList: TicketLifecycle[];
  stalledByPriority: Record<Priority, number>;
}

export const STATUS_META: Record<
  Status,
  {
    label: string;
    order: number;
    color: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    barColor: string;
  }
> = {
  NEW: {
    label: 'New',
    order: 1,
    color: '#0284c7',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-700',
    borderClass: 'border-sky-200',
    barColor: 'bg-sky-400',
  },
  ASSIGNED: {
    label: 'Assigned',
    order: 2,
    color: '#4f46e5',
    bgClass: 'bg-indigo-50',
    textClass: 'text-indigo-700',
    borderClass: 'border-indigo-200',
    barColor: 'bg-indigo-500',
  },
  ACCEPTED: {
    label: 'Accepted',
    order: 3,
    color: '#7c3aed',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-200',
    barColor: 'bg-purple-500',
  },
  PENDING: {
    label: 'Pending',
    order: 4,
    color: '#d97706',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    barColor: 'bg-amber-500',
  },
  COMPLETED: {
    label: 'Completed',
    order: 5,
    color: '#059669',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    barColor: 'bg-emerald-500',
  },
  VERIFIED: {
    label: 'Verified',
    order: 6,
    color: '#0d9488',
    bgClass: 'bg-teal-50',
    textClass: 'text-teal-700',
    borderClass: 'border-teal-200',
    barColor: 'bg-teal-500',
  },
  CLOSED: {
    label: 'Closed',
    order: 7,
    color: '#4b5563',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-700',
    borderClass: 'border-gray-300',
    barColor: 'bg-gray-500',
  },
};

/**
 * Human friendly duration formatting (e.g. "< 1m", "45m", "3h 20m", "4d 6h")
 */
export function formatDuration(ms: number): string {
  if (ms <= 0 || isNaN(ms)) return '0m';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return '< 1m';
  if (hours < 1) return `${minutes}m`;
  if (days < 1) {
    const remMinutes = minutes % 60;
    return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
  }

  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

/**
 * Computes exact chronological lifecycle breakdown, handling regressions,
 * skipped stages, ongoing states, and missing timestamps.
 */
export function computeTicketLifecycle(
  issue: Issue,
  referenceNowMs: number = Date.now()
): TicketLifecycle {
  const createdMs = Math.max(
    0,
    new Date(issue.createdAt || issue.updatedAt || referenceNowMs).getTime() || referenceNowMs
  );

  // 1. Gather all status transition events from history and comments
  interface StatusEvent {
    timestamp: number;
    from?: Status;
    to: Status;
    actor?: UserProfile;
  }

  const events: StatusEvent[] = [];

  // Parse history entries
  (issue.history || []).forEach((h) => {
    const fieldName = (h.field || '').trim().toLowerCase();
    if (fieldName === 'status' || fieldName === 'state') {
      const toVal = (h.newValue || '').trim().toUpperCase() as Status;
      const fromVal = (h.oldValue || '').trim().toUpperCase() as Status;
      if (STATUS_META[toVal]) {
        events.push({
          timestamp: new Date(h.createdAt).getTime(),
          from: STATUS_META[fromVal] ? fromVal : undefined,
          to: toVal,
          actor: h.actor,
        });
      }
    }
  });

  // Parse comment statusChange entries if not already captured in history
  (issue.comments || []).forEach((c) => {
    if (c.statusChange) {
      const match = c.statusChange.match(/from\s+([A-Z]+)\s+to\s+([A-Z]+)/i);
      if (match) {
        const fromVal = match[1].toUpperCase() as Status;
        const toVal = match[2].toUpperCase() as Status;
        if (STATUS_META[toVal]) {
          const timestamp = new Date(c.createdAt).getTime();
          // Check if already in events
          const exists = events.some(
            (e) => Math.abs(e.timestamp - timestamp) < 1000 && e.to === toVal
          );
          if (!exists) {
            events.push({
              timestamp,
              from: STATUS_META[fromVal] ? fromVal : undefined,
              to: toVal,
              actor: c.author,
            });
          }
        }
      }
    }
  });

  // Sort events chronologically
  events.sort((a, b) => a.timestamp - b.timestamp);

  // 2. Determine initial status at ticket creation
  // If first event has a 'from' status, use that. Otherwise, if ticket was created with assignee -> ASSIGNED, else NEW.
  let initialStatus: Status = 'NEW';
  if (events.length > 0 && events[0].from && STATUS_META[events[0].from]) {
    initialStatus = events[0].from;
  } else if (issue.assignee) {
    initialStatus = 'ASSIGNED';
  } else if (events.length > 0 && events[0].to === issue.status && events[0].timestamp <= createdMs + 1000) {
    initialStatus = events[0].to;
  }

  // 3. Build chronological lifecycle segments
  const segments: LifecycleSegment[] = [];
  const statusDurations: Record<Status, number> = {
    NEW: 0,
    ASSIGNED: 0,
    ACCEPTED: 0,
    PENDING: 0,
    COMPLETED: 0,
    VERIFIED: 0,
    CLOSED: 0,
  };

  let currentStage = initialStatus;
  let stageStartMs = createdMs;
  let regressionCount = 0;

  // Process all recorded events
  events.forEach((ev, idx) => {
    // Prevent negative duration or clock skew
    const eventTimeMs = Math.max(stageStartMs, ev.timestamp);
    const durationMs = Math.max(0, eventTimeMs - stageStartMs);

    // Check if moving to an earlier stage (regression / rework)
    const prevOrder = STATUS_META[currentStage]?.order || 1;
    const nextOrder = STATUS_META[ev.to]?.order || 1;
    const isRegression = nextOrder < prevOrder;
    if (isRegression) regressionCount++;

    segments.push({
      id: `seg-${issue.id}-${idx}`,
      status: currentStage,
      label: STATUS_META[currentStage]?.label || currentStage,
      startTime: new Date(stageStartMs).toISOString(),
      endTime: new Date(eventTimeMs).toISOString(),
      durationMs,
      actor: ev.actor,
      isCurrent: false,
      isRegression: false,
    });

    statusDurations[currentStage] = (statusDurations[currentStage] || 0) + durationMs;

    currentStage = ev.to;
    stageStartMs = eventTimeMs;
  });

  // 4. Final ongoing or terminal segment
  const isTerminal = issue.status === 'CLOSED';
  const effectiveEndMs = isTerminal
    ? stageStartMs
    : Math.max(stageStartMs, referenceNowMs);
  const finalDurationMs = Math.max(0, effectiveEndMs - stageStartMs);

  // If issue.status differs from last event target, sync to issue.status
  if (issue.status !== currentStage && STATUS_META[issue.status]) {
    currentStage = issue.status;
  }

  segments.push({
    id: `seg-${issue.id}-final`,
    status: currentStage,
    label: STATUS_META[currentStage]?.label || currentStage,
    startTime: new Date(stageStartMs).toISOString(),
    endTime: isTerminal ? new Date(effectiveEndMs).toISOString() : undefined,
    durationMs: finalDurationMs,
    isCurrent: !isTerminal,
    isRegression: false,
  });

  statusDurations[currentStage] = (statusDurations[currentStage] || 0) + finalDurationMs;

  // 5. Calculate lead time, cycle time, and triage metrics
  const isResolved =
    issue.status === 'COMPLETED' ||
    issue.status === 'VERIFIED' ||
    issue.status === 'CLOSED';

  // Lead Time: Total time from creation to resolution (or now)
  const totalDurationMs = Math.max(0, (isTerminal ? stageStartMs : referenceNowMs) - createdMs);
  const leadTimeMs = totalDurationMs;

  // Triage Duration: Time in NEW
  const triageDurationMs = statusDurations.NEW;

  // Cycle Time: Time from ACCEPTED to COMPLETED/CLOSED (active engineering/work duration)
  const cycleTimeMs = statusDurations.ACCEPTED + statusDurations.PENDING + statusDurations.COMPLETED;

  // Priority-based SLA resolution & Stalled Detection:
  // "Stall" is strictly defined by whether an active, unresolved ticket exceeds its Priority Stage SLA
  const sla = PRIORITY_SLAS[issue.priority] || PRIORITY_SLAS.P2;
  const isStalled = !isResolved && finalDurationMs > sla.stageMaxMs;
  const slaStageBreached = isStalled;
  const slaResolutionBreached = !isResolved && totalDurationMs > sla.resolutionMaxMs;
  const slaOverdueMs = isStalled ? Math.max(0, finalDurationMs - sla.stageMaxMs) : 0;
  const slaRemainingMs = sla.stageMaxMs - finalDurationMs;
  const slaUsagePercent = Math.min(999, Math.round((finalDurationMs / sla.stageMaxMs) * 100));

  let stalledReason = '';
  if (isStalled) {
    stalledReason = `Exceeded ${issue.priority} stage SLA (${sla.stageMaxFormatted}) in ${currentStage}: ${formatDuration(finalDurationMs)} elapsed (${formatDuration(slaOverdueMs)} overdue)`;
  } else if (!isResolved) {
    stalledReason = `Within ${issue.priority} stage SLA (${formatDuration(finalDurationMs)} of ${sla.stageMaxFormatted} in ${currentStage})`;
  } else {
    stalledReason = `Resolved in ${formatDuration(totalDurationMs)}`;
  }

  return {
    issueId: issue.id,
    code: issue.code,
    title: issue.title,
    departmentId: issue.departmentId,
    priority: issue.priority,
    currentStatus: issue.status,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    assignee: issue.assignee,
    reporter: issue.reporter,
    segments,
    statusDurations,
    totalDurationMs,
    triageDurationMs,
    cycleTimeMs,
    leadTimeMs,
    isResolved,
    isStalled,
    stalledDurationMs: finalDurationMs,
    hasRegressions: regressionCount > 0,
    regressionCount,
    sla,
    slaStageBreached,
    slaResolutionBreached,
    slaOverdueMs,
    slaRemainingMs,
    slaUsagePercent,
    stalledReason,
  };
}

/**
 * Computes aggregated department lifecycle metrics
 */
export function computeDepartmentLifecycleMetrics(
  issues: Issue[],
  nowMs: number = Date.now()
): DepartmentLifecycleMetrics {
  const lifecycles = issues.map((iss) => computeTicketLifecycle(iss, nowMs));

  const totalTickets = lifecycles.length;
  const resolved = lifecycles.filter((l) => l.isResolved);
  const inProgress = lifecycles.filter((l) => !l.isResolved);
  const stalled = lifecycles.filter((l) => l.isStalled);

  // Averages for resolved tickets
  const totalResolvedLeadTime = resolved.reduce((acc, curr) => acc + curr.leadTimeMs, 0);
  const avgLeadTimeMs = resolved.length > 0 ? Math.round(totalResolvedLeadTime / resolved.length) : 0;

  const totalResolvedCycleTime = resolved.reduce((acc, curr) => acc + curr.cycleTimeMs, 0);
  const avgCycleTimeMs = resolved.length > 0 ? Math.round(totalResolvedCycleTime / resolved.length) : 0;

  // Triage time for all tickets that passed through NEW
  const triaged = lifecycles.filter((l) => l.triageDurationMs > 0);
  const totalTriageTime = triaged.reduce((acc, curr) => acc + curr.triageDurationMs, 0);
  const avgTriageTimeMs = triaged.length > 0 ? Math.round(totalTriageTime / triaged.length) : 0;

  const statusDistribution: Record<Status, number> = {
    NEW: 0,
    ASSIGNED: 0,
    ACCEPTED: 0,
    PENDING: 0,
    COMPLETED: 0,
    VERIFIED: 0,
    CLOSED: 0,
  };

  issues.forEach((iss) => {
    if (statusDistribution[iss.status] !== undefined) {
      statusDistribution[iss.status]++;
    }
  });

  const stalledByPriority: Record<Priority, number> = {
    P0: stalled.filter((l) => l.priority === 'P0').length,
    P1: stalled.filter((l) => l.priority === 'P1').length,
    P2: stalled.filter((l) => l.priority === 'P2').length,
    P3: stalled.filter((l) => l.priority === 'P3').length,
  };

  return {
    totalTickets,
    resolvedTickets: resolved.length,
    inProgressTickets: inProgress.length,
    stalledTickets: stalled.length,
    avgLeadTimeMs,
    avgCycleTimeMs,
    avgTriageTimeMs,
    statusDistribution,
    stalledTicketsList: stalled,
    stalledByPriority,
  };
}
