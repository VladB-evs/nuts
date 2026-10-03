import React, { useState, useEffect, useMemo } from 'react';
import { useIssues } from '../context/TicketContext';
import {
  Priority,
  CustomFieldDefinition,
  LinkRelationType,
  IssueLink,
  RELATION_CONFIG,
} from '../types';
import { CustomSelect, SelectOption } from './CustomSelect';
import { UserAvatar } from './UserAvatar';
import { X, SlidersHorizontal, Link2, Plus, Search } from 'lucide-react';

const RELATION_OPTIONS: SelectOption[] = [
  {
    value: 'relates_to',
    label: 'Relates to',
    badge: 'Relates',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 font-mono text-[9px]',
    description: 'General relationship between tickets',
  },
  {
    value: 'blocks',
    label: 'Blocks',
    badge: 'Blocks',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 font-mono text-[9px]',
    description: 'Prevents target ticket from proceeding',
  },
  {
    value: 'blocked_by',
    label: 'Blocked by',
    badge: 'Blocked by',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 font-mono text-[9px]',
    description: 'Blocked until target ticket is resolved',
  },
  {
    value: 'duplicates',
    label: 'Duplicates',
    badge: 'Duplicates',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 font-mono text-[9px]',
    description: 'Reports identical or duplicate scope',
  },
];

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

