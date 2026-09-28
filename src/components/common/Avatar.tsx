import React from 'react';
import { UserProfile } from '../../types';
import { cn } from '../../lib/utils';

interface AvatarProps {
  user?: UserProfile | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  user,
  size = 'md',
  showName = false,
  className,
}) => {
  if (!user) {
    return (
      <div className={cn('inline-flex items-center gap-2', className)}>
        <div
          className={cn(
            'rounded-full bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-400 font-mono font-medium',
            size === 'xs' && 'w-5 h-5 text-[9px]',
            size === 'sm' && 'w-6 h-6 text-[10px]',
            size === 'md' && 'w-8 h-8 text-xs',
            size === 'lg' && 'w-10 h-10 text-sm'
          )}
          title="Unassigned"
        >
          ?
        </div>
        {showName && <span className="text-xs text-zinc-500 font-mono">Unassigned</span>}
      </div>
    );
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const sizeClasses = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  }[size];

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <div
        className={cn(
          'relative rounded-full overflow-hidden bg-zinc-800 border border-zinc-700/80 flex items-center justify-center font-mono font-medium text-zinc-200 select-none flex-shrink-0',
          sizeClasses
        )}
        title={`${user.name} (${user.role})`}
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to initials if image fails to load
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {showName && (
        <span className="text-xs font-medium text-zinc-200 truncate">{user.name}</span>
      )}
    </div>
  );
};
