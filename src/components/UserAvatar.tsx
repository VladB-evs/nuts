import React, { useState } from 'react';
import { UserProfile } from '../types';

interface UserAvatarProps {
  user?: UserProfile | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  alt?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  className = '',
  alt,
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    xs: 'w-4 h-4 text-[9px]',
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-6 h-6 text-xs',
    lg: 'w-8 h-8 text-sm',
    xl: 'w-12 h-12 text-base',
  };

  const initial = user?.name ? user.name.trim()[0].toUpperCase() : '?';
  const avatarUrl = user?.avatarUrl || user?.avatar;

  if (avatarUrl && !imageError) {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden border border-gray-300 bg-gray-100 ${sizeClasses[size]} ${className}`}
      >
        <img
          src={avatarUrl}
          alt={alt || user?.name || 'User avatar'}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover rounded-full"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 rounded-full font-semibold border border-gray-300 bg-gray-200 text-gray-800 select-none ${sizeClasses[size]} ${className}`}
      title={user ? `${user.name} (${user.department})` : undefined}
    >
      <span>{initial}</span>
    </div>
  );
};