export const CreateIssueModal: React.FC = () => {
  const {
    isCreateModalOpen,
    setIsCreateModalOpen,
    departments,
    selectedDepartment,
    createIssue,
    users,
    issues,
  } = useIssues();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('engineering');
  const [priority, setPriority] = useState<Priority>('P2');
  const [assigneeId, setAssigneeId] = useState<string>('unassigned');

  // Linked tickets state
  const [selectedLinks, setSelectedLinks] = useState<IssueLink[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [linkRelation, setLinkRelation] = useState<LinkRelationType>('relates_to');
  const [linkSearch, setLinkSearch] = useState('');

  // Dynamic custom attribute values: { [fieldId]: value }
  const [customValues, setCustomValues] = useState<Record<string, any>>({});

  // Engineering specific layer checkboxes
  const [isFrontend, setIsFrontend] = useState(true);
  const [isBackend, setIsBackend] = useState(false);

  const departmentOptions: SelectOption[] = useMemo(() => {
    return departments.map((d) => ({
      value: d.id,
      label: d.name,
      badge: d.code,
      badgeClass: 'bg-gray-100 text-gray-800 border-gray-300 font-mono',
      description: d.description,
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
        description: 'Triage queue / unassigned',
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

  const candidateIssuesToLink = useMemo(() => {
    const q = linkSearch.trim().toLowerCase();
    const alreadySelectedIds = new Set(selectedLinks.map((l) => l.issueId));
    return issues.filter((iss) => {
      if (alreadySelectedIds.has(iss.id)) return false;
      if (!q) return true;
      const codeMatch = iss.code.toLowerCase().includes(q);
      const titleMatch = iss.title.toLowerCase().includes(q);
      const numMatch = String(iss.number).includes(q);
      const dept = departments.find((d) => d.id === iss.departmentId);
      const deptMatch =
        dept?.name.toLowerCase().includes(q) ||
        dept?.code.toLowerCase().includes(q);
      return codeMatch || titleMatch || numMatch || Boolean(deptMatch);
    });
  }, [issues, selectedLinks, linkSearch, departments]);

  const handleAddLink = (targetId: string) => {
    setSelectedLinks((prev) => [
      ...prev.filter((l) => l.issueId !== targetId),
      { issueId: targetId, relation: linkRelation },
    ]);
  };

  const handleRemoveLink = (targetId: string) => {
    setSelectedLinks((prev) => prev.filter((l) => l.issueId !== targetId));
  };

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
      linkedIssues: selectedLinks,
    });

    setTitle('');
    setDescription('');
    setIsFrontend(true);
    setIsBackend(false);
    setSelectedLinks([]);
    setIsLinking(false);
    setLinkSearch('');
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
              <label className="block text-gray-700 font-medium mb-1">Department *</label>
              <CustomSelect
                value={departmentId}
                onChange={(val) => setDepartmentId(val)}
                options={departmentOptions}
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Priority</label>
              <CustomSelect
                value={priority}
                onChange={(val) => setPriority(val as Priority)}
                options={PRIORITY_OPTIONS}
              />
            </div>
          </div>

          {/* DYNAMIC DEPARTMENT PROPERTIES */}
          {currentDept?.customFields && currentDept.customFields.length > 0 && (
            <div className="p-3 bg-gray-50/80 rounded border border-gray-200 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-gray-200">
                <span className="text-[11px] font-mono uppercase tracking-wider text-gray-800 font-bold flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3 h-3 text-gray-600" />
                  {currentDept.name} Properties
                </span>
              </div>

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
                        <CustomSelect
                          value={customValues[field.id] || field.options?.[0] || ''}
                          onChange={(val) =>
                            setCustomValues((prev) => ({ ...prev, [field.id]: val }))
                          }
                          options={field.options || []}
                        />
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
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-medium mb-1">Assignee</label>
            <CustomSelect
              value={assigneeId}
              onChange={(val) => setAssigneeId(val)}
              options={assigneeOptions}
              searchable={users.length > 5}
            />
          </div>

          {/* Linked Tickets (Available for all departments) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-gray-700 font-medium text-[11px] flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-gray-500" />
                <span>Linked Tickets</span>
                {selectedLinks.length > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-gray-200 text-gray-700 rounded-full font-bold">
                    {selectedLinks.length}
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsLinking(!isLinking);
                  setLinkSearch('');
                }}
                className="text-[11px] font-mono text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                {isLinking ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                <span>{isLinking ? 'Close' : '+ Link ticket'}</span>
              </button>
            </div>

            {/* Display selected linked tickets chips */}
            {selectedLinks.length > 0 && (
              <div className="flex flex-wrap gap-1.5 py-1">
                {selectedLinks.map((link) => {
                  const targetIss = issues.find((i) => i.id === link.issueId);
                  const config = RELATION_CONFIG[link.relation] || RELATION_CONFIG.relates_to;
                  return (
                    <div
                      key={link.issueId}
                      className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-300 rounded text-xs"
                    >
                      <span className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded border ${config.badgeClass}`}>
                        {config.label}
                      </span>
                      <span className="font-mono font-bold text-gray-900 text-[11px]">
                        {targetIss ? targetIss.code : link.issueId}
                      </span>
                      <span className="text-gray-600 truncate max-w-[130px] text-[11px]">
                        {targetIss?.title || ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(link.issueId)}
                        className="text-gray-400 hover:text-red-600 p-0.5 rounded cursor-pointer"
                        title="Remove link"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Search & picker dropdown */}
            {isLinking && (
              <div className="p-2.5 bg-gray-50 border border-blue-200 rounded-md space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-40 shrink-0">
                    <CustomSelect
                      value={linkRelation}
                      onChange={(val) => setLinkRelation(val as LinkRelationType)}
                      options={RELATION_OPTIONS}
                      size="xs"
                    />
                  </div>
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2" />
                    <input
                      type="text"
                      value={linkSearch}
                      onChange={(e) => setLinkSearch(e.target.value)}
                      placeholder="Search tickets to link..."
                      className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded bg-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="max-h-36 overflow-y-auto divide-y divide-gray-200 border border-gray-200 rounded bg-white">
                  {candidateIssuesToLink.length > 0 ? (
                    candidateIssuesToLink.slice(0, 8).map((iss) => {
                      const dept = departments.find((d) => d.id === iss.departmentId);
                      return (
                        <div
                          key={iss.id}
                          onClick={() => handleAddLink(iss.id)}
                          className="p-1.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-left group"
                        >
                          <div className="min-w-0 flex-1 flex items-center gap-2">
                            {dept && (
                              <span className="font-mono text-[9px] px-1 py-0.2 bg-gray-100 border border-gray-200 text-gray-700 rounded font-semibold">
                                {dept.code}
                              </span>
                            )}
                            <span className="font-mono font-bold text-gray-900 text-xs">
                              {iss.code}
                            </span>
                            <span className="truncate text-gray-700 text-xs">
                              {iss.title}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-blue-600 opacity-0 group-hover:opacity-100 shrink-0 pl-2">
                            + Link
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-2 text-center text-gray-400 font-mono text-[11px]">
                      {linkSearch ? 'No matching tickets' : 'No available tickets'}
                    </div>
                  )}
                </div>
              </div>
            )}
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
