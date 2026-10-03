import { Issue, Status, UserProfile, Priority } from '../types';

export interface LifecycleSegment {
  id: string;
  status: Status;
  enteredAt: string;
  exitedAt?: string | null;
  durationMs: number;
  durationFormatted: string;
  actor?: UserProfile;
  message?: string;
  isActive: boolean;
  isRegression: boolean;
}

export interface CumulativeStateTime {
  status: Status;
  totalMs: number;
  formatted: string;
  percentage: number;
  occurrences: number;
}

export interface StandardStageInfo {
  status: Status;
  label: string;
  visited: boolean;
  isCurrent: boolean;
  isSkipped: boolean;
  durationMs: number;
  durationFormatted?: string;
}

export interface TicketLifecycleSummary {
  leadTimeMs: number;
  leadTimeFormatted: string;
  cycleTimeMs: number | null;
  cycleTimeFormatted: string;
  triageTimeMs: number | null;
  triageTimeFormatted: string;
  currentStageMs: number;
  currentStageFormatted: string;
  reopenCount: number;
  isStalled: boolean;
  stalledReason?: string;
  isTerminal: boolean;
  segments: LifecycleSegment[];
  cumulativeTimes: CumulativeStateTime[];
  standardStages: StandardStageInfo[];
}

export const CANONICAL_STATUS_ORDER: Status[] = [
  'NEW',
  'ASSIGNED',
  'ACCEPTED',
  'FIXED',
  'VERIFIED',
  'CLOSED',
];

export const isTerminalStatus = (status: Status): boolean => {
  return status === 'CLOSED' || status === 'VERIFIED' || status === 'FIXED';
};

export const isResolvedStatus = (status: Status): boolean => {
  return status === 'FIXED' || status === 'VERIFIED' || status === 'CLOSED';
};

export const isWorkingStatus = (status: Status): boolean => {
  return status === 'ACCEPTED';
};

/**
 * Formats milliseconds into clean, readable duration strings.
 * e.g. "< 1m", "42m", "3h 15m", "2d 4h", "14d"
 */
