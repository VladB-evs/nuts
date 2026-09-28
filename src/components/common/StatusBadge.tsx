import React from 'react';
import { TicketStatus } from '../../types';
import { cn } from '../../lib/utils';
import {
  Sparkles,
  CircleDot,
  PlayCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Archive,
} from 'lucide-react';

interface StatusBadgeProps {
  status: TicketStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; icon: React.FC<{ className?: string }>; color: string; dotColor: string }
> = {
  new: {
    label: 'New / Triage',
    icon: Sparkles,
    color: 'text-sky-400 bg-sky-950/40 border-sky-800/40',
    dotColor: 'bg-sky-400 animate-pulse',
  },
  open: {
    label: 'Open',
    icon: CircleDot,
    color: 'text-zinc-200 bg-zinc-800/60 border-zinc-700/60',
    dotColor: 'bg-white',
  },
  in_progress: {
    label: 'In Progress',
    icon: PlayCircle,
    color: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
    dotColor: 'bg-amber-400',
  },
  pending: {
    label: 'Waiting on Info',
    icon: Clock,
    color: 'text-purple-400 bg-purple-950/40 border-purple-800/40',
    dotColor: 'bg-purple-400',
  },
  escalated: {
    label: 'Escalated',
    icon: AlertTriangle,
    color: 'text-rose-400 bg-rose-950/60 border-rose-800/60',
    dotColor: 'bg-rose-500 animate-pulse',
  },
  resolved: {
    label: 'Resolved',
    icon: CheckCircle2,
    color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
    dotColor: 'bg-emerald-400',
  },
  closed: {
    label: 'Closed',
    icon: Archive,
    color: 'text-zinc-500 bg-zinc-900 border-zinc-800',
    dotColor: 'bg-zinc-600',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className,
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono font-medium rounded border whitespace-nowrap',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        config.color,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dotColor)} />
      <Icon className={cn(size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3', 'flex-shrink-0')} />
      <span>{config.label}</span>
    </span>
  );
};
