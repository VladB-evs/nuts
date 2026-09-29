import React, { useState, useEffect } from 'react';
import { useIssues } from '../context/TicketContext';
import { Priority, CustomFieldDefinition } from '../types';
import { X, SlidersHorizontal, Settings2 } from 'lucide-react';

export const CreateIssueModal: React.FC = () => {
  const {
    isCreateModalOpen,
    setIsCreateModalOpen,
    departments,
    selectedDepartment,
    createIssue,
    users,
    openDepartmentModal,
  } = useIssues();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('engineering');
  const [priority, setPriority] = useState<Priority>('P2');
  const [assigneeId, setAssigneeId] = useState<string>('unassigned');

  // Dynamic custom attribute values: { [fieldId]: value }
  const [customValues, setCustomValues] = useState<Record<string, any>>({});

  // Engineering specific layer checkboxes
  const [isFrontend, setIsFrontend] = useState(true);
  const [isBackend, setIsBackend] = useState(false);

  // Synchronize department when modal opens based on which department view is active
  useEffect(() => {
    if (isCreateModalOpen) {
      const activeDeptId =
        selectedDepartment !== 'all'
          ? selectedDepartment
          : departments[0]?.id || 'engineering';
      setDepartmentId(activeDeptId);
    }
  }, [isCreateModalOpen, selectedDepartment, departments]);

  // Synchronize initial custom fields whenever departmentId changes
  useEffect(() => {
    const dept = departments.find((d) => d.id === departmentId);
    if (dept?.customFields && dept.customFields.length > 0) {
      const initial: Record<string, any> = {};
      dept.customFields.forEach((f) => {
        if (f.defaultValue) {
          initial[f.id] = f.defaultValue;
        } else if (f.type === 'select' && f.options && f.options.length > 0) {
          initial[f.id] = f.options[0];
        } else {
          initial[f.id] = '';
        }
      });
      setCustomValues(initial);
    } else {
      setCustomValues({});
    }
    setIsFrontend(true);
    setIsBackend(false);
  }, [departmentId, departments]);

  if (!isCreateModalOpen) return null;

  const currentDept = departments.find((d) => d.id === departmentId) || departments[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalCustomAttrs = { ...customValues };

    // If department has devScope field, compute from frontend/backend checkboxes
    const hasDevScope = currentDept?.customFields?.some((f) => f.id === 'devScope');
    if (hasDevScope) {
      finalCustomAttrs.devScope =
        isFrontend && isBackend
          ? 'Both (Frontend + Backend)'
          : isFrontend
          ? 'Frontend only'
          : isBackend
          ? 'Backend only'
          : 'None';
    }

    createIssue({
      title: title.trim(),
      description: description.trim(),
      departmentId,
      priority,
      customAttributes: finalCustomAttrs,
      environment: finalCustomAttrs.environment,
      devScope: isFrontend && isBackend ? 'both' : isFrontend ? 'frontend' : isBackend ? 'backend' : undefined,
      marketingChannel: finalCustomAttrs.marketingChannel,
      deliverableType: finalCustomAttrs.deliverableType,
      dealSegment: finalCustomAttrs.dealSegment,
      dealStage: finalCustomAttrs.dealStage,
      opsCategory: finalCustomAttrs.opsCategory,
      impactLevel: finalCustomAttrs.impactLevel,
      assigneeId: assigneeId !== 'unassigned' ? assigneeId : undefined,
    });

    setTitle('');
    setDescription('');
    setIsFrontend(true);
    setIsBackend(false);
    setIsCreateModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs"
        onClick={() => setIsCreateModalOpen(false)}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-lg border border-gray-300 shadow-xl overflow-hidden z-10 animate-fade-in text-xs max-h-[90vh] flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm">Create New Issue</span>
            {currentDept && (
              <span className="font-mono text-[10px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 px-1.5 py-0.5 rounded">
                {currentDept.name} ({currentDept.code})
              </span>
            )}
          </div>
          <button
            onClick={() => setIsCreateModalOpen(false)}
            className="text-gray-400 hover:text-black p-1 rounded hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Issue Title */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Issue Title *</label>
            <input
              type="text"
              required
              placeholder="Concise summary of the problem or request"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black font-medium"
            />
          </div>

          {/* Department and Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-gray-700 font-medium">Component *</label>
                <button
                  type="button"
                  onClick={() => openDepartmentModal(departmentId)}
                  className="text-[10px] text-gray-500 hover:text-black flex items-center gap-1 font-mono"
                  title="Customize this component's properties"
                >
                  <Settings2 className="w-2.5 h-2.5" />
                  <span>Customize</span>
                </button>
              </div>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black cursor-pointer font-medium"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black cursor-pointer font-mono"
              >
                <option value="P0">P0 — Blocker</option>
                <option value="P1">P1 — Critical</option>
                <option value="P2">P2 — Major</option>
                <option value="P3">P3 — Minor</option>
              </select>
            </div>
          </div>

          {/* DYNAMIC COMPONENT PROPERTIES */}
          <div className="p-3 bg-gray-50/80 rounded border border-gray-200 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-gray-200">
              <span className="text-[11px] font-mono uppercase tracking-wider text-gray-800 font-bold flex items-center gap-1.5">
                <SlidersHorizontal className="w-3 h-3 text-gray-600" />
                {currentDept.name} Properties
              </span>
              <button
                type="button"
                onClick={() => openDepartmentModal(currentDept.id)}
                className="text-[10px] font-mono text-gray-500 hover:text-black flex items-center gap-0.5"
              >
                <Settings2 className="w-2.5 h-2.5" />
                <span>Edit Fields</span>
              </button>
            </div>

            {currentDept?.customFields && currentDept.customFields.length > 0 ? (
              <div className="space-y-3">
                {currentDept.customFields.map((field: CustomFieldDefinition) => {
                  // Special UX for Engineering devScope: Frontend & Backend checkboxes
                  if (field.id === 'devScope') {
                    return (
                      <div key={field.id}>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-gray-700 font-medium text-[11px]">
                            {field.name}
                          </label>
                          <span className="text-[11px] font-mono text-gray-500 font-medium">
                            {isFrontend && isBackend
                              ? 'Both (Fullstack)'
                              : isFrontend
                              ? 'Frontend only'
                              : isBackend
                              ? 'Backend only'
                              : 'None'}
                          </span>
                        </div>
                        <div className="flex items-center gap-6 pt-1">
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
                    );
                  }

                  // Standard select dropdown
                  if (field.type === 'select') {
                    return (
                      <div key={field.id}>
                        <label className="block text-gray-700 font-medium mb-1 text-[11px]">
                          {field.name}
                        </label>
                        <select
                          value={customValues[field.id] || field.options?.[0] || ''}
                          onChange={(e) =>
                            setCustomValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black cursor-pointer"
                        >
                          {(field.options || []).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  // Text input
                  return (
                    <div key={field.id}>
                      <label className="block text-gray-700 font-medium mb-1 text-[11px]">
                        {field.name}
                      </label>
                      <input
                        type="text"
                        value={customValues[field.id] || ''}
                        onChange={(e) =>
                          setCustomValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                        }
                        placeholder={`Enter ${field.name.toLowerCase()}...`}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-2 text-center text-gray-500 text-[11px]">
                No custom properties defined for {currentDept.name}.{' '}
                <button
                  type="button"
                  onClick={() => openDepartmentModal(currentDept.id)}
                  className="text-black font-semibold underline ml-1"
                >
                  Add properties
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">Assignee</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black cursor-pointer"
            >
              <option value="unassigned">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.nickname ? `(@${u.nickname})` : ''} — {u.role || u.department}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Context, details, acceptance criteria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black font-sans leading-relaxed text-xs"
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
              className="px-4 py-1.5 bg-black text-white font-medium rounded hover:bg-gray-800 transition-colors shadow-2xs"
            >
              Create Issue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
