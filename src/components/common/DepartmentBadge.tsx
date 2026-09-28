import React from 'react';
import { Department } from '../../types';
import { cn } from '../../lib/utils';
import { Code2, Megaphone, TrendingUp, Sparkles, ShieldAlert, Layers } from 'lucide-react';

interface DepartmentBadgeProps {
  department?: Department;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export const getDepartmentIcon = (iconName: string, className = 'w-3 h-3') => {
  switch (iconName) {
    case 'Code2':
      return <Code2 className={className} />;
    case 'Megaphone':
      return <Megaphone className={className} />;
    case 'TrendingUp':
      return <TrendingUp className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'ShieldAlert':
      return <ShieldAlert className={className} />;
    default:
      return <Layers className={className} />;
  }
};

export const DepartmentBadge: React.FC<DepartmentBadgeProps> = ({
  department,
  size = 'md',
  showIcon = true,
  className,
}) => {
  if (!department) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
        General
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono font-medium rounded border border-zinc-800 bg-zinc-900/80 text-zinc-200 transition-colors',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        className
      )}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: department.color }}
      />
      {showIcon && (
        <span style={{ color: department.color }} className="flex-shrink-0">
          {getDepartmentIcon(department.icon, size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3')}
        </span>
      )}
      <span className="truncate">{department.name}</span>
    </span>
  );
};
