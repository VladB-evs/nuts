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
  Flag,
  CircleDot,
  UserRound,
  Building2,
  Type,
  Pencil,
  Link2,
  Sparkles,
} from 'lucide-react';
import { TicketLifecycleBar } from './TicketLifecycleBar';
import { PRIORITY_SLAS } from '../lib/timelineUtils';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../lib/issueOptions';
import { LinkedTicketsProperty } from './LinkedTicketsProperty';

const HISTORY_FIELD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Status: CircleDot,
  Priority: Flag,
  Assignee: UserRound,
  Department: Building2,
  Title: Type,
  'Linked Issue': Link2,
};

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
    issues,
  } = useIssues();

  const [commentText, setCommentText] = useState('');
  const [newStatus, setNewStatus] = useState<Status | ''>('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  const commentStatusOptions: SelectOption[] = useMemo(() => [
    { value: '', label: `(Keep current: ${selectedIssue?.status || ''})` },
    ...STATUS_OPTIONS,
  ], [selectedIssue?.status]);

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
    const activeOrCurrentUsers = users.filter(
      (u) => u.status !== 'departed' || u.id === selectedIssue?.assignee?.id
    );

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
      ...activeOrCurrentUsers.map((u) => {
        const isDeparted = u.status === 'departed';
        return {
          value: u.id,
          label: isDeparted ? `${u.name} (Former Member)` : u.name,
          badge: isDeparted ? 'Offboarded' : u.nickname ? `@${u.nickname}` : undefined,
          badgeClass: isDeparted
            ? 'bg-gray-100 text-gray-500 border-gray-300 font-mono text-[9px]'
            : 'bg-gray-50 text-gray-500 border-gray-200 font-mono text-[9px]',
          icon: <UserAvatar user={u} size="xs" />,
          description: isDeparted
            ? `Former Member • ${u.department}`
            : `${u.role || 'Member'} • ${u.department}`,
        };
      }),
    ];
  }, [users, selectedIssue?.assignee?.id]);

  const [activityFilter, setActivityFilter] = useState<'all' | 'comments' | 'history'>('all');

  type TimelineItem =
    | { type: 'comment'; id: string; createdAt: string; comment: Comment }
    | { type: 'history'; id: string; createdAt: string; history: HistoryEntry };

  const timelineItems: TimelineItem[] = useMemo(() => {
    if (!selectedIssue) return [];
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

  if (!selectedIssue) return null;

  const currentDept = departments.find((d) => d.id === selectedIssue.departmentId);
  const ruleKind = getDepartmentRuleKind(selectedIssue.departmentId);

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

  const renderPropertiesContent = () => (
    <div className="space-y-4">
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
          <span className="font-mono text-[10px] text-gray-500 bg-white px-1.5 py-0.2 rounded border border-gray-200">
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
                className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded text-gray-900 font-mono focus:outline-none focus:border-black"
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

      {/* Linked Tickets */}
      <LinkedTicketsProperty currentIssue={selectedIssue} />

      {/* Meta Info */}
      <div className="pt-3 border-t border-gray-200 text-[11px] font-mono text-gray-500 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Reporter:</span>
          <UserHoverCard user={selectedIssue.reporter}>
            <div className="inline-flex items-center gap-1.5 hover:text-black group/rep cursor-pointer">
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
  );

  return (
    <div className="flex-1 overflow-hidden bg-white flex flex-col h-full min-h-0">
      {/* Top Header */}
      <div className="px-3 sm:px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between text-xs shrink-0 select-none">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            onClick={() => setSelectedIssue(null)}
            className="flex items-center gap-1 text-gray-600 hover:text-black font-medium py-1 px-2 rounded hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">All Issues</span>
            <span className="sm:hidden">Back</span>
          </button>
          <span className="text-gray-300 shrink-0">/</span>
          <span className="font-mono font-bold text-gray-900 shrink-0">
            #{selectedIssue.number}
          </span>
          <span className="font-mono text-gray-400 truncate max-w-[120px] sm:max-w-none">
            ({selectedIssue.code})
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => toggleStar(selectedIssue.id)}
            className="p-1.5 text-gray-400 hover:text-amber-500 rounded hover:bg-gray-100 cursor-pointer transition-colors"
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
            className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100 cursor-pointer transition-colors"
            title="Delete issue"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Split Layout: Description & Comments on Left, Properties on Right */}
      <div className="flex-1 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-200 overflow-y-auto lg:overflow-hidden min-h-0 bg-white">
        {/* Left Column: Title, Description, Mobile Properties Card, Thread */}
        <div className="flex-1 min-w-0 p-3.5 sm:p-6 space-y-6 overflow-visible lg:overflow-y-auto min-h-0">
          {/* Title & Metadata */}
          <div className="space-y-2">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  className="w-full text-base sm:text-lg font-semibold text-gray-900 border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-black font-sans"
                />
                <button
                  onClick={handleSaveTitle}
                  className="px-3 py-1.5 bg-black text-white text-xs font-medium rounded shrink-0 cursor-pointer"
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
                className="text-base sm:text-lg font-bold text-gray-900 cursor-pointer hover:text-blue-700 break-words leading-snug"
                title="Click to edit title"
              >
                {selectedIssue.title}
              </h1>
            )}

            {/* Minimal metadata */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>Opened {timeAgo(selectedIssue.createdAt)} by</span>
              <UserHoverCard user={selectedIssue.reporter}>
                <div className="inline-flex items-center gap-1.5 hover:text-black cursor-pointer">
                  <UserAvatar user={selectedIssue.reporter} size="xs" />
                  <span className="font-medium text-gray-800 hover:underline">
                    {selectedIssue.reporter.name}
                  </span>
                </div>
              </UserHoverCard>
            </div>
          </div>


          {/* Description */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold block">
              Description
            </span>
            <div className="p-3.5 sm:p-4 rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap font-sans break-words">
              {selectedIssue.description || (
                <span className="text-gray-400 italic">No description provided.</span>
              )}
            </div>
          </div>

          {/* Mobile Properties Card (< lg) - SOLID, beautifully styled, non-seethrough */}
          <div className="lg:hidden bg-gray-50 border border-gray-200 rounded-lg p-3.5 sm:p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <span className="text-[11px] font-mono uppercase tracking-wider text-gray-700 font-bold">
                Ticket Properties
              </span>
              <span className="font-mono text-[10px] text-gray-500 bg-white border border-gray-200 px-1.5 py-0.2 rounded font-semibold">
                #{selectedIssue.number} • {selectedIssue.code}
              </span>
            </div>
            {renderPropertiesContent()}
          </div>

          {/* Activity / Comments & History Stream */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider font-mono">
                  Activity
                </span>
              </div>

              {/* Activity Filter Tabs */}
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded border border-gray-200 text-[11px] font-mono overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setActivityFilter('all')}
                  className={`px-2 py-0.5 rounded transition-colors shrink-0 cursor-pointer ${
                    activityFilter === 'all'
                      ? 'bg-white text-gray-900 font-semibold shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setActivityFilter('comments')}
                  className={`px-2 py-0.5 rounded transition-colors shrink-0 cursor-pointer ${
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
                  className={`px-2 py-0.5 rounded transition-colors shrink-0 cursor-pointer ${
                    activityFilter === 'history'
                      ? 'bg-white text-gray-900 font-semibold shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  History ({selectedIssue.history?.length || 0})
                </button>
              </div>
            </div>

            {/* Timeline Stream.
                Comments are full cards with a header bar; property changes are single
                muted lines with an icon, so the two read differently at a glance. */}
            {timelineItems.length > 0 ? (
              <div className="relative space-y-3">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gray-200" aria-hidden="true" />
                {timelineItems.map((item) => {
                  if (item.type === 'comment') {
                    const comment = item.comment;
                    return (
                      <div key={item.id} className="relative pl-9">
                        <div className="absolute left-0 top-1.5 rounded-full ring-4 ring-white bg-white">
                          <UserAvatar user={comment.author} size="md" />
                        </div>
                        <div className="rounded-lg border border-gray-300 bg-white text-xs shadow-2xs overflow-hidden">
                          <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-gray-100 border-b border-gray-200 text-gray-500">
                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                              <MessageSquare className="w-3 h-3 text-gray-400 shrink-0" />
                              <UserHoverCard user={comment.author}>
                                <span className="font-semibold text-gray-900 hover:underline cursor-pointer">
                                  {comment.author.name}
                                </span>
                              </UserHoverCard>
                              <span>commented</span>
                              {comment.statusChange && (
                                <span className="text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-medium text-[10px] font-mono shrink-0">
                                  {comment.statusChange}
                                </span>
                              )}
                            </div>
                            <span
                              title={formatDateTime(comment.createdAt)}
                              className="text-gray-400 text-[11px] font-mono shrink-0"
                            >
                              {timeAgo(comment.createdAt)}
                            </span>
                          </div>
                          {comment.text && (
                            <p className="px-3.5 py-3 text-[13px] text-gray-900 leading-relaxed font-sans whitespace-pre-wrap break-words">
                              {comment.text}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }

                  const hist = item.history;
                  const isCreation = hist.field === 'Issue';
                  const FieldIcon = isCreation ? Sparkles : HISTORY_FIELD_ICONS[hist.field] || Pencil;
                  return (
                    <div key={item.id} className="relative pl-9 min-h-[24px] flex items-center">
                      <div className="absolute left-[3px] top-0 w-[17px] h-[17px] mt-[3px] rounded-full bg-gray-100 border border-gray-300 ring-4 ring-white flex items-center justify-center">
                        <FieldIcon className="w-2.5 h-2.5 text-gray-500" />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-gray-500 min-w-0 w-full">
                        <UserHoverCard user={hist.actor}>
                          <span className="font-semibold text-gray-700 hover:underline cursor-pointer">
                            {hist.actor.name}
                          </span>
                        </UserHoverCard>
                        {isCreation ? (
                          <span>created this issue</span>
                        ) : (
                          <>
                            <span>changed</span>
                            <span className="font-medium text-gray-700">{hist.field}</span>
                            <span className="inline-flex flex-wrap items-center gap-1 font-mono text-[10px] bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded break-all">
                              <span className="text-gray-400 line-through">{hist.oldValue || '—'}</span>
                              <span className="text-gray-400">→</span>
                              <span className="font-semibold text-gray-800">{hist.newValue || '—'}</span>
                            </span>
                          </>
                        )}
                        <span
                          className="text-gray-400 font-mono ml-auto shrink-0"
                          title={formatDateTime(hist.createdAt)}
                        >
                          {timeAgo(hist.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-400 font-mono text-xs border border-dashed border-gray-200 rounded">
                No activity found for this filter.
              </div>
            )}

            {/* Comment Form (100% Mobile Responsive) */}
            <form onSubmit={handlePostComment} className="p-3 sm:p-3.5 border border-gray-200 rounded-md bg-gray-50 space-y-3">
              <textarea
                rows={3}
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full p-2.5 text-xs border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-500 leading-relaxed font-sans"
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs text-gray-500 font-mono shrink-0">Change status:</span>
                  <div className="flex-1 sm:w-56 sm:flex-none">
                    <CustomSelect
                      value={newStatus}
                      onChange={(val) => setNewStatus(val as Status | '')}
                      options={commentStatusOptions}
                      size="xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!commentText.trim() && !newStatus}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 text-xs font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-40 rounded transition-colors shadow-sm shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>

          {/* Ticket Lifecycle / SLA progression, below the comment box */}
          <div className="pt-0.5 pb-0.5">
            <TicketLifecycleBar issue={selectedIssue} compact={true} />
          </div>
        </div>

        {/* Right Column: Properties Sidebar (Desktop only >= lg) */}
        <aside className="hidden lg:block w-72 xl:w-80 p-5 xl:p-6 space-y-5 bg-gray-50 border-l border-gray-200 text-xs select-none shrink-0 overflow-y-auto min-h-0 [scrollbar-gutter:stable]">
          <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 font-bold block pb-2 border-b border-gray-200">
            Issue Properties
          </span>
          {renderPropertiesContent()}
        </aside>
      </div>
    </div>
  );
};
