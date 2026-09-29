import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserProfile } from '../types';
import { useIssues } from '../context/TicketContext';
import { UserAvatar } from './UserAvatar';
import { Mail, Briefcase, Building, Layers, Search, ExternalLink } from 'lucide-react';

interface UserHoverCardProps {
  user?: UserProfile | null;
  children: React.ReactNode;
  className?: string;
  showUnderline?: boolean;
}

export const UserHoverCard: React.FC<UserHoverCardProps> = ({
  user,
  children,
  className = '',
  showUnderline = false,
}) => {
  const { issues, setSearchQuery, setSelectedIssue } = useIssues();
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    placeAbove: false,
  });

  const triggerRef = useRef<HTMLSpanElement>(null);
  const openTimeoutRef = useRef<number | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  if (!user) {
    return <span className={className}>{children}</span>;
  }

  const assignedCount = issues.filter(
    (i) => i.assignee?.id === user.id && i.status !== 'FIXED' && i.status !== 'CLOSED'
  ).length;

  const reportedCount = issues.filter((i) => i.reporter?.id === user.id).length;

  const calculatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const cardWidth = 280;
    const cardHeight = 220; // estimated

    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < cardHeight && rect.top > cardHeight;

    let left = rect.left;
    if (left + cardWidth > window.innerWidth - 16) {
      left = window.innerWidth - cardWidth - 16;
    }
    if (left < 16) left = 16;

    const top = placeAbove ? rect.top - 8 : rect.bottom + 8;

    setCoords({ top, left, placeAbove });
  };

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    openTimeoutRef.current = window.setTimeout(() => {
      calculatePosition();
      setIsOpen(true);
    }, 180);
  };

  const handleMouseLeave = () => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const handleFilterByUser = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchQuery(user.name);
    setSelectedIssue(null);
    setIsOpen(false);
  };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`inline-flex items-center cursor-pointer transition-colors ${
          showUnderline
            ? 'underline decoration-dotted decoration-gray-400 hover:decoration-black hover:text-black'
            : ''
        } ${className}`}
      >
        {children}
      </span>

      {isOpen &&
        createPortal(
          <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              position: 'fixed',
              top: coords.placeAbove ? 'auto' : `${coords.top}px`,
              bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : 'auto',
              left: `${coords.left}px`,
              zIndex: 9999,
            }}
            className="w-72 bg-white rounded-lg border border-gray-300 shadow-xl overflow-hidden text-xs animate-fade-in select-none"
          >
            {/* Minimal Header Accent Bar */}
            <div className="h-2 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-400" />

            <div className="p-4 space-y-3">
              {/* Top Row: Avatar + Name + Nickname */}
              <div className="flex items-start gap-3">
                <UserAvatar user={user} size="xl" className="shadow-xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-sm text-gray-900 leading-tight">
                      {user.name}
                    </h3>
                  </div>
                  {user.nickname && (
                    <p className="text-[11px] font-mono text-gray-500 font-medium">
                      @{user.nickname}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[10px] font-semibold bg-gray-100 border border-gray-300 text-gray-800 px-1.5 py-0.2 rounded">
                      {user.department}
                    </span>
                  </div>
                </div>
              </div>

              {/* Role & Department Details */}
              <div className="space-y-1.5 pt-2 border-t border-gray-100 text-[11px]">
                <div className="flex items-center gap-2 text-gray-700">
                  <Briefcase className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate font-medium">{user.role || 'Member'}</span>
                </div>

                <div className="flex items-center gap-2 text-gray-700">
                  <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">{user.department} Team</span>
                </div>

                {user.email && (
                  <div className="flex items-center gap-2 text-gray-500 font-mono text-[10px]">
                    <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                )}
              </div>

              {/* Workload / Ticket Metrics */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 font-mono text-[11px]">
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  <span className="text-[10px] text-gray-500 block uppercase">Assigned</span>
                  <span className="font-bold text-gray-900 text-xs">
                    {assignedCount} {assignedCount === 1 ? 'ticket' : 'tickets'}
                  </span>
                </div>
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  <span className="text-[10px] text-gray-500 block uppercase">Reported</span>
                  <span className="font-bold text-gray-900 text-xs">
                    {reportedCount} {reportedCount === 1 ? 'ticket' : 'tickets'}
                  </span>
                </div>
              </div>

              {/* Quick Action: Filter tickets */}
              <button
                type="button"
                onClick={handleFilterByUser}
                className="w-full flex items-center justify-center gap-1.5 py-1 px-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-medium text-[11px] transition-colors border border-gray-200"
              >
                <Search className="w-3 h-3 text-gray-500" />
                <span>View all tickets by {user.name.split(' ')[0]}</span>
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
