import React, { useState } from 'react';
import { useIssues } from '../context/TicketContext';
import { Priority, Status } from '../types';
import { USERS } from '../data/mockData';
import { formatDateTime, timeAgo } from '../lib/utils';
import {
  ArrowLeft,
  Star,
  Trash2,
  Send,
  MessageSquare,
  Check,
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
      {/* Top Breadcrumb & Actions Bar */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between text-xs sticky top-0 z-10 select-none">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedIssue(null)}
            className="flex items-center gap-1 text-gray-600 hover:text-black font-medium py-1 px-2 rounded hover:bg-gray-200/60 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Issues</span>
          </button>
          <span className="text-gray-300">/</span>
          <span className="font-mono font-bold text-gray-900">
            #{selectedIssue.number}
          </span>
          <span className="font-mono text-gray-500">({selectedIssue.code})</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => toggleStar(selectedIssue.id)}
            className="p-1.5 text-gray-400 hover:text-amber-500 rounded hover:bg-gray-200/60 transition-colors"
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
            className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-200/60 transition-colors"
            title="Delete issue"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Centered Content Container (No dead empty right side) */}
      <div className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Title Area */}
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
                className="w-full text-lg font-bold text-gray-900 border border-gray-300 rounded px-2.5 py-1 focus:outline-none focus:border-black font-sans"
              />
              <button
                onClick={handleSaveTitle}
                className="px-3 py-1 bg-black text-white text-xs font-medium rounded hover:bg-gray-800"
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
              className="text-xl font-bold text-gray-900 cursor-pointer hover:text-blue-700 transition-colors"
              title="Click to edit title"
            >
              {selectedIssue.title}
            </h1>
          )}
        </div>

        {/* Google Buganizer Style Horizontal Metadata Bar */}
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          {/* Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-mono text-[11px]">Status:</span>
            <select
              value={selectedIssue.status}
              onChange={(e) =>
                updateIssue(selectedIssue.id, { status: e.target.value as Status })
              }
              className="px-2 py-0.5 bg-white border border-gray-300 rounded text-gray-900 font-mono text-xs focus:outline-none cursor-pointer"
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
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-mono text-[11px]">Priority:</span>
            <select
              value={selectedIssue.priority}
              onChange={(e) =>
                updateIssue(selectedIssue.id, { priority: e.target.value as Priority })
              }
              className="px-2 py-0.5 bg-white border border-gray-300 rounded text-gray-900 font-mono text-xs focus:outline-none cursor-pointer"
            >
              <option value="P0">P0 (Blocker)</option>
              <option value="P1">P1 (Critical)</option>
              <option value="P2">P2 (Major)</option>
              <option value="P3">P3 (Minor)</option>
            </select>
          </div>

          {/* Component */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-mono text-[11px]">Component:</span>
            <select
              value={selectedIssue.departmentId}
              onChange={(e) =>
                updateIssue(selectedIssue.id, { departmentId: e.target.value })
              }
              className="px-2 py-0.5 bg-white border border-gray-300 rounded text-gray-900 text-xs focus:outline-none cursor-pointer font-sans"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-mono text-[11px]">Assignee:</span>
            <select
              value={selectedIssue.assignee?.id || 'unassigned'}
              onChange={(e) => {
                const u = USERS.find((user) => user.id === e.target.value) || null;
                updateIssue(selectedIssue.id, {
                  assignee: u,
                  status: selectedIssue.status === 'NEW' && u ? 'ASSIGNED' : selectedIssue.status,
                });
              }}
              className="px-2 py-0.5 bg-white border border-gray-300 rounded text-gray-900 text-xs focus:outline-none cursor-pointer font-sans"
            >
              <option value="unassigned">Unassigned</option>
              {USERS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reporter & Date */}
          <div className="flex items-center gap-1.5 text-gray-500 font-mono text-[11px] ml-auto">
            <span>Reporter: <strong className="text-gray-800">{selectedIssue.reporter.name}</strong></span>
            <span>•</span>
            <span>{timeAgo(selectedIssue.createdAt)}</span>
          </div>
        </div>

        {/* Description Box */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 font-semibold block">
            Description
          </span>
          <div className="p-4 rounded-lg border border-gray-200 bg-white text-xs text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
            {selectedIssue.description || (
              <span className="text-gray-400 italic">No description provided.</span>
            )}
          </div>
        </div>

        {/* Activity & Comments Thread */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider font-mono">
              Activity & Comments ({selectedIssue.comments.length})
            </span>
          </div>

          {selectedIssue.comments.length === 0 ? (
            <p className="text-xs text-gray-400 font-mono py-2 italic">
              No comments yet on this issue.
            </p>
          ) : (
            <div className="space-y-2.5">
              {selectedIssue.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-3.5 rounded-lg border border-gray-200 bg-white text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-gray-500 font-mono text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {comment.author.name}
                      </span>
                      <span>({comment.author.department})</span>
                      {comment.statusChange && (
                        <span className="text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-medium">
                          {comment.statusChange}
                        </span>
                      )}
                    </div>
                    <span>{timeAgo(comment.createdAt)}</span>
                  </div>
                  {comment.text && (
                    <p className="text-gray-800 leading-relaxed font-sans whitespace-pre-wrap pt-0.5">
                      {comment.text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Comment / Update Status Box */}
        <form
          onSubmit={handlePostComment}
          className="p-4 border border-gray-200 rounded-lg bg-gray-50/70 space-y-3"
        >
          <textarea
            rows={3}
            placeholder="Add a comment or status update..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="w-full p-3 text-xs border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black leading-relaxed"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-mono">Update status:</span>
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
              <span>Save & Comment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
