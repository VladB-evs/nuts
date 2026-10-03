import React, { useState, useMemo } from 'react';
import { useIssues } from '../context/TicketContext';
import {
  Priority,
  Status,
  Environment,
  DevScope,
  MarketingChannel,
  DeliverableType,
  DealSegment,
  DealStage,
  OpsCategory,
  ImpactLevel,
  Comment,
  HistoryEntry,
} from '../types';
import {
  getDepartmentRuleKind,
  getDepartmentBadges,
  MARKETING_CHANNELS,
  DELIVERABLE_TYPES,
  DEAL_SEGMENTS,
  DEAL_STAGES,
  OPS_CATEGORIES,
  IMPACT_LEVELS,
} from '../lib/departmentRules';
import { UserAvatar } from './UserAvatar';
import { UserHoverCard } from './UserHoverCard';
import { CustomSelect, SelectOption } from './CustomSelect';
import { formatDateTime, timeAgo } from '../lib/utils';
import {
  ArrowLeft,
  Star,
  Trash2,
  Send,
  MessageSquare,
  Clock,
  User,
  History,
} from 'lucide-react';
import { TicketLifecycleBar } from './TicketLifecycleBar';
import { PRIORITY_SLAS } from '../lib/timelineUtils';

export const IssueDetail: React.FC = () => {
  const {
    selectedIssue,
    setSelectedIssue,
    updateIssue,
    addComment,
    toggleStar,
    deleteIssue,
    departments,
    currentUser,
    users,
  } = useIssues();

  const [commentText, setCommentText] = useState('');
  const [newStatus, setNewStatus] = useState<Status | ''>('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  if (!selectedIssue) return null;

  const currentDept = departments.find((d) => d.id === selectedIssue.departmentId);
  const ruleKind = getDepartmentRuleKind(selectedIssue.departmentId);

  const STATUS_OPTIONS: SelectOption[] = [
    { value: 'NEW', label: 'NEW', badge: 'NEW', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'ASSIGNED', label: 'ASSIGNED', badge: 'ASSIGNED', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { value: 'ACCEPTED', label: 'ACCEPTED', badge: 'ACCEPTED', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
    { value: 'FIXED', label: 'FIXED', badge: 'FIXED', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { value: 'VERIFIED', label: 'VERIFIED', badge: 'VERIFIED', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200' },
    { value: 'CLOSED', label: 'CLOSED', badge: 'CLOSED', badgeClass: 'bg-gray-100 text-gray-700 border-gray-300' },
  ];

  const commentStatusOptions: SelectOption[] = useMemo(() => [
    { value: '', label: `(Keep current: ${selectedIssue.status})` },
    ...STATUS_OPTIONS,
  ], [selectedIssue.status]);

  const PRIORITY_OPTIONS: SelectOption[] = [
    {
      value: 'P0',
      label: 'P0 — Blocker (24h SLA)',
      badge: 'P0',
      badgeClass: 'bg-red-50 text-red-700 border-red-200 font-bold',
      description: '24h Stage SLA • 48h Resolution target',
    },
    {
      value: 'P1',
      label: 'P1 — Critical (3d SLA)',
      badge: 'P1',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
      description: '3d Stage SLA • 7d Resolution target',
    },
    {
      value: 'P2',
      label: 'P2 — Major (7d SLA)',
      badge: 'P2',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      description: '7d Stage SLA • 14d Resolution target',
    },
    {
      value: 'P3',
      label: 'P3 — Minor (14d SLA)',
      badge: 'P3',
      badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
      description: '14d Stage SLA • 30d Resolution target',
    },
  ];

  const departmentOptions: SelectOption[] = useMemo(() => {
    return departments.map((dept) => ({
      value: dept.id,
      label: dept.name,
      badge: dept.code,
      badgeClass: 'bg-gray-100 text-gray-800 border-gray-300 font-mono',
      description: dept.description,
    }));
  }, [departments]);

  const assigneeOptions: SelectOption[] = useMemo(() => {
    return [
      {
        value: 'unassigned',
        label: 'Unassigned',
        icon: (
          <span className="w-4 h-4 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-[10px] text-gray-400 font-mono">
            —
          </span>
        ),
        description: 'Ticket is unassigned / in triage queue',
      },
      ...users.map((u) => ({
        value: u.id,
        label: u.name,
        badge: u.nickname ? `@${u.nickname}` : undefined,
        badgeClass: 'bg-gray-50 text-gray-500 border-gray-200 font-mono text-[9px]',
        icon: <UserAvatar user={u} size="xs" />,
        description: `${u.role || 'Member'} • ${u.department}`,
      })),
    ];
  }, [users]);

  const [activityFilter, setActivityFilter] = useState<'all' | 'comments' | 'history'>('all');

  type TimelineItem =
    | { type: 'comment'; id: string; createdAt: string; comment: Comment }
    | { type: 'history'; id: string; createdAt: string; history: HistoryEntry };

  const timelineItems: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];
    if (activityFilter === 'all' || activityFilter === 'comments') {
      (selectedIssue.comments || []).forEach((c) => {
        items.push({ type: 'comment', id: c.id, createdAt: c.createdAt, comment: c });
      });
    }
    if (activityFilter === 'all' || activityFilter === 'history') {
      (selectedIssue.history || []).forEach((h) => {
        items.push({ type: 'history', id: h.id, createdAt: h.createdAt, history: h });
      });
    }
    return items.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [selectedIssue, activityFilter]);

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && !newStatus) return;

    addComment(
      selectedIssue.id,
      commentText.trim(),
      newStatus ? (newStatus as Status) : undefined
    );

    setCommentText('');
    setNewStatus('');
  };

  const handleSaveTitle = () => {
    if (titleInput.trim()) {
      updateIssue(selectedIssue.id, { title: titleInput.trim() });
    }
    setIsEditingTitle(false);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white flex flex-col">
      {/* Top Header */}
      <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between text-xs sticky top-0 z-10 select-none">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedIssue(null)}
            className="flex items-center gap-1 text-gray-600 hover:text-black font-medium py-1 px-2 rounded hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Issues</span>
          </button>
          <span className="text-gray-300">/</span>
          <span className="font-mono font-bold text-gray-900">
            #{selectedIssue.number}
          </span>
          <span className="font-mono text-gray-400">({selectedIssue.code})</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleStar(selectedIssue.id)}
            className="p-1 text-gray-400 hover:text-amber-500 rounded hover:bg-gray-100"
            title="Star issue"
          >
            <Star
              className={`w-4 h-4 ${
                selectedIssue.starred ? 'text-amber-400 fill-amber-400' : ''
              }`}
            />
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete issue #${selectedIssue.number}?`)) {
                deleteIssue(selectedIssue.id);
              }
            }}
            className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100"
            title="Delete issue"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Split Layout: Description & Comments on Left, Properties on Right */}
      <div className="flex-1 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-200 overflow-hidden">
        {/* Left Column: Title, Description, Thread */}
        <div className="flex-1 min-w-0 p-6 space-y-6 overflow-y-auto">
          {/* Title */}
          <div>
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  className="w-full text-base font-semibold text-gray-900 border border-gray-300 rounded px-2 py-1 focus:outline-none"
                />
                <button
                  onClick={handleSaveTitle}
                  className="px-3 py-1 bg-black text-white text-xs font-medium rounded"
                >
                  Save
                </button>
              </div>
            ) : (
              <h1
                onClick={() => {
                  setTitleInput(selectedIssue.title);
                  setIsEditingTitle(true);
                }}
                className="text-lg font-bold text-gray-900 cursor-pointer hover:text-blue-700"
                title="Click to edit title"
              >
                {selectedIssue.title}
              </h1>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 font-mono flex-wrap">
              <span className="font-semibold text-gray-800 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-[11px]">
                {currentDept?.name || selectedIssue.departmentId}
              </span>
              {getDepartmentBadges(selectedIssue, departments).map((badge, idx) => (
                <span
                  key={idx}
                  className={`font-semibold border px-2 py-0.5 rounded text-[11px] ${badge.badgeClass}`}
                  title={badge.tooltip}
                >
                  {badge.label}
                </span>
              ))}
              <span>•</span>
              <div className="inline-flex items-center gap-1.5 font-sans">
                <span className="text-gray-400 font-mono text-[11px]">Reported by</span>
                <UserHoverCard user={selectedIssue.reporter}>
                  <div className="inline-flex items-center gap-1.5 hover:text-black group/reporter">
                    <UserAvatar user={selectedIssue.reporter} size="xs" />
                    <span className="font-semibold text-gray-900 group-hover/reporter:underline decoration-dotted decoration-gray-400">
                      {selectedIssue.reporter.name}
                    </span>
                    {selectedIssue.reporter.nickname && (
                      <span className="text-gray-400 font-mono text-[10px]">
                        @{selectedIssue.reporter.nickname}
                      </span>
                    )}
                  </div>
                </UserHoverCard>
                {selectedIssue.reporter.role && (
                  <span className="text-[10px] text-gray-600 bg-gray-100 border border-gray-200 px-1 py-0.2 rounded font-mono">
                    {selectedIssue.reporter.role}
                  </span>
                )}
              </div>
              <span>•</span>
              <span>{formatDateTime(selectedIssue.createdAt)}</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold block">
              Description
            </span>
            <div className="p-4 rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
              {selectedIssue.description || (
                <span className="text-gray-400 italic">No description provided.</span>
              )}
            </div>
          </div>

          {/* Ticket Lifecycle Progression (Compact & Out of the way) */}
          <div className="pt-1 pb-1">
            <TicketLifecycleBar issue={selectedIssue} compact={true} />
          </div>

          {/* Activity / Comments & History Stream */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider font-mono">
                  Activity & Audit Log ({(selectedIssue.comments?.length || 0) + (selectedIssue.history?.length || 0)})
                </span>
              </div>

              {/* Activity Filter Tabs */}
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded border border-gray-200 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setActivityFilter('all')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    activityFilter === 'all'
                      ? 'bg-white text-gray-900 font-semibold shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  All ({(selectedIssue.comments?.length || 0) + (selectedIssue.history?.length || 0)})
                </button>
                <button
                  type="button"
                  onClick={() => setActivityFilter('comments')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    activityFilter === 'comments'
                      ? 'bg-white text-gray-900 font-semibold shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Comments ({selectedIssue.comments?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActivityFilter('history')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    activityFilter === 'history'
                      ? 'bg-white text-gray-900 font-semibold shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  History ({selectedIssue.history?.length || 0})
                </button>
              </div>
            </div>

            {/* Timeline Stream */}
            <div className="space-y-2.5">
              {timelineItems.length > 0 ? (
                timelineItems.map((item) => {
                  if (item.type === 'comment') {
                    const comment = item.comment;
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-md border border-gray-200 bg-white text-xs space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-gray-500 font-mono text-[11px] flex-wrap gap-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <UserHoverCard user={comment.author}>
                              <div className="inline-flex items-center gap-1.5 hover:text-black group/author">
                                <UserAvatar user={comment.author} size="xs" />
                                <span className="font-semibold text-gray-900 font-sans group-hover/author:underline decoration-dotted decoration-gray-400">
                                  {comment.author.name}
                                </span>
                                {comment.author.nickname && (
                                  <span className="text-gray-400 font-mono text-[10px]">
                                    @{comment.author.nickname}
                                  </span>
                                )}
                              </div>
                            </UserHoverCard>
                            <span className="text-[10px] text-gray-600 bg-gray-100 border border-gray-200 px-1.5 py-0.2 rounded font-mono">
                              {comment.author.role ? `${comment.author.role} • ${comment.author.department}` : comment.author.department}
                            </span>
                            {comment.statusChange && (
                              <span className="text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-medium text-[10px] font-mono">
                                {comment.statusChange}
                              </span>
                            )}
                          </div>
                          <span title={formatDateTime(comment.createdAt)} className="text-gray-400 text-[10px]">
                            {timeAgo(comment.createdAt)}
                          </span>
                        </div>
                        {comment.text && (
                          <p className="text-gray-800 leading-relaxed font-sans pl-6 whitespace-pre-wrap">
                            {comment.text}
                          </p>
                        )}
                      </div>
                    );
                  }

                  const hist = item.history;
                  return (
                    <div
                      key={item.id}
                      className="px-3.5 py-2.5 rounded-md border border-gray-200 bg-gray-50/70 text-xs flex items-start gap-2.5 transition-colors hover:bg-gray-50"
                    >
                      <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5">
                        <UserHoverCard user={hist.actor}>
                          <UserAvatar user={hist.actor} size="xs" />
                        </UserHoverCard>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[11px] font-mono text-gray-500 mb-1 flex-wrap gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <UserHoverCard user={hist.actor}>
                              <div className="inline-flex items-center gap-1 hover:text-black group/actor">
                                <span className="font-semibold text-gray-900 font-sans group-hover/actor:underline decoration-dotted decoration-gray-400">
                                  {hist.actor.name}
                                </span>
                                {hist.actor.nickname && (
                                  <span className="text-gray-400 font-mono text-[10px]">
                                    @{hist.actor.nickname}
                                  </span>
                                )}
                              </div>
                            </UserHoverCard>
                            <span className="text-gray-400 text-[10px]">
                              ({hist.actor.role ? `${hist.actor.role}, ${hist.actor.department}` : hist.actor.department})
                            </span>
                            <span className="text-gray-600">
                              {hist.field === 'Issue'
                                ? 'created this issue'
                                : `changed ${hist.field}`}
                            </span>
                          </div>
                          <span
                            className="text-gray-400 text-[10px]"
                            title={formatDateTime(hist.createdAt)}
                          >
                            {formatDateTime(hist.createdAt)} ({timeAgo(hist.createdAt)})
                          </span>
                        </div>
                        {hist.field !== 'Issue' ? (
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-gray-700 bg-white border border-gray-200 px-2 py-0.5 rounded inline-flex flex-wrap">
                            <span className="text-gray-500 line-through">
                              {hist.oldValue}
                            </span>
                            <span className="text-gray-400 font-bold">→</span>
                            <span className="font-semibold text-gray-900">
                              {hist.newValue}
                            </span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-600 font-mono">
                            {hist.message}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-gray-400 font-mono text-xs border border-dashed border-gray-200 rounded">
                  No activity found for this filter.
                </div>
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handlePostComment} className="p-3.5 border border-gray-200 rounded-md bg-gray-50 space-y-3">
              <textarea
                rows={3}
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full p-2.5 text-xs border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-500 leading-relaxed"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-mono">Change status to:</span>
                  <CustomSelect
                    value={newStatus}
                    onChange={(val) => setNewStatus(val as Status | '')}
                    options={commentStatusOptions}
                    className="w-56"
                    size="xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!commentText.trim() && !newStatus}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-40 rounded transition-colors shadow-sm"
                >
                  <Send className="w-3 h-3" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Properties Sidebar */}
        <div className="w-full lg:w-72 xl:w-80 p-6 space-y-5 bg-gray-50/50 text-xs select-none shrink-0 overflow-y-auto">
          <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold block pb-2 border-b border-gray-100">
            Issue Properties
          </span>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono text-gray-500">Status</label>
            <CustomSelect
              value={selectedIssue.status}
              onChange={(val) =>
                updateIssue(selectedIssue.id, { status: val as Status })
              }
              options={STATUS_OPTIONS}
            />
          </div>

          {/* Priority with Visible SLA Property */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-mono text-gray-500">Priority</label>
              <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded border border-gray-200">
                SLA: {PRIORITY_SLAS[selectedIssue.priority]?.stageMaxFormatted} max
              </span>
            </div>
            <CustomSelect
              value={selectedIssue.priority}
              onChange={(val) =>
                updateIssue(selectedIssue.id, { priority: val as Priority })
              }
              options={PRIORITY_OPTIONS}
            />
          </div>

          {/* Department Specific Properties */}
          {currentDept?.customFields && currentDept.customFields.length > 0 &&
            currentDept.customFields.map((field) => {
              const currentVal =
                selectedIssue.customAttributes?.[field.id] !== undefined
                  ? selectedIssue.customAttributes[field.id]
                  : (selectedIssue as any)[field.id] ?? field.defaultValue ?? field.options?.[0] ?? '';

              if (field.type === 'select') {
                return (
                  <div key={field.id} className="space-y-1.5">
                    <label className="block text-[11px] font-mono text-gray-500">{field.name}</label>
                    <CustomSelect
                      value={currentVal}
                      onChange={(newVal) => {
                        const updates: any = {
                          customAttributes: {
                            ...(selectedIssue.customAttributes || {}),
                            [field.id]: newVal,
                          },
                        };
                        if (field.id === 'issueType') updates.issueType = newVal;
                        if (field.id === 'environment') updates.environment = newVal;
                        if (field.id === 'marketingChannel') updates.marketingChannel = newVal;
                        if (field.id === 'deliverableType') updates.deliverableType = newVal;
                        if (field.id === 'dealSegment') updates.dealSegment = newVal;
                        if (field.id === 'dealStage') updates.dealStage = newVal;
                        if (field.id === 'opsCategory') updates.opsCategory = newVal;
                        if (field.id === 'impactLevel') updates.impactLevel = newVal;
                        if (field.id === 'devScope') {
                          updates.devScope = newVal.toLowerCase().includes('both')
                            ? 'both'
                            : newVal.toLowerCase().includes('front')
                            ? 'frontend'
                            : 'backend';
                        }
                        updateIssue(selectedIssue.id, updates);
                      }}
                      options={field.options || []}
                    />
                  </div>
                );
              }

              return (
                <div key={field.id} className="space-y-1.5">
                  <label className="block text-[11px] font-mono text-gray-500">{field.name}</label>
                  <input
                    type="text"
                    defaultValue={currentVal}
                    onBlur={(e) => {
                      if (e.target.value !== currentVal) {
                        updateIssue(selectedIssue.id, {
                          customAttributes: {
                            ...(selectedIssue.customAttributes || {}),
                            [field.id]: e.target.value,
                          },
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-gray-900 font-mono focus:outline-none"
                  />
                </div>
              );
            })}

          {/* Department */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono text-gray-500">Department</label>
            <CustomSelect
              value={selectedIssue.departmentId}
              onChange={(newDeptId) => {
                const newDept = departments.find((d) => d.id === newDeptId);
                const updates: any = { departmentId: newDeptId };
                if (newDept) {
                  updates.code = `${newDept.code}-${selectedIssue.number}`;
                }
                updateIssue(selectedIssue.id, updates);
              }}
              options={departmentOptions}
            />
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono text-gray-500">Assignee</label>
            {selectedIssue.assignee && (
              <UserHoverCard user={selectedIssue.assignee} className="w-full">
                <div className="w-full p-2 bg-white border border-gray-200 rounded flex items-center gap-2 mb-1.5 shadow-2xs hover:border-gray-400 transition-colors cursor-pointer">
                  <UserAvatar user={selectedIssue.assignee} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-gray-900 text-xs truncate">
                        {selectedIssue.assignee.name}
                      </span>
                      {selectedIssue.assignee.nickname && (
                        <span className="text-gray-400 font-mono text-[10px]">
                          @{selectedIssue.assignee.nickname}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 font-mono truncate">
                      {selectedIssue.assignee.role || 'Member'} • {selectedIssue.assignee.department}
                    </p>
                  </div>
                </div>
              </UserHoverCard>
            )}
            <CustomSelect
              value={selectedIssue.assignee?.id || 'unassigned'}
              onChange={(val) => {
                const u = users.find((user) => user.id === val) || null;
                updateIssue(selectedIssue.id, {
                  assignee: u,
                  status: selectedIssue.status === 'NEW' && u ? 'ASSIGNED' : selectedIssue.status,
                });
              }}
              options={assigneeOptions}
              searchable={users.length > 5}
            />
          </div>

          {/* Meta Info */}
          <div className="pt-4 border-t border-gray-200 text-[11px] font-mono text-gray-500 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Reporter:</span>
              <UserHoverCard user={selectedIssue.reporter}>
                <div className="inline-flex items-center gap-1.5 hover:text-black group/rep">
                  <UserAvatar user={selectedIssue.reporter} size="xs" />
                  <span className="font-semibold text-gray-800 font-sans group-hover/rep:underline decoration-dotted decoration-gray-400">
                    {selectedIssue.reporter.name}
                  </span>
                  {selectedIssue.reporter.nickname && (
                    <span className="text-gray-400 font-mono text-[10px]">
                      @{selectedIssue.reporter.nickname}
                    </span>
                  )}
                </div>
              </UserHoverCard>
            </div>
            <p>Created: {formatDateTime(selectedIssue.createdAt)}</p>
            <p>Modified: {formatDateTime(selectedIssue.updatedAt)}</p>
            <p>
              Audit Log: <strong className="text-gray-800">{selectedIssue.history?.length || 0} revisions</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
