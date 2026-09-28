import React, { useState } from 'react';
import { useIssues } from '../context/TicketContext';
import { Priority, Status, Environment, DevScope } from '../types';
import { USERS } from '../data/mockData';
import { formatDateTime, timeAgo } from '../lib/utils';
import {
  ArrowLeft,
  Star,
  Trash2,
  Send,
  MessageSquare,
  Clock,
  User,
} from 'lucide-react';

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
  } = useIssues();

  const [commentText, setCommentText] = useState('');
  const [newStatus, setNewStatus] = useState<Status | ''>('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  if (!selectedIssue) return null;

  const currentDept = departments.find((d) => d.id === selectedIssue.departmentId);

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
              <span className="font-bold text-gray-900 bg-gray-100 border border-gray-300 px-2 py-0.5 rounded text-[11px]">
                {selectedIssue.environment}
              </span>
              {selectedIssue.devScope && (
                <span className="font-medium text-gray-800 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-[11px]">
                  {selectedIssue.devScope === 'both'
                    ? 'Frontend + Backend'
                    : selectedIssue.devScope === 'frontend'
                    ? 'Frontend'
                    : 'Backend'}
                </span>
              )}
              <span>•</span>
              <span>Reported by {selectedIssue.reporter.name}</span>
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

          {/* Activity / Comments Stream */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider font-mono">
                Comments & History ({selectedIssue.comments.length})
              </span>
            </div>

            <div className="space-y-3">
              {selectedIssue.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-3.5 rounded-md border border-gray-200 bg-white text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-gray-500 font-mono text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {comment.author.name}
                      </span>
                      <span>({comment.author.department})</span>
                      {comment.statusChange && (
                        <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                          {comment.statusChange}
                        </span>
                      )}
                    </div>
                    <span>{timeAgo(comment.createdAt)}</span>
                  </div>
                  {comment.text && (
                    <p className="text-gray-800 leading-relaxed font-sans pl-1 whitespace-pre-wrap">
                      {comment.text}
                    </p>
                  )}
                </div>
              ))}
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
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as Status | '')}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded font-mono text-gray-800 focus:outline-none"
                  >
                    <option value="">(Keep current: {selectedIssue.status})</option>
                    <option value="NEW">NEW</option>
                    <option value="ASSIGNED">ASSIGNED</option>
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="FIXED">FIXED</option>
                    <option value="VERIFIED">VERIFIED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
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
            <select
              value={selectedIssue.status}
              onChange={(e) =>
                updateIssue(selectedIssue.id, { status: e.target.value as Status })
              }
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-gray-900 font-mono focus:outline-none cursor-pointer"
            >
              <option value="NEW">NEW</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="ACCEPTED">ACCEPTED</option>
              <option value="FIXED">FIXED</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono text-gray-500">Priority</label>
            <select
              value={selectedIssue.priority}
              onChange={(e) =>
                updateIssue(selectedIssue.id, { priority: e.target.value as Priority })
              }
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-gray-900 font-mono focus:outline-none cursor-pointer"
            >
              <option value="P0">P0 — Blocker (Immediate fix)</option>
              <option value="P1">P1 — Critical (High priority)</option>
              <option value="P2">P2 — Major (Regular queue)</option>
              <option value="P3">P3 — Minor (Low priority)</option>
            </select>
          </div>

          {/* Environment */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono text-gray-500">Environment Stage</label>
            <select
              value={selectedIssue.environment || 'LOCAL'}
              onChange={(e) =>
                updateIssue(selectedIssue.id, { environment: e.target.value as Environment })
              }
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-gray-900 font-mono focus:outline-none cursor-pointer"
            >
              <option value="LOCAL">LOCAL (Dev Machine)</option>
              <option value="STAGING">STAGING (Pre-release / QA)</option>
              <option value="PROD">PROD (Production)</option>
            </select>
          </div>

          {/* Dev Scope */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono text-gray-500">Development Layer</label>
            <select
              value={selectedIssue.devScope || 'none'}
              onChange={(e) =>
                updateIssue(selectedIssue.id, {
                  devScope: e.target.value === 'none' ? undefined : (e.target.value as DevScope),
                })
              }
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-gray-900 font-mono focus:outline-none cursor-pointer"
            >
              <option value="none">Not specified</option>
              <option value="frontend">Frontend only</option>
              <option value="backend">Backend only</option>
              <option value="both">Both (Frontend + Backend)</option>
            </select>
          </div>

          {/* Component / Department */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono text-gray-500">Component</label>
            <select
              value={selectedIssue.departmentId}
              onChange={(e) =>
                updateIssue(selectedIssue.id, { departmentId: e.target.value })
              }
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-gray-900 font-mono focus:outline-none cursor-pointer"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono text-gray-500">Assignee</label>
            <select
              value={selectedIssue.assignee?.id || 'unassigned'}
              onChange={(e) => {
                const u = USERS.find((user) => user.id === e.target.value) || null;
                updateIssue(selectedIssue.id, {
                  assignee: u,
                  status: selectedIssue.status === 'NEW' && u ? 'ASSIGNED' : selectedIssue.status,
                });
              }}
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-gray-900 font-mono focus:outline-none cursor-pointer"
            >
              <option value="unassigned">Unassigned</option>
              {USERS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.department})
                </option>
              ))}
            </select>
          </div>

          {/* Meta Info */}
          <div className="pt-4 border-t border-gray-200 text-[11px] font-mono text-gray-500 space-y-1.5">
            <p>
              Reporter: <strong className="text-gray-800">{selectedIssue.reporter.name}</strong>
            </p>
            <p>Created: {formatDateTime(selectedIssue.createdAt)}</p>
            <p>Modified: {formatDateTime(selectedIssue.updatedAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
