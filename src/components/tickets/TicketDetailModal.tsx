import React, { useState } from 'react';
import { useTickets } from '../../context/TicketContext';
import { Priority, TicketStatus } from '../../types';
import { Modal } from '../common/Modal';
import { PriorityPill } from '../common/PriorityPill';
import { StatusBadge } from '../common/StatusBadge';
import { DepartmentBadge } from '../common/DepartmentBadge';
import { Avatar } from '../common/Avatar';
import { DepartmentFields } from './DepartmentFields';
import { formatDate, formatDateTime, timeAgo } from '../../lib/utils';
import {
  Calendar,
  Clock,
  Tag,
  Plus,
  Trash2,
  Send,
  Lock,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  History,
  ListCheck,
  X,
} from 'lucide-react';

export const TicketDetailModal: React.FC = () => {
  const {
    selectedTicket,
    setSelectedTicket,
    departments,
    users,
    currentUser,
    updateTicket,
    deleteTicket,
    moveTicketStatus,
    addComment,
    toggleChecklistItem,
    addChecklistItem,
    deleteChecklistItem,
  } = useTickets();

  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editedDesc, setEditedDesc] = useState('');

  if (!selectedTicket) return null;

  const department = departments.find((d) => d.id === selectedTicket.departmentId);

  const completedChecklist = selectedTicket.checklist.filter((c) => c.completed).length;
  const totalChecklist = selectedTicket.checklist.length;
  const progressPercent = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  const handleTitleSave = () => {
    if (editedTitle.trim()) {
      updateTicket(selectedTicket.id, { title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleDescSave = () => {
    updateTicket(selectedTicket.id, { description: editedDesc });
    setIsEditingDesc(false);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault();
      const cleanTag = newTagInput.trim().replace(/^#/, '');
      if (!selectedTicket.tags.includes(cleanTag)) {
        updateTicket(selectedTicket.id, {
          tags: [...selectedTicket.tags, cleanTag],
        });
      }
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateTicket(selectedTicket.id, {
      tags: selectedTicket.tags.filter((t) => t !== tagToRemove),
    });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addComment(selectedTicket.id, newComment.trim(), isInternalComment);
    setNewComment('');
  };

  const handleAddChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    addChecklistItem(selectedTicket.id, newChecklistText.trim());
    setNewChecklistText('');
  };

  return (
    <Modal
      isOpen={Boolean(selectedTicket)}
      onClose={() => setSelectedTicket(null)}
      maxWidth="4xl"
      title={
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-base font-bold text-white tracking-wide">
            {selectedTicket.code}
          </span>
          {department && <DepartmentBadge department={department} size="sm" />}
          <PriorityPill priority={selectedTicket.priority} size="sm" />
          <StatusBadge status={selectedTicket.status} size="sm" />
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Title, Description, Department Fields, Checklist, Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div>
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                  autoFocus
                  className="w-full px-2.5 py-1.5 text-base font-semibold bg-zinc-900 border border-zinc-700 rounded-lg text-white font-sans"
                />
                <button
                  onClick={handleTitleSave}
                  className="px-3 py-1.5 text-xs bg-white text-black rounded-lg font-mono font-medium"
                >
                  Save
                </button>
              </div>
            ) : (
              <h2
                onClick={() => {
                  setEditedTitle(selectedTicket.title);
                  setIsEditingTitle(true);
                }}
                className="text-lg font-semibold text-white cursor-pointer hover:text-zinc-200 transition-colors"
                title="Click to edit title"
              >
                {selectedTicket.title}
              </h2>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-medium">
                Description
              </span>
              {!isEditingDesc && (
                <button
                  onClick={() => {
                    setEditedDesc(selectedTicket.description);
                    setIsEditingDesc(true);
                  }}
                  className="text-xs font-mono text-zinc-400 hover:text-white"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditingDesc ? (
              <div className="space-y-2">
                <textarea
                  rows={4}
                  value={editedDesc}
                  onChange={(e) => setEditedDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono leading-relaxed"
                  placeholder="Add details, reproduction steps, acceptance criteria..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditingDesc(false)}
                    className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDescSave}
                    className="px-3 py-1 text-xs bg-white text-black rounded font-mono font-medium"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => {
                  setEditedDesc(selectedTicket.description);
                  setIsEditingDesc(true);
                }}
                className="text-xs text-zinc-300 bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-3 cursor-pointer hover:border-zinc-700 min-h-[60px] whitespace-pre-wrap leading-relaxed"
              >
                {selectedTicket.description || (
                  <span className="text-zinc-400 italic">
                    No description provided. Click to write details...
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Department Custom Attributes */}
          <DepartmentFields
            departmentId={selectedTicket.departmentId}
            customFields={selectedTicket.customFields}
            isEditing={false}
          />

          {/* Interactive Checklist / Subtasks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListCheck className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-medium">
                  Checklist & Tasks
                </span>
                {totalChecklist > 0 && (
                  <span className="text-xs font-mono text-zinc-400">
                    ({completedChecklist}/{totalChecklist})
                  </span>
                )}
              </div>
              {totalChecklist > 0 && (
                <span className="text-xs font-mono text-zinc-400">{progressPercent}%</span>
              )}
            </div>

            {totalChecklist > 0 && (
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-white h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            {/* Checklist Items */}
            <div className="space-y-1.5">
              {selectedTicket.checklist.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between p-2 rounded-lg bg-zinc-900/30 border border-zinc-800/60 hover:border-zinc-700 transition-colors"
                >
                  <label className="flex items-center gap-2.5 text-xs cursor-pointer flex-1 select-none">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleChecklistItem(selectedTicket.id, item.id)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-white focus:ring-0 cursor-pointer accent-white"
                    />
                    <span
                      className={
                        item.completed
                          ? 'text-zinc-400 line-through'
                          : 'text-zinc-200'
                      }
                    >
                      {item.text}
                    </span>
                  </label>

                  <button
                    onClick={() => deleteChecklistItem(selectedTicket.id, item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-400 transition-opacity"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add checklist input */}
            <form onSubmit={handleAddChecklist} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add subtask or acceptance check..."
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-zinc-600 font-mono"
              />
              <button
                type="submit"
                disabled={!newChecklistText.trim()}
                className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-lg font-mono transition-colors"
              >
                Add
              </button>
            </form>
          </div>

          {/* Comments & Activity Stream */}
          <div className="space-y-4 pt-4 border-t border-zinc-850">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-medium">
                Team Notes & Comments ({selectedTicket.comments.length})
              </span>
            </div>

            {/* Existing Comments */}
            <div className="space-y-3">
              {selectedTicket.comments.length === 0 ? (
                <p className="text-xs font-mono text-zinc-400 italic">
                  No comments yet. Leave a note below.
                </p>
              ) : (
                selectedTicket.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                      comment.isInternal
                        ? 'bg-amber-950/20 border-amber-900/40 text-amber-200/90'
                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar user={comment.author} size="xs" />
                        <span className="font-semibold text-white font-mono">
                          {comment.author.name}
                        </span>
                        {comment.isInternal && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.2 rounded">
                            <Lock className="w-2.5 h-2.5" /> Internal Only
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {timeAgo(comment.createdAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed pl-7">
                      {comment.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Post new comment */}
            <form onSubmit={handleAddComment} className="space-y-2 pt-2">
              <div className="relative">
                <textarea
                  rows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={
                    isInternalComment
                      ? 'Write a private internal note for the team...'
                      : 'Write a comment or update...'
                  }
                  className="w-full p-3 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-zinc-600 leading-relaxed font-sans"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isInternalComment}
                    onChange={(e) => setIsInternalComment(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-0"
                  />
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Internal note only</span>
                </label>

                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white text-black hover:bg-zinc-200 disabled:opacity-50 rounded-lg font-mono font-medium transition-colors"
                >
                  <Send className="w-3 h-3" />
                  <span>Comment</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 1 Column: Properties & Controls */}
        <div className="space-y-5 bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/80 text-xs">
          <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold border-b border-zinc-800 pb-2">
            Properties
          </p>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
              Status
            </label>
            <select
              value={selectedTicket.status}
              onChange={(e) =>
                moveTicketStatus(selectedTicket.id, e.target.value as TicketStatus)
              }
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 cursor-pointer"
            >
              <option value="backlog">Backlog</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
              Priority
            </label>
            <select
              value={selectedTicket.priority}
              onChange={(e) =>
                updateTicket(selectedTicket.id, {
                  priority: e.target.value as Priority,
                })
              }
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 cursor-pointer"
            >
              <option value="critical">Critical (Blocker)</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
              Department
            </label>
            <select
              value={selectedTicket.departmentId}
              onChange={(e) =>
                updateTicket(selectedTicket.id, {
                  departmentId: e.target.value,
                })
              }
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 cursor-pointer"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
              Assignee
            </label>
            <select
              value={selectedTicket.assignee?.id || 'unassigned'}
              onChange={(e) => {
                const user = users.find((u) => u.id === e.target.value) || null;
                updateTicket(selectedTicket.id, { assignee: user });
              }}
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-zinc-100 font-mono focus:outline-none focus:border-zinc-500 cursor-pointer"
            >
              <option value="unassigned">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.role}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
              Due Date
            </label>
            <input
              type="date"
              value={
                selectedTicket.dueDate
                  ? selectedTicket.dueDate.split('T')[0]
                  : ''
              }
              onChange={(e) =>
                updateTicket(selectedTicket.id, {
                  dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                })
              }
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Estimate Hours */}
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
              Estimate (Hours)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="e.g. 8"
              value={selectedTicket.estimateHours || ''}
              onChange={(e) =>
                updateTicket(selectedTicket.id, {
                  estimateHours: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-zinc-100 font-mono focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedTicket.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[11px] font-mono bg-zinc-800 border border-zinc-700 text-zinc-200 px-2 py-0.5 rounded"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Type tag & press Enter..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-750 rounded-lg text-zinc-200 placeholder-zinc-400 font-mono focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Reporter & Timestamps */}
          <div className="pt-3 border-t border-zinc-800 space-y-1.5 text-[10px] font-mono text-zinc-400">
            <p>
              Created by <span className="text-zinc-200">{selectedTicket.reporter.name}</span>
            </p>
            <p>Created: {formatDateTime(selectedTicket.createdAt)}</p>
            <p>Updated: {formatDateTime(selectedTicket.updatedAt)}</p>
          </div>

          {/* Bottom Actions: Mark Done / Delete */}
          <div className="pt-4 border-t border-zinc-800 space-y-2">
            {selectedTicket.status !== 'done' && (
              <button
                onClick={() => moveTicketStatus(selectedTicket.id, 'done')}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-mono font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Ticket as Done</span>
              </button>
            )}

            <button
              onClick={() => {
                if (confirm(`Permanently delete ${selectedTicket.code}?`)) {
                  deleteTicket(selectedTicket.id);
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-mono text-rose-400/80 hover:text-rose-400 hover:bg-rose-950/30 border border-rose-900/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Ticket</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
