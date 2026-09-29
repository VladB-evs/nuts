import React, { useState, useEffect } from 'react';
import { useIssues } from '../context/TicketContext';
import {
  Priority,
  Environment,
  DevScope,
  MarketingChannel,
  DeliverableType,
  DealSegment,
  DealStage,
  OpsCategory,
  ImpactLevel,
} from '../types';
import {
  getDepartmentRuleKind,
  ENVIRONMENTS,
  MARKETING_CHANNELS,
  DELIVERABLE_TYPES,
  DEAL_SEGMENTS,
  DEAL_STAGES,
  OPS_CATEGORIES,
  IMPACT_LEVELS,
} from '../lib/departmentRules';
import { X, SlidersHorizontal } from 'lucide-react';

export const CreateIssueModal: React.FC = () => {
  const {
    isCreateModalOpen,
    setIsCreateModalOpen,
    departments,
    selectedDepartment,
    createIssue,
    users,
  } = useIssues();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('engineering');
  const [priority, setPriority] = useState<Priority>('P2');
  const [assigneeId, setAssigneeId] = useState<string>('unassigned');

  // Engineering specific fields
  const [environment, setEnvironment] = useState<Environment>('LOCAL');
  const [isFrontend, setIsFrontend] = useState(true);
  const [isBackend, setIsBackend] = useState(false);

  // Marketing specific fields
  const [marketingChannel, setMarketingChannel] = useState<MarketingChannel>('Social Media');
  const [deliverableType, setDeliverableType] = useState<DeliverableType>('Copy & Blog');

  // Sales specific fields
  const [dealSegment, setDealSegment] = useState<DealSegment>('Enterprise');
  const [dealStage, setDealStage] = useState<DealStage>('Discovery & Demo');

  // Operations specific fields
  const [opsCategory, setOpsCategory] = useState<OpsCategory>('IT & Access');
  const [impactLevel, setImpactLevel] = useState<ImpactLevel>('Company-wide');

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

  if (!isCreateModalOpen) return null;

  const currentDept = departments.find((d) => d.id === departmentId) || departments[0];
  const currentRuleKind = getDepartmentRuleKind(departmentId, departments);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let devScope: DevScope | undefined = undefined;
    if (currentRuleKind === 'engineering') {
      if (isFrontend && isBackend) devScope = 'both';
      else if (isFrontend) devScope = 'frontend';
      else if (isBackend) devScope = 'backend';
    }

    createIssue({
      title: title.trim(),
      description: description.trim(),
      departmentId,
      priority,
      environment: currentRuleKind === 'engineering' ? environment : undefined,
      devScope: currentRuleKind === 'engineering' ? devScope : undefined,
      marketingChannel: currentRuleKind === 'marketing' ? marketingChannel : undefined,
      deliverableType: currentRuleKind === 'marketing' ? deliverableType : undefined,
      dealSegment: currentRuleKind === 'sales' ? dealSegment : undefined,
      dealStage: currentRuleKind === 'sales' ? dealStage : undefined,
      opsCategory: currentRuleKind === 'operations' ? opsCategory : undefined,
      impactLevel: currentRuleKind === 'operations' ? impactLevel : undefined,
      assigneeId: assigneeId !== 'unassigned' ? assigneeId : undefined,
    });

    setTitle('');
    setDescription('');
    setIsFrontend(true);
    setIsBackend(false);
    setEnvironment('LOCAL');
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
      <div className="relative w-full max-w-lg bg-white rounded-lg border border-gray-300 shadow-xl overflow-hidden z-10 animate-fade-in text-xs max-h-[90vh] flex flex-col">
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
            className="text-gray-400 hover:text-black p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
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
              <label className="block text-gray-700 font-medium mb-1">Department / Component *</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black cursor-pointer font-medium"
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

          {/* ======================================================== */}
          {/* DEPARTMENT SPECIFIC RULES                                */}
          {/* Automatically adapts when departmentId changes           */}
          {/* ======================================================== */}

          {/* 1. ENGINEERING / TECH RULES */}
          {currentRuleKind === 'engineering' && (
            <div className="space-y-3 p-3 bg-gray-50/90 rounded border border-gray-200 animate-fade-in">
              <div className="flex items-center justify-between pb-1 border-b border-gray-200">
                <span className="text-[11px] font-mono uppercase tracking-wider text-gray-800 font-bold flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3 h-3 text-gray-500" />
                  {currentDept.name} Rules ({currentDept.code})
                </span>
                <span className="text-[10px] font-mono text-gray-500 bg-white border border-gray-200 px-1.5 py-0.2 rounded">
                  Environment & Layer
                </span>
              </div>

              {/* Environment Stage */}
              <div>
                <label className="block text-gray-700 font-medium mb-1.5 text-[11px]">
                  Environment Stage *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ENVIRONMENTS.map((env) => (
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

              {/* Dev Layer checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-gray-700 font-medium text-[11px]">
                    Development Layer
                  </label>
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
            </div>
          )}

          {/* 2. MARKETING RULES */}
          {currentRuleKind === 'marketing' && (
            <div className="space-y-3 p-3 bg-rose-50/30 rounded border border-rose-100 animate-fade-in">
              <div className="flex items-center justify-between pb-1 border-b border-rose-100">
                <span className="text-[11px] font-mono uppercase tracking-wider text-rose-900 font-bold flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3 h-3 text-rose-600" />
                  {currentDept.name} Rules ({currentDept.code})
                </span>
                <span className="text-[10px] font-mono text-rose-700 bg-white border border-rose-200 px-1.5 py-0.2 rounded">
                  Channel & Deliverable
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-[11px]">
                    Channel / Area *
                  </label>
                  <select
                    value={marketingChannel}
                    onChange={(e) => setMarketingChannel(e.target.value as MarketingChannel)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black cursor-pointer"
                  >
                    {MARKETING_CHANNELS.map((ch) => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-[11px]">
                    Deliverable Type *
                  </label>
                  <select
                    value={deliverableType}
                    onChange={(e) => setDeliverableType(e.target.value as DeliverableType)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black cursor-pointer"
                  >
                    {DELIVERABLE_TYPES.map((dt) => (
                      <option key={dt} value={dt}>
                        {dt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 3. SALES RULES */}
          {currentRuleKind === 'sales' && (
            <div className="space-y-3 p-3 bg-indigo-50/30 rounded border border-indigo-100 animate-fade-in">
              <div className="flex items-center justify-between pb-1 border-b border-indigo-100">
                <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-900 font-bold flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3 h-3 text-indigo-600" />
                  {currentDept.name} Rules ({currentDept.code})
                </span>
                <span className="text-[10px] font-mono text-indigo-700 bg-white border border-indigo-200 px-1.5 py-0.2 rounded">
                  Segment & Stage
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-[11px]">
                    Deal Segment *
                  </label>
                  <select
                    value={dealSegment}
                    onChange={(e) => setDealSegment(e.target.value as DealSegment)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black cursor-pointer"
                  >
                    {DEAL_SEGMENTS.map((seg) => (
                      <option key={seg} value={seg}>
                        {seg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-[11px]">
                    Deal Stage *
                  </label>
                  <select
                    value={dealStage}
                    onChange={(e) => setDealStage(e.target.value as DealStage)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black cursor-pointer"
                  >
                    {DEAL_STAGES.map((stg) => (
                      <option key={stg} value={stg}>
                        {stg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 4. OPERATIONS RULES */}
          {currentRuleKind === 'operations' && (
            <div className="space-y-3 p-3 bg-teal-50/30 rounded border border-teal-100 animate-fade-in">
              <div className="flex items-center justify-between pb-1 border-b border-teal-100">
                <span className="text-[11px] font-mono uppercase tracking-wider text-teal-900 font-bold flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3 h-3 text-teal-600" />
                  {currentDept.name} Rules ({currentDept.code})
                </span>
                <span className="text-[10px] font-mono text-teal-700 bg-white border border-teal-200 px-1.5 py-0.2 rounded">
                  Category & Impact
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-[11px]">
                    Category *
                  </label>
                  <select
                    value={opsCategory}
                    onChange={(e) => setOpsCategory(e.target.value as OpsCategory)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black cursor-pointer"
                  >
                    {OPS_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1 text-[11px]">
                    Impact Level *
                  </label>
                  <select
                    value={impactLevel}
                    onChange={(e) => setImpactLevel(e.target.value as ImpactLevel)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black cursor-pointer"
                  >
                    {IMPACT_LEVELS.map((imp) => (
                      <option key={imp} value={imp}>
                        {imp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-medium mb-1">Assignee</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none cursor-pointer"
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
