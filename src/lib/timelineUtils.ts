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
  cycleTimeMs: number;           // Time from ACCEPTED to FIXED / CLOSED
  leadTimeMs: number;            // Total time from Creation to FIXED / CLOSED

  // Edge-case flags
  isResolved: boolean;           // Currently in FIXED, VERIFIED, or CLOSED
  isStalled: boolean;            // Stuck in current active status beyond threshold
  stalledDurationMs: number;     // How long it has been in current status
  hasRegressions: boolean;       // Moved backwards at least once (e.g. FIXED -> ASSIGNED)
  regressionCount: number;
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
  FIXED: {
    label: 'Fixed',
    order: 4,
    color: '#059669',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    barColor: 'bg-emerald-500',
  },
  VERIFIED: {
    label: 'Verified',
    order: 5,
    color: '#0d9488',
    bgClass: 'bg-teal-50',
    textClass: 'text-teal-700',
    borderClass: 'border-teal-200',
    barColor: 'bg-teal-500',
  },
  CLOSED: {
    label: 'Closed',
    order: 6,
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
    FIXED: 0,
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
    issue.status === 'FIXED' ||
    issue.status === 'VERIFIED' ||
    issue.status === 'CLOSED';

  // Lead Time: Total time from creation to resolution (or now)
  const totalDurationMs = Math.max(0, (isTerminal ? stageStartMs : referenceNowMs) - createdMs);
  const leadTimeMs = isResolved ? totalDurationMs : totalDurationMs;

  // Triage Duration: Time in NEW
  const triageDurationMs = statusDurations.NEW;

  // Cycle Time: Time from ACCEPTED to FIXED/CLOSED (active engineering/work duration)
  const cycleTimeMs = statusDurations.ACCEPTED + statusDurations.FIXED;

  // Stalled Detection:
  // Non-terminal tickets in the same active stage for > 5 days (or > 24h for P0)
  const stalledThresholdMs =
    issue.priority === 'P0' ? 24 * 60 * 60 * 1000 : 5 * 24 * 60 * 60 * 1000;
  const isStalled = !isResolved && finalDurationMs > stalledThresholdMs;

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
    FIXED: 0,
    VERIFIED: 0,
    CLOSED: 0,
  };

  issues.forEach((iss) => {
    if (statusDistribution[iss.status] !== undefined) {
      statusDistribution[iss.status]++;
    }
  });

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
  };
}