export function formatDuration(ms: number): string {
  const safeMs = Math.max(0, ms);
  const minutes = Math.floor(safeMs / 60000);
  const hours = Math.floor(safeMs / 3600000);
  const days = Math.floor(safeMs / 86400000);

  if (safeMs < 60000) {
    const seconds = Math.floor(safeMs / 1000);
    return seconds > 0 ? `${seconds}s` : '< 1m';
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  if (hours < 24) {
    const remMinutes = minutes % 60;
    return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
  }

  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

/**
 * Checks if a transition from `from` to `to` represents a regression or reopening
 */
function checkIsRegression(from: Status, to: Status): boolean {
  // Reopening from resolved/closed state back to active work
  if (isResolvedStatus(from) && !isResolvedStatus(to)) {
    return true;
  }
  // Backtracking from working/accepted to unassigned or new
  if (from === 'ACCEPTED' && (to === 'NEW' || to === 'ASSIGNED')) {
    return true;
  }
  // Backtracking from assigned to unassigned/new
  if (from === 'ASSIGNED' && to === 'NEW') {
    return true;
  }
  return false;
}

/**
 * Detects if a ticket has stalled in its current state based on priority SLAs
 */
function checkStalledStatus(
  status: Status,
  priority: Priority,
  currentStageMs: number
): { isStalled: boolean; reason?: string } {
  if (isTerminalStatus(status)) {
    return { isStalled: false };
  }

  const hours = currentStageMs / 3600000;
  const days = hours / 24;

  let maxAllowedHours = 168; // Default 7 days for P2/P3
  if (priority === 'P0') maxAllowedHours = 24; // 24 hrs for Blocker
  else if (priority === 'P1') maxAllowedHours = 72; // 3 days for Critical
  else if (priority === 'P2') maxAllowedHours = 168; // 7 days for Major
  else maxAllowedHours = 336; // 14 days for Minor

  if (hours > maxAllowedHours) {
    const thresholdDesc =
      maxAllowedHours >= 24
        ? `${Math.floor(maxAllowedHours / 24)}d`
        : `${maxAllowedHours}h`;
    return {
      isStalled: true,
      reason: `Stalled in ${status} for ${formatDuration(currentStageMs)} (exceeds ${priority} SLA threshold of ${thresholdDesc})`,
    };
  }

  return { isStalled: false };
}

/**
 * Main lifecycle computation engine with comprehensive edge-case handling.
 */
export function getTicketLifecycle(issue: Issue): TicketLifecycleSummary {
  const now = Date.now();
  const createdTime = new Date(issue.createdAt).getTime() || now;
  const isTerminal = isTerminalStatus(issue.status);

  // ------------------------------------------------------------------
  // 1. Extract all status transition events from history and comments
  // ------------------------------------------------------------------
  interface TransitionEvent {
    timestamp: number;
    isoDate: string;
    newStatus: Status;
    actor?: UserProfile;
    message?: string;
  }

  const events: TransitionEvent[] = [];

  // Parse from history
  (issue.history || []).forEach((h) => {
    if (h.field && h.field.toLowerCase() === 'status' && h.newValue) {
      const time = new Date(h.createdAt).getTime();
      if (!isNaN(time)) {
        events.push({
          timestamp: time,
          isoDate: h.createdAt,
          newStatus: h.newValue as Status,
          actor: h.actor,
          message: h.message,
        });
      }
    }
  });

  // Parse from comments with statusChange (in case not in history)
  (issue.comments || []).forEach((c) => {
    if (c.statusChange && c.statusChange.includes('to ')) {
      const match = c.statusChange.match(/to\s+([A-Z_]+)/i);
      if (match && match[1]) {
        const parsedStatus = match[1].toUpperCase() as Status;
        if (CANONICAL_STATUS_ORDER.includes(parsedStatus)) {
          const time = new Date(c.createdAt).getTime();
          if (!isNaN(time)) {
            // Deduplicate if event already exists around this time
            const exists = events.some(
              (e) =>
                e.newStatus === parsedStatus &&
                Math.abs(e.timestamp - time) < 1000
            );
            if (!exists) {
              events.push({
                timestamp: time,
                isoDate: c.createdAt,
                newStatus: parsedStatus,
                actor: c.author,
                message: c.statusChange,
              });
            }
          }
        }
      }
    }
  });

  // Sort events chronologically
  events.sort((a, b) => a.timestamp - b.timestamp);

  // ------------------------------------------------------------------
  // 2. Determine initial status at ticket creation
  // ------------------------------------------------------------------
  let initialStatus: Status = 'NEW';
  const creationHistory = (issue.history || []).find(
    (h) => h.field === 'Issue' && h.newValue === 'Created'
  );

  if (events.length > 0) {
    const firstStatusHistory = (issue.history || []).find(
      (h) => h.field && h.field.toLowerCase() === 'status'
    );
    if (firstStatusHistory && firstStatusHistory.oldValue) {
      const parsedOld = firstStatusHistory.oldValue.toUpperCase() as Status;
      if (CANONICAL_STATUS_ORDER.includes(parsedOld)) {
        initialStatus = parsedOld;
      }
    }
  } else {
    // If no events logged yet, check current status
    initialStatus = issue.status || 'NEW';
  }

  // ------------------------------------------------------------------
  // 3. Build chronological lifecycle segments
  // ------------------------------------------------------------------
  const segments: LifecycleSegment[] = [];
  let currentSegmentStatus = initialStatus;
  let currentSegmentStart = createdTime;
  let currentSegmentStartIso = issue.createdAt;
  let currentActor = creationHistory?.actor || issue.reporter;
  let reopenCount = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    // Skip redundant transitions (same status within tiny timeframe)
    if (event.newStatus === currentSegmentStatus) {
      continue;
    }

    const duration = Math.max(0, event.timestamp - currentSegmentStart);
    const isRegression = checkIsRegression(currentSegmentStatus, event.newStatus);
    if (isRegression) {
      reopenCount += 1;
    }

    segments.push({
      id: `seg-${segments.length}-${currentSegmentStatus}`,
      status: currentSegmentStatus,
      enteredAt: currentSegmentStartIso,
      exitedAt: event.isoDate,
      durationMs: duration,
      durationFormatted: formatDuration(duration),
      actor: currentActor,
      isActive: false,
      isRegression: false,
    });

    currentSegmentStatus = event.newStatus;
    currentSegmentStart = event.timestamp;
    currentSegmentStartIso = event.isoDate;
    currentActor = event.actor || currentActor;
  }

  // ------------------------------------------------------------------
  // 4. Handle Final / Current Active Segment
  // ------------------------------------------------------------------
  // Ensure the current segment status matches issue.status
  if (currentSegmentStatus !== issue.status) {
    // There was a discrepancy between history and current status
    const updateTime = new Date(issue.updatedAt).getTime() || now;
    const dur1 = Math.max(0, updateTime - currentSegmentStart);
    segments.push({
      id: `seg-${segments.length}-${currentSegmentStatus}`,
      status: currentSegmentStatus,
      enteredAt: currentSegmentStartIso,
      exitedAt: issue.updatedAt,
      durationMs: dur1,
      durationFormatted: formatDuration(dur1),
      actor: currentActor,
      isActive: false,
      isRegression: false,
    });

    currentSegmentStatus = issue.status;
    currentSegmentStart = updateTime;
    currentSegmentStartIso = issue.updatedAt;
  }

  // For the final segment:
  let finalDuration = 0;
  let finalExitedAt: string | null = null;
  let finalIsActive = false;

  if (isTerminal) {
    // For terminal state, duration is frozen from enteredAt to updatedAt (or last event)
    const endTime = Math.max(
      currentSegmentStart,
      new Date(issue.updatedAt).getTime() || currentSegmentStart
    );
    finalDuration = Math.max(0, endTime - currentSegmentStart);
    finalExitedAt = issue.updatedAt;
    finalIsActive = false;
  } else {
    // Ticket is actively in-progress: duration counts up to now
    finalDuration = Math.max(0, now - currentSegmentStart);
    finalExitedAt = null;
    finalIsActive = true;
  }

  const lastIsRegression =
    segments.length > 0
      ? checkIsRegression(segments[segments.length - 1].status, currentSegmentStatus)
      : false;

  segments.push({
    id: `seg-${segments.length}-${currentSegmentStatus}`,
    status: currentSegmentStatus,
    enteredAt: currentSegmentStartIso,
    exitedAt: finalExitedAt,
    durationMs: finalDuration,
    durationFormatted: formatDuration(finalDuration),
    actor: currentActor,
    isActive: finalIsActive,
    isRegression: lastIsRegression,
  });

  // ------------------------------------------------------------------
  // 5. Compute Cumulative State Times
  // ------------------------------------------------------------------
  const cumulativeMap = new Map<Status, { totalMs: number; occurrences: number }>();
  CANONICAL_STATUS_ORDER.forEach((s) => cumulativeMap.set(s, { totalMs: 0, occurrences: 0 }));

  let totalCumulativeMs = 0;
  segments.forEach((seg) => {
    const existing = cumulativeMap.get(seg.status) || { totalMs: 0, occurrences: 0 };
    existing.totalMs += seg.durationMs;
    existing.occurrences += 1;
    cumulativeMap.set(seg.status, existing);
    totalCumulativeMs += seg.durationMs;
  });

  const cumulativeTimes: CumulativeStateTime[] = Array.from(cumulativeMap.entries())
    .filter(([_, data]) => data.occurrences > 0)
    .map(([status, data]) => ({
      status,
      totalMs: data.totalMs,
      formatted: formatDuration(data.totalMs),
      percentage: totalCumulativeMs > 0 ? Math.round((data.totalMs / totalCumulativeMs) * 100) : 0,
      occurrences: data.occurrences,
    }));

  // ------------------------------------------------------------------
  // 6. Compute Key Industry Metrics (Lead Time, Cycle Time, Triage Time)
  // ------------------------------------------------------------------
  // Total Lead Time: Creation -> Resolution (or Creation -> Now if open)
  const leadTimeMs = Math.max(0, totalCumulativeMs);

  // Triage Time: Creation -> First Assignment or Acceptance
  let triageTimeMs: number | null = null;
  const firstAcknowledgeSeg = segments.find(
    (s) => s.status === 'ASSIGNED' || s.status === 'ACCEPTED'
  );
  if (firstAcknowledgeSeg && firstAcknowledgeSeg.enteredAt) {
    const ackTime = new Date(firstAcknowledgeSeg.enteredAt).getTime();
    triageTimeMs = Math.max(0, ackTime - createdTime);
  }

  // Cycle Time (Active work time): First ACCEPTED/ASSIGNED -> Resolution (or Now)
  let cycleTimeMs: number | null = null;
  const firstWorkingSeg = segments.find(
    (s) => s.status === 'ACCEPTED' || s.status === 'ASSIGNED'
  );
  if (firstWorkingSeg) {
    const workStart = new Date(firstWorkingSeg.enteredAt).getTime();
    const resolutionSeg = segments.find(
      (s) => s.status === 'FIXED' || s.status === 'VERIFIED' || s.status === 'CLOSED'
    );
    const workEnd = resolutionSeg ? new Date(resolutionSeg.enteredAt).getTime() : now;
    cycleTimeMs = Math.max(0, workEnd - workStart);
  }

  // Current stage time
  const currentStageMs = finalDuration;

  // Stalled status
  const stalledCheck = checkStalledStatus(issue.status, issue.priority, currentStageMs);

  // ------------------------------------------------------------------
  // 7. Canonical Standard Stages Progression (with skipped detection)
  // ------------------------------------------------------------------
  const visitedStatuses = new Set(segments.map((s) => s.status));
  const currentStatusIndex = CANONICAL_STATUS_ORDER.indexOf(issue.status);

  const standardStages: StandardStageInfo[] = CANONICAL_STATUS_ORDER.map((s, idx) => {
    const visited = visitedStatuses.has(s);
    const isCurrent = issue.status === s;
    const isSkipped = !visited && idx < currentStatusIndex;
    const cumulative = cumulativeMap.get(s);

    return {
      status: s,
      label: s,
      visited,
      isCurrent,
      isSkipped,
      durationMs: cumulative ? cumulative.totalMs : 0,
      durationFormatted: cumulative && cumulative.totalMs > 0 ? formatDuration(cumulative.totalMs) : undefined,
    };
  });

  return {
    leadTimeMs,
    leadTimeFormatted: formatDuration(leadTimeMs),
    cycleTimeMs,
    cycleTimeFormatted: cycleTimeMs !== null ? formatDuration(cycleTimeMs) : '—',
    triageTimeMs,
    triageTimeFormatted: triageTimeMs !== null ? formatDuration(triageTimeMs) : '—',
    currentStageMs,
    currentStageFormatted: formatDuration(currentStageMs),
    reopenCount,
    isStalled: stalledCheck.isStalled,
    stalledReason: stalledCheck.reason,
    isTerminal,
    segments,
    cumulativeTimes,
    standardStages,
  };
}
