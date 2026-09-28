import React, { useState } from 'react';
import { useTickets } from '../../context/TicketContext';
import { Priority, TicketStatus, ResolutionReason } from '../../types';
import { PriorityPill } from '../common/PriorityPill';
import { StatusBadge } from '../common/StatusBadge';
import { SlaBadge } from '../common/SlaBadge';
import { DepartmentBadge } from '../common/DepartmentBadge';
import { Avatar } from '../common/Avatar';
import { DepartmentFields } from '../tickets/DepartmentFields';
import { formatDate, formatDateTime, timeAgo } from '../../lib/utils';
import {
  Inbox,
  UserCheck,
  Building,
  CheckCircle2,
  Trash2,
  Send,
  Lock,
  MessageSquare,
  ListCheck,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  X,
  Plus,
} from 'lucide-react';
import { Modal } from '../common/Modal';

export const TicketingConsoleView: React.FC = () => {
  const {
    filteredTickets,
    selectedTicket,
    setSelectedTicket,
    departments,
    users,
    currentUser,
    changeStatus,
    assignTicketToMe,
    assignTicket,
    transferDepartment,
    resolveTicket,
    addComment,
    toggleChecklistItem,
    addChecklistItem,
    deleteChecklistItem,
    deleteTicket,
    setIsCreateModalOpen,
  } = useTickets();

  // State for Ticket Actions
  const [newCommentText, setNewCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Transfer modal state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [targetDeptId, setTargetDeptId] = useState('');
  const [transferNote, setTransferNote] = useState('');

  // Resolve modal state
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionReason, setResolutionReason] = useState<ResolutionReason>('resolved_fixed');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const currentDept = departments.find((d) => d.id === selectedTicket?.departmentId);
  const requesterDept = departments.find((d) => d.id === selectedTicket?.requesterDepartmentId);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newCommentText.trim()) return;
    addComment(selectedTicket.id, newCommentText.trim(), isInternalComment);
    setNewCommentText('');
  };

  const handleAddChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newChecklistText.trim()) return;
    addChecklistItem(selectedTicket.id, newChecklistText.trim());
    setNewChecklistText('');
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !targetDeptId) return;
    transferDepartment(selectedTicket.id, targetDeptId, transferNote.trim());
    setIsTransferModalOpen(false);
    setTargetDeptId('');
    setTransferNote('');
  };

  const handleExecuteResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    resolveTicket(selectedTicket.id, resolutionReason, resolutionNotes.trim());
    setIsResolveModalOpen(false);
    setResolutionNotes('');
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-7rem)] overflow-hidden">
      {/* ============================================================== */}
      {/* LEFT PANE: Dense Ticket Feed / Queue Stream                    */}
      {/* ============================================================== */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-zinc-800 bg-zinc-950/70 shrink-0 h-full overflow-hidden">
        {/* Stream Header */}
        <div className="p-3 border-b border-zinc-850 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
              Ticket Queue
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
              {filteredTickets.length}
            </span>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono bg-white text-black hover:bg-zinc-200 rounded font-medium transition-colors"
          >
            <Plus className="w-3 h-3 stroke-[2.5]" />
            <span>New</span>
          </button>
        </div>

        {/* Ticket List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-850/60 no-scrollbar">
          {filteredTickets.length > 0 ? (
            filteredTickets.map((ticket) => {
              const isSelected = selectedTicket?.id === ticket.id;
              const dept = departments.find((d) => d.id === ticket.departmentId);
              const rDept = departments.find((d) => d.id === ticket.requesterDepartmentId);

              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-3.5 cursor-pointer transition-all flex flex-col gap-2 relative ${
                    isSelected
                      ? 'bg-zinc-900 border-l-4 border-l-white text-white'
                      : 'hover:bg-zinc-900/50 text-zinc-300'
                  }`}
                >
                  {/* Top line: Code, Priority, SLA */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: dept?.color || '#ffffff' }}
                      />
                      <span className="font-mono text-xs font-bold text-white tracking-wide">
                        {ticket.code}
                      </span>
                      {dept && (
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">
                          [{dept.code}]
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <PriorityPill priority={ticket.priority} size="sm" showIcon={false} />
                      <SlaBadge deadline={ticket.slaDeadline} status={ticket.status} size="sm" />
                    </div>
                  </div>

                  {/* Title */}
                  <p className="text-xs font-medium line-clamp-2 leading-snug text-zinc-100">
                    {ticket.title}
                  </p>

                  {/* Submitter & Assigned line */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1">
                    <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                      <span className="text-zinc-500 text-[10px]">From:</span>
                      <span className="text-zinc-300 truncate">{ticket.reporter.name}</span>
                      {rDept && (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: rDept.color }}
                          title={`Requester Dept: ${rDept.name}`}
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={ticket.status} size="sm" />
                      <Avatar user={ticket.assignee} size="xs" />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center space-y-2">
              <Inbox className="w-8 h-8 text-zinc-600 mx-auto stroke-1" />
              <p className="font-mono text-xs text-zinc-400">Queue is clear</p>
              <p className="text-[11px] text-zinc-500">No tickets matching the current criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT PANE: The Active Ticket Inspection & Resolution Console  */}
      {/* ============================================================== */}
      {selectedTicket ? (
        <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
          {/* Action Toolbar */}
          <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between gap-3 flex-wrap">
            {/* Left: Quick identifiers */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => copyCode(selectedTicket.code)}
                className="flex items-center gap-1 font-mono text-sm font-bold text-white hover:text-zinc-300 px-2 py-1 rounded bg-zinc-950 border border-zinc-800 transition-colors"
                title="Copy ticket key"
              >
                <span>{selectedTicket.code}</span>
                {copiedCode ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-zinc-400" />
                )}
              </button>

              {currentDept && <DepartmentBadge department={currentDept} size="sm" />}
              <PriorityPill priority={selectedTicket.priority} size="sm" />
              <StatusBadge status={selectedTicket.status} size="sm" />
            </div>

            {/* Right: Ticketing Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Assign to me */}
              {selectedTicket.assignee?.id !== currentUser.id && (
                <button
                  onClick={() => assignTicketToMe(selectedTicket.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-700 transition-colors"
                  title="Assign this ticket to yourself"
                >
                  <UserCheck className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Assign to Me</span>
                </button>
              )}

              {/* Transfer Department */}
              <button
                onClick={() => setIsTransferModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 transition-colors"
                title="Re-route ticket to another department"
              >
                <Building className="w-3.5 h-3.5 text-zinc-400" />
                <span>Transfer Dept</span>
              </button>

              {/* Resolve / Close button */}
              {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' ? (
                <button
                  onClick={() => setIsResolveModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Resolve Ticket</span>
                </button>
              ) : (
                <button
                  onClick={() => changeStatus(selectedTicket.id, 'open')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded transition-colors"
                >
                  <span>Re-open Ticket</span>
                </button>
              )}

              {/* Delete */}
              <button
                onClick={() => {
                  if (confirm(`Permanently delete ${selectedTicket.code}?`)) {
                    deleteTicket(selectedTicket.id);
                  }
                }}
                className="p-1.5 text-zinc-400 hover:text-rose-400 rounded hover:bg-zinc-850 transition-colors"
                title="Delete ticket"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* SLA Tracking Bar */}
          <div className="px-4 py-2 bg-zinc-950 border-b border-zinc-850 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-3">
              <SlaBadge deadline={selectedTicket.slaDeadline} status={selectedTicket.status} size="sm" />
              <span className="text-zinc-400 text-[11px]">
                Target SLA Deadline: {formatDateTime(selectedTicket.slaDeadline)}
              </span>
            </div>
            <span className="text-zinc-500 text-[10px]">
              Created {timeAgo(selectedTicket.createdAt)}
            </span>
          </div>

          {/* Main Content Area: Split into Ticket Conversation Stream and Metadata Panel */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Center: Ticket Conversation & Details */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Title & Description */}
              <div className="space-y-3">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                  {selectedTicket.title}
                </h1>

                <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedTicket.description || (
                    <span className="text-zinc-500 italic">No description provided.</span>
                  )}
                </div>
              </div>

              {/* Department Specific Metadata */}
              <DepartmentFields
                departmentId={selectedTicket.departmentId}
                customFields={selectedTicket.customFields}
                isEditing={false}
              />

              {/* Checklist & Acceptance Tests */}
              {selectedTicket.checklist && (
                <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-medium">
                      <ListCheck className="w-3.5 h-3.5" /> Tasks & Verification
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
                      {selectedTicket.checklist.filter((c) => c.completed).length}/
                      {selectedTicket.checklist.length}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {selectedTicket.checklist.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center justify-between p-2 rounded-lg bg-zinc-900/40 border border-zinc-850 hover:border-zinc-700"
                      >
                        <label className="flex items-center gap-2.5 text-xs cursor-pointer flex-1 select-none">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => toggleChecklistItem(selectedTicket.id, item.id)}
                            className="rounded border-zinc-700 bg-zinc-800 text-white focus:ring-0 accent-white"
                          />
                          <span
                            className={
                              item.completed
                                ? 'text-zinc-500 line-through'
                                : 'text-zinc-200'
                            }
                          >
                            {item.text}
                          </span>
                        </label>
                        <button
                          onClick={() => deleteChecklistItem(selectedTicket.id, item.id)}
                          className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 p-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add task inline */}
                  <form onSubmit={handleAddChecklist} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add subtask or verification check..."
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 font-mono focus:outline-none focus:border-zinc-600"
                    />
                    <button
                      type="submit"
                      disabled={!newChecklistText.trim()}
                      className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-white rounded font-mono disabled:opacity-50"
                    >
                      Add
                    </button>
                  </form>
                </div>
              )}

              {/* Correspondence Stream: Requester Messages, Agent Replies, Internal Notes */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Correspondence & Ticket Thread ({selectedTicket.comments.length})
                  </span>
                </div>

                {/* Timeline */}
                <div className="space-y-3">
                  {selectedTicket.comments.length === 0 ? (
                    <p className="text-xs font-mono text-zinc-500 italic py-2">
                      No replies on this ticket yet.
                    </p>
                  ) : (
                    selectedTicket.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                          comment.isResolution
                            ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                            : comment.isInternal
                            ? 'bg-amber-950/20 border-amber-800/40 text-amber-200/90'
                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar user={comment.author} size="xs" />
                            <span className="font-semibold text-white font-mono">
                              {comment.author.name}
                            </span>
                            <span className="text-zinc-500 font-mono text-[10px]">
                              ({comment.author.role})
                            </span>
                            {comment.isInternal && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.2 rounded">
                                <Lock className="w-2.5 h-2.5" /> Internal Note
                              </span>
                            )}
                            {comment.isResolution && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded font-bold">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Resolution
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {timeAgo(comment.createdAt)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed pl-7 font-sans">
                          {comment.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Response Composer */}
                <form
                  onSubmit={handleSendComment}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 space-y-2.5"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-800/60">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsInternalComment(false)}
                        className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                          !isInternalComment
                            ? 'bg-zinc-800 text-white font-medium border border-zinc-700'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Public Response
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsInternalComment(true)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                          isInternalComment
                            ? 'bg-amber-950/60 text-amber-300 font-medium border border-amber-800'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>Internal Note</span>
                      </button>
                    </div>

                    <span className="text-[10px] font-mono text-zinc-500">
                      Replying as <strong className="text-zinc-300">{currentUser.name}</strong>
                    </span>
                  </div>

                  <textarea
                    rows={3}
                    placeholder={
                      isInternalComment
                        ? 'Write an internal note visible only to support & engineering...'
                        : 'Write a response to the requester...'
                    }
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="w-full p-2.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 font-sans leading-relaxed"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1">
                      {/* Macro quick reply suggestions */}
                      <button
                        type="button"
                        onClick={() =>
                          setNewCommentText(
                            'We are currently investigating the issue and running reproductions in staging. We will update you shortly.'
                          )
                        }
                        className="text-[10px] font-mono text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-850 border border-zinc-750"
                      >
                        + Under Investigation
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setNewCommentText(
                            'Hotfix has been merged and deployed to production. Could you please confirm if this is resolved on your end?'
                          )
                        }
                        className="text-[10px] font-mono text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-850 border border-zinc-750"
                      >
                        + Fix Deployed
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={!newCommentText.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-mono font-medium bg-white text-black hover:bg-zinc-200 disabled:opacity-40 rounded shadow transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isInternalComment ? 'Save Note' : 'Send Response'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right: Requester & Ticket Properties Sidebar */}
            <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-950 p-4 space-y-5 overflow-y-auto no-scrollbar shrink-0 text-xs">
              {/* Requester Profile Card */}
              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-2.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold block">
                  Requester / Submitter
                </span>
                <div className="flex items-center gap-2.5">
                  <Avatar user={selectedTicket.reporter} size="md" />
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{selectedTicket.reporter.name}</p>
                    <p className="text-[10px] text-zinc-400 font-mono truncate">
                      {selectedTicket.reporter.email}
                    </p>
                  </div>
                </div>
                {requesterDept && (
                  <div className="pt-1.5 border-t border-zinc-850 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-zinc-500">Department:</span>
                    <span className="text-zinc-200 font-medium">{requesterDept.name}</span>
                  </div>
                )}
              </div>

              {/* Ticket Assignment */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-zinc-400">Assignee</label>
                <select
                  value={selectedTicket.assignee?.id || 'unassigned'}
                  onChange={(e) => {
                    const u = users.find((user) => user.id === e.target.value) || null;
                    assignTicket(selectedTicket.id, u);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-750 rounded-lg text-white font-mono focus:outline-none cursor-pointer"
                >
                  <option value="unassigned">Unassigned (Triage)</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-zinc-400">Status</label>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => changeStatus(selectedTicket.id, e.target.value as TicketStatus)}
                  className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-750 rounded-lg text-white font-mono focus:outline-none cursor-pointer"
                >
                  <option value="new">New / Triage</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="pending">Waiting on Info</option>
                  <option value="escalated">Escalated</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {/* Department Route */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-zinc-400">
                  Assigned Team
                </label>
                <div className="p-2 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: currentDept?.color }}
                    />
                    <span className="font-mono text-white">{currentDept?.name}</span>
                  </div>
                  <button
                    onClick={() => setIsTransferModalOpen(true)}
                    className="text-[10px] font-mono text-zinc-400 hover:text-white underline"
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-zinc-400">Priority</label>
                <PriorityPill priority={selectedTicket.priority} size="md" />
              </div>

              {/* Ticket Type */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-zinc-400">Ticket Type</label>
                <span className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-zinc-900 border border-zinc-800 text-zinc-300 capitalize">
                  {selectedTicket.type.replace('_', ' ')}
                </span>
              </div>

              {/* Resolution details (if resolved) */}
              {selectedTicket.resolutionReason && (
                <div className="p-3 rounded-lg border border-emerald-900/40 bg-emerald-950/20 space-y-1 font-mono text-[11px]">
                  <span className="text-emerald-400 font-semibold block">Resolution Status</span>
                  <p className="text-zinc-200 capitalize">
                    {selectedTicket.resolutionReason.replace('_', ' ')}
                  </p>
                  {selectedTicket.resolutionNotes && (
                    <p className="text-zinc-400 italic text-[10px]">
                      "{selectedTicket.resolutionNotes}"
                    </p>
                  )}
                </div>
              )}

              {/* Audit Timestamps */}
              <div className="pt-3 border-t border-zinc-850 text-[10px] font-mono text-zinc-500 space-y-1">
                <p>Created: {formatDateTime(selectedTicket.createdAt)}</p>
                <p>Updated: {formatDateTime(selectedTicket.updatedAt)}</p>
                {selectedTicket.resolvedAt && (
                  <p className="text-emerald-400">
                    Resolved: {formatDateTime(selectedTicket.resolvedAt)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 text-center text-zinc-500 font-mono text-xs">
          Select a ticket from the queue to view details and triage.
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: Transfer Department                                      */}
      {/* ============================================================== */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transfer Ticket to Another Department"
        description="Re-route this ticket to another team's triage queue"
        maxWidth="md"
      >
        <form onSubmit={handleExecuteTransfer} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              Select Destination Department *
            </label>
            <select
              required
              value={targetDeptId}
              onChange={(e) => setTargetDeptId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono focus:outline-none"
            >
              <option value="">-- Choose department --</option>
              {departments
                .filter((d) => d.id !== selectedTicket?.departmentId)
                .map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              Transfer Note / Context
            </label>
            <textarea
              rows={3}
              placeholder="Explain why this ticket is being reassigned..."
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 font-mono focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!targetDeptId}
              className="px-4 py-1.5 text-xs font-mono font-medium bg-white text-black hover:bg-zinc-200 rounded disabled:opacity-40"
            >
              Transfer Ticket
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: Resolve Ticket                                          */}
      {/* ============================================================== */}
      <Modal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        title="Resolve Ticket"
        description="Mark this service ticket as resolved and notify the requester"
        maxWidth="md"
      >
        <form onSubmit={handleExecuteResolve} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              Resolution Reason *
            </label>
            <select
              value={resolutionReason}
              onChange={(e) => setResolutionReason(e.target.value as ResolutionReason)}
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono focus:outline-none"
            >
              <option value="resolved_fixed">Resolved — Fix / Deliverable Completed</option>
              <option value="resolved_explained">Resolved — Information Provided</option>
              <option value="duplicate">Closed — Duplicate Ticket</option>
              <option value="cannot_reproduce">Closed — Cannot Reproduce</option>
              <option value="wont_fix">Closed — Won't Fix / Out of Scope</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              Resolution Summary
            </label>
            <textarea
              rows={3}
              placeholder="Describe the solution or rationale for the requester..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 font-mono focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setIsResolveModalOpen(false)}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-mono font-medium bg-emerald-500 text-black hover:bg-emerald-400 rounded transition-colors"
            >
              Confirm Resolution
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
