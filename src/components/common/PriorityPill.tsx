import React from 'react';
import { Priority } from '../../types';
import { cn } from '../../lib/utils';
import { AlertCircle, AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react';

interface PriorityPillProps {
  priority: Priority;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const PriorityPill: React.FC<PriorityPillProps> = ({
  priority,
  showIcon = true,
  size = 'md',
  className,
}) => {
  const config = {
    critical: {
      label: 'Critical',
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20 dark:text-rose-400 dark:bg-rose-950/40 dark:border-rose-800/40',
      dot: 'bg-rose-500 animate-pulse',
      icon: AlertCircle,
    },
    high: {
      label: 'High',
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-800/40',
      dot: 'bg-amber-500',
      icon: ArrowUp,
    },
    medium: {
      label: 'Medium',
      color: 'text-sky-500 bg-sky-500/10 border-sky-500/20 dark:text-sky-400 dark:bg-sky-950/40 dark:border-sky-800/40',
      dot: 'bg-sky-500',
      icon: ArrowUp,
    },
    low: {
      label: 'Low',
      color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20 dark:text-zinc-400 dark:bg-zinc-800/40 dark:border-zinc-700/40',
      dot: 'bg-zinc-400',
      icon: ArrowDown,
    },
  }[priority] || {
    label: priority,
    color: 'text-zinc-400 bg-zinc-800/40 border-zinc-700/40',
    dot: 'bg-zinc-400',
    icon: ArrowDown,
  };

  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono font-medium rounded border uppercase tracking-wider',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        config.color,
        className
      )}
    >
      {showIcon && (
        <span className="flex items-center">
          <Icon className={cn(size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
        </span>
      )}
      <span>{config.label}</span>
    </span>
  );
};
