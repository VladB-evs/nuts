import React, { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { useIssues } from '../context/TicketContext';
import { UserAvatar } from './UserAvatar';
import { timeAgo } from '../lib/utils';
import type { AppNotification } from '../types';

const PHRASES: Record<AppNotification['kind'], string> = {
  assigned: 'assigned you',
  mentioned: 'mentioned you in',
  commented: 'commented on',
  status_changed: 'changed the status of',
  priority_changed: 'changed the priority of',
};

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markNotificationsRead, issues, setSelectedIssue, isDemoMode } = useIssues();
  const [open, setOpen] = useState(false);

  const openNotification = (n: AppNotification) => {
    if (!n.read) markNotificationsRead([n.id]);
    const issue = issues.find((i) => i.id === n.issue.id);
    if (issue) {
      setSelectedIssue(issue);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-1.5 rounded-md text-gray-600 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-1 w-80 max-w-[calc(100vw-1.5rem)] bg-white border border-gray-200 rounded-lg shadow-xl z-50 text-xs animate-fade-in overflow-hidden"
            role="dialog"
            aria-label="Notifications"
            onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
              <span className="font-semibold text-gray-900">Notifications</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markNotificationsRead('all')}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-gray-400 font-mono text-[11px]">
                  {isDemoMode
                    ? 'In a real workspace, you are notified here when teammates assign, mention or update tickets.'
                    : 'Nothing yet. You will see assignments, mentions and updates to tickets you follow.'}
                </p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openNotification(n)}
                    className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-gray-50 transition-colors cursor-pointer ${
                      n.read ? '' : 'bg-blue-50/50'
                    }`}
                  >
                    <div className="pt-0.5 shrink-0">
                      <UserAvatar user={n.actor as any} size="sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-700 leading-snug">
                        <span className="font-semibold text-gray-900">{n.actor?.name || 'Someone'}</span>{' '}
                        {PHRASES[n.kind]}{' '}
                        <span className="font-mono font-semibold text-gray-900">{n.issue.code}</span>
                        {n.kind !== 'mentioned' && n.kind !== 'commented' && n.detail ? (
                          <span className="font-semibold text-gray-900"> {n.detail}</span>
                        ) : null}
                      </p>
                      <p className="truncate text-gray-500">{n.issue.title}</p>
                      {(n.kind === 'mentioned' || n.kind === 'commented') && n.detail && (
                        <p className="mt-0.5 line-clamp-2 text-gray-600 italic">“{n.detail}”</p>
                      )}
                      <p className="mt-0.5 text-[10px] font-mono text-gray-400">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" aria-label="Unread" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
