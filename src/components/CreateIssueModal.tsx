import React, { useState } from 'react';
import { useIssues } from '../context/TicketContext';
import { Priority, Environment, DevScope } from '../types';
import { USERS } from '../data/mockData';
import { X } from 'lucide-react';

export const CreateIssueModal: React.FC = () => {
  const {
    isCreateModalOpen,
    setIsCreateModalOpen,
    departments,
    selectedDepartment,
    createIssue,
  } = useIssues();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState(
    selectedDepartment !== 'all' ? selectedDepartment : 'engineering'
  );
  const [priority, setPriority] = useState<Priority>('P2');
  const [environment, setEnvironment] = useState<Environment>('LOCAL');
  const [isFrontend, setIsFrontend] = useState(true);
  const [isBackend, setIsBackend] = useState(false);
  const [assigneeId, setAssigneeId] = useState<string>('unassigned');

  if (!isCreateModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let devScope: DevScope | undefined = undefined;
    if (isFrontend && isBackend) devScope = 'both';
    else if (isFrontend) devScope = 'frontend';
    else if (isBackend) devScope = 'backend';

    createIssue({
      title: title.trim(),
      description: description.trim(),
      departmentId,
      priority,
      environment,
      devScope,
      assigneeId: assigneeId !== 'unassigned' ? assigneeId : undefined,
    });

    setTitle('');
    setDescription('');
    setIsFrontend(true);
    setIsBackend(false);
    setEnvironment('LOCAL');
    setIsCreateModalOpen(false);
  };

  const isDev = departmentId === 'engineering';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs"
        onClick={() => setIsCreateModalOpen(false)}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-lg border border-gray-300 shadow-xl overflow-hidden z-10 animate-fade-in text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50">
          <span className="font-semibold text-gray-900 text-sm">Create New Issue</span>
          <button
            onClick={() => setIsCreateModalOpen(false)}
            className="text-gray-400 hover:text-black p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1">Title *</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Brief summary of the issue or task..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black font-sans text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Component *</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none cursor-pointer"
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Priority *</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none cursor-pointer font-mono"
              >
                <option value="P0">P0 — Blocker</option>
                <option value="P1">P1 — Critical</option>
                <option value="P2">P2 — Major</option>
                <option value="P3">P3 — Minor</option>
              </select>
            </div>
          </div>

          {/* Environment category: Local, Staging, or Prod */}
          <div>
            <label className="block text-gray-700 font-medium mb-1.5">
              Environment Stage *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['LOCAL', 'STAGING', 'PROD'] as Environment[]).map((env) => (
                <button
                  type="button"
                  key={env}
                  onClick={() => setEnvironment(env)}
                  className={`py-1.5 px-3 rounded border text-center font-mono font-medium transition-colors ${
                    environment === env
                      ? 'bg-black text-white border-black shadow-xs'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {env}
                </button>
              ))}
            </div>
          </div>

          {/* Development Scope: Frontend / Backend / Both */}
          <div className="p-3 rounded-md border border-gray-200 bg-gray-50/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-800 font-semibold text-[11px] uppercase tracking-wider font-mono">
                Development Layer {isDev ? '(Engineering)' : ''}
              </span>
              <span className="text-[11px] font-mono text-gray-500 font-medium">
                {isFrontend && isBackend
                  ? 'Both (Fullstack)'
                  : isFrontend
                  ? 'Frontend only'
                  : isBackend
                  ? 'Backend only'
                  : 'Neither'}
              </span>
            </div>
            <div className="flex items-center gap-6 pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-gray-800">
                <input
                  type="checkbox"
                  checked={isFrontend}
                  onChange={(e) => setIsFrontend(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-0 accent-black cursor-pointer"
                />
                <span>Frontend</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-gray-800">
                <input
                  type="checkbox"
                  checked={isBackend}
                  onChange={(e) => setIsBackend(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-0 accent-black cursor-pointer"
                />
                <span>Backend</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">Assignee</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none cursor-pointer"
            >
              <option value="unassigned">Unassigned</option>
              {USERS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">Description</label>
            <textarea
              rows={4}
              placeholder="Steps to reproduce, context, details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black font-mono leading-relaxed text-xs"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-3 py-1.5 text-gray-600 hover:text-black rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-black text-white font-medium rounded hover:bg-gray-800 transition-colors"
            >
              Create Issue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
