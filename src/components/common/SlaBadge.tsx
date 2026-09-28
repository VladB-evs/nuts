import React from 'react';
import { TicketStatus } from '../../types';
import { cn } from '../../lib/utils';
import { Timer, AlertCircle, CheckCircle } from 'lucide-react';

interface SlaBadgeProps {
  deadline: string;
  status: TicketStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const SlaBadge: React.FC<SlaBadgeProps> = ({
  deadline,
  status,
  size = 'md',
  className,
}) => {
  if (status === 'resolved' || status === 'closed') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 font-mono rounded border text-emerald-400 bg-emerald-950/30 border-emerald-800/40',
          size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
          className
        )}
      >
        <CheckCircle className={cn(size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
        <span>SLA Met</span>
      </span>
    );
  }

  const now = new Date().getTime();
  const target = new Date(deadline).getTime();
  const diffMs = target - now;
  const isBreached = diffMs <= 0;

  const totalMinutes = Math.abs(Math.floor(diffMs / (1000 * 60)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  if (isBreached) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 font-mono font-semibold rounded border text-rose-400 bg-rose-950/60 border-rose-800 animate-pulse',
          size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
          className
        )}
        title="SLA Breached! Requires immediate attention."
      >
        <AlertCircle className={cn(size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
        <span>Breached (-{timeString})</span>
      </span>
    );
  }

  const isUrgent = hours < 4;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-mono rounded border',
        isUrgent
          ? 'text-amber-400 bg-amber-950/40 border-amber-800/60 font-medium'
          : 'text-zinc-400 bg-zinc-900 border-zinc-800',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        className
      )}
    >
      <Timer className={cn(size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
      <span>SLA: {timeString}</span>
    </span>
  );
};
