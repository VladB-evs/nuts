import React from 'react';
import { TicketStatus } from '../../types';
import { cn } from '../../lib/utils';
import { Circle, Clock, CheckCircle2, AlertCircle, PlayCircle, Archive } from 'lucide-react';

interface StatusBadgeProps {
  status: TicketStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; icon: React.FC<{ className?: string }>; color: string; dotColor: string }
> = {
  backlog: {
    label: 'Backlog',
    icon: Archive,
    color: 'text-zinc-400 bg-zinc-800/40 border-zinc-700/40',
    dotColor: 'bg-zinc-500',
  },
  todo: {
    label: 'To Do',
    icon: Circle,
    color: 'text-zinc-300 bg-zinc-800/60 border-zinc-700/60',
    dotColor: 'bg-zinc-300',
  },
  in_progress: {
    label: 'In Progress',
    icon: PlayCircle,
    color: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
    dotColor: 'bg-amber-400',
  },
  in_review: {
    label: 'In Review',
    icon: Clock,
    color: 'text-purple-400 bg-purple-950/40 border-purple-800/40',
    dotColor: 'bg-purple-400',
  },
  done: {
    label: 'Done',
    icon: CheckCircle2,
    color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
    dotColor: 'bg-emerald-400',
  },
  cancelled: {
    label: 'Cancelled',
    icon: AlertCircle,
    color: 'text-zinc-500 bg-zinc-900 border-zinc-800 line-through',
    dotColor: 'bg-zinc-600',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className,
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.todo;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono font-medium rounded border',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        config.color,
        className
      )}
    >
      <Icon className={cn(size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
      <span>{config.label}</span>
    </span>
  );
};
