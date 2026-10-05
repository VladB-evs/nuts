import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useIssues } from '../context/TicketContext';
import {
  Department,
  IssueLink,
  LinkRelationType,
  Priority,
  RELATION_CONFIG,
  Status,
} from '../types';
import { CustomSelect, SelectOption } from './CustomSelect';
import { UserAvatar } from './UserAvatar';
import { PRIORITY_OPTIONS, getStatusOptions } from '../lib/issueOptions';
import { isStatusAllowed } from '../lib/workflow';
import { ArrowLeft, Link2, Plus, Search, X } from 'lucide-react';

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
    value: 'duplicate',
    label: 'Duplicate',
    badge: 'Duplicate',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 font-mono text-[9px]',
    description: 'Duplicate ticket',
  },
];

/** Only the Environment Stage starts filled in (LOCAL); every other department field starts blank. */
const initialCustomValues = (dept?: Department): Record<string, string> => {
  const values: Record<string, string> = {};
  (dept?.customFields || []).forEach((f) => {
    values[f.id] =
      f.id === 'environment' && f.options?.includes('LOCAL') ? 'LOCAL' : '';
  });
  return values;
};

const Field: React.FC<{
  label: string;
  required?: boolean;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, required = true, trailing, children }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <label className="block text-[11px] font-mono text-gray-500">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {trailing}
    </div>
    {children}
  </div>
);

interface Draft {
  userId: string;
  title: string;
  description: string;
  departmentId: string;
  priority: Priority | '';
  status: Status;
  assigneeId: string;
  customValues: Record<string, string>;
  isFrontend: boolean;
  isBackend: boolean;
  selectedLinks: IssueLink[];
}

// An unsaved ticket survives navigating away (sidebar, opening another ticket) and is picked up
// again by the next "New Issue". Cancel and Create clear it. Memory only, and per user.
let savedDraft: Draft | null = null;

export const CreateIssuePage: React.FC = () => {
  const { setIsCreatingIssue, departments, currentUser, createIssue, users, issues } = useIssues();

  const [restored] = useState<Draft | null>(() =>
    savedDraft && savedDraft.userId === currentUser?.id ? savedDraft : null
  );

  const [title, setTitle] = useState(restored?.title ?? '');
  const [description, setDescription] = useState(restored?.description ?? '');
  // Starts blank on purpose: defaulting to any one department gets in the way of everyone else.
  const [departmentId, setDepartmentId] = useState<string>(restored?.departmentId ?? '');
  const [priority, setPriority] = useState<Priority | ''>(restored?.priority ?? '');
  const [status, setStatus] = useState<Status>(restored?.status ?? 'NEW');
  const [assigneeId, setAssigneeId] = useState<string>(restored?.assigneeId ?? 'unassigned');
  const [customValues, setCustomValues] = useState<Record<string, string>>(
    restored?.customValues ?? {}
  );
  const [isFrontend, setIsFrontend] = useState(restored?.isFrontend ?? false);
  const [isBackend, setIsBackend] = useState(restored?.isBackend ?? false);

  const [selectedLinks, setSelectedLinks] = useState<IssueLink[]>(restored?.selectedLinks ?? []);
  const [isLinking, setIsLinking] = useState(false);
  const [linkRelation, setLinkRelation] = useState<LinkRelationType>('relates_to');
  const [linkSearch, setLinkSearch] = useState('');

  const currentDept = departments.find((d) => d.id === departmentId);
  const customFields = currentDept?.customFields || [];

  // A different department has different properties, so they start over (a restored draft
  // already holds values for its own department).
  const initializedDept = useRef<string | null>(restored ? restored.departmentId : null);
  useEffect(() => {
    if (initializedDept.current === departmentId) return;
    initializedDept.current = departmentId;
    setCustomValues(initialCustomValues(currentDept));
    setIsFrontend(false);
    setIsBackend(false);
    // the new department may not use the status picked so far
    setStatus((prev) => (isStatusAllowed(currentDept?.workflow, prev) ? prev : 'NEW'));
  }, [departmentId]);

  // Remember the draft when this page goes away, unless Cancel/Create discarded it.
  const latestDraft = useRef<Draft | null>(null);
  latestDraft.current = {
    userId: currentUser?.id ?? '',
    title,
    description,
    departmentId,
    priority,
    status,
    assigneeId,
    customValues,
    isFrontend,
    isBackend,
    selectedLinks,
  };
  const discardDraft = useRef(false);
  useEffect(
    () => () => {
      const d = latestDraft.current;
      const dirty =
        d &&
        (d.title.trim() ||
          d.description.trim() ||
          d.priority ||
          d.selectedLinks.length ||
          d.assigneeId !== 'unassigned' ||
          d.isFrontend ||
          d.isBackend);
      savedDraft = dirty && !discardDraft.current ? d : null;
    },
    []
  );

  const departmentOptions: SelectOption[] = useMemo(
    () =>
      departments.map((d) => ({
        value: d.id,
        label: d.name,
        badge: d.code,
        badgeClass: 'bg-gray-100 text-gray-800 border-gray-300 font-mono',
        description: d.description,
      })),
    [departments]
  );

  const assigneeOptions: SelectOption[] = useMemo(
    () => [
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
      ...users
        .filter((u) => u.status !== 'departed')
        .map((u) => ({
          value: u.id,
          label: u.name,
          badge: u.nickname ? `@${u.nickname}` : undefined,
          badgeClass: 'bg-gray-50 text-gray-500 border-gray-200 font-mono text-[9px]',
          icon: <UserAvatar user={u} size="xs" />,
          description: `${u.role || 'Member'} • ${u.department || 'General'}`,
        })),
    ],
    [users]
  );

  const candidateIssuesToLink = useMemo(() => {
    const q = linkSearch.trim().toLowerCase();
    const alreadySelectedIds = new Set(selectedLinks.map((l) => l.issueId));
    return issues.filter((iss) => {
      if (alreadySelectedIds.has(iss.id)) return false;
      if (!q) return true;
      const dept = departments.find((d) => d.id === iss.departmentId);
      return (
        String(iss.code || '').toLowerCase().includes(q) ||
        String(iss.title || '').toLowerCase().includes(q) ||
        String(iss.number ?? '').includes(q) ||
        Boolean(dept?.name && dept.name.toLowerCase().includes(q)) ||
        Boolean(dept?.code && dept.code.toLowerCase().includes(q))
      );
    });
  }, [issues, selectedLinks, linkSearch, departments]);

  const hasDevScope = customFields.some((f) => f.id === 'devScope');

  // Everything except linked tickets is mandatory.
  const missing: string[] = [];
  if (!title.trim()) missing.push('Title');
  if (!description.trim()) missing.push('Description');
  if (!status) missing.push('Status');
  if (!priority) missing.push('Priority');
  if (!departmentId || !currentDept) missing.push('Department');
  if (!assigneeId) missing.push('Assignee');
  customFields.forEach((f) => {
    const filled =
      f.id === 'devScope' ? isFrontend || isBackend : Boolean((customValues[f.id] || '').trim());
    if (!filled) missing.push(f.name);
  });
  const canSave = missing.length === 0;

  const handleAssigneeChange = (val: string) => {
    setAssigneeId(val);
    // Same rule as the issue page: assigning a brand-new ticket moves it to ASSIGNED.
    if (val !== 'unassigned' && status === 'NEW') setStatus('ASSIGNED');
  };

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
    if (!canSave || !priority || !currentDept) return;

    const customAttributes: Record<string, any> = { ...customValues };
    if (hasDevScope) {
      customAttributes.devScope =
        isFrontend && isBackend
          ? 'Both (Frontend + Backend)'
          : isFrontend
          ? 'Frontend only'
          : 'Backend only';
    }

    createIssue({
      title: title.trim(),
      description: description.trim(),
      departmentId: currentDept.id,
      priority,
      status,
      customAttributes,
      environment: customAttributes.environment,
      devScope: hasDevScope
        ? isFrontend && isBackend
          ? 'both'
          : isFrontend
          ? 'frontend'
          : 'backend'
        : undefined,
      marketingChannel: customAttributes.marketingChannel,
      deliverableType: customAttributes.deliverableType,
      dealSegment: customAttributes.dealSegment,
      dealStage: customAttributes.dealStage,
      opsCategory: customAttributes.opsCategory,
      impactLevel: customAttributes.impactLevel,
      assigneeId: assigneeId !== 'unassigned' ? assigneeId : undefined,
      linkedIssues: selectedLinks,
    });

    // createIssue opens the new ticket; leave this page.
    discardDraft.current = true;
    setIsCreatingIssue(false);
  };

  const inputClass =
    'w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black';

  const renderProperties = () => (
    <div className="space-y-4">
            <Field label="Status">
              <CustomSelect
                value={status}
                onChange={(val) => setStatus(val as Status)}
                options={getStatusOptions(currentDept)}
              />
            </Field>

            <Field label="Priority">
              <CustomSelect
                value={priority}
                onChange={(val) => setPriority(val as Priority)}
                options={PRIORITY_OPTIONS}
                placeholder="Select priority..."
              />
            </Field>

            <Field label="Department">
              <CustomSelect
                value={departmentId}
                onChange={setDepartmentId}
                options={departmentOptions}
                placeholder="Select department..."
              />
            </Field>

            {!currentDept && (
              <p className="text-[11px] text-gray-500 -mt-1">
                Choose a department to see its properties.
              </p>
            )}

            {customFields.map((field) => {
              if (field.id === 'devScope') {
                return (
                  <Field key={field.id} label={field.name}>
                    <div className="flex items-center gap-6 pt-0.5">
                      <label className="flex items-center gap-2 cursor-pointer select-none font-medium text-gray-800">
                        <input
                          type="checkbox"
                          checked={isFrontend}
                          onChange={(e) => setIsFrontend(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 accent-black cursor-pointer"
                        />
                        <span>Frontend</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none font-medium text-gray-800">
                        <input
                          type="checkbox"
                          checked={isBackend}
                          onChange={(e) => setIsBackend(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 accent-black cursor-pointer"
                        />
                        <span>Backend</span>
                      </label>
                    </div>
                  </Field>
                );
              }

              if (field.type === 'select') {
                return (
                  <Field key={field.id} label={field.name}>
                    <CustomSelect
                      value={customValues[field.id] || ''}
                      onChange={(val) => setCustomValues((prev) => ({ ...prev, [field.id]: val }))}
                      options={field.options || []}
                      placeholder={`Select ${field.name.toLowerCase()}...`}
                    />
                  </Field>
                );
              }

              return (
                <Field key={field.id} label={field.name}>
                  <input
                    type="text"
                    value={customValues[field.id] || ''}
                    onChange={(e) =>
                      setCustomValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
                    placeholder={`Enter ${field.name.toLowerCase()}...`}
                    className={`${inputClass} font-mono`}
                  />
                </Field>
              );
            })}

            <Field label="Assignee">
              <CustomSelect
                value={assigneeId}
                onChange={handleAssigneeChange}
                options={assigneeOptions}
                searchable={users.length > 5}
              />
            </Field>

            {/* Linked Tickets (optional) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-gray-500 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-gray-500" />
                  <span>Linked Tickets</span>
                  {selectedLinks.length > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-gray-200 text-gray-700 rounded-full font-bold">
                      {selectedLinks.length}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsLinking(!isLinking);
                    setLinkSearch('');
                  }}
                  className="text-[11px] font-mono text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  {isLinking ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  <span>{isLinking ? 'Close' : 'Link'}</span>
                </button>
              </div>

              {selectedLinks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 py-1">
                  {selectedLinks.map((link) => {
                    const targetIss = issues.find((i) => i.id === link.issueId);
                    const config = RELATION_CONFIG[link.relation] || RELATION_CONFIG.relates_to;
                    const dept = targetIss
                      ? departments.find((d) => d.id === targetIss.departmentId)
                      : null;
                    return (
                      <div
                        key={link.issueId}
                        className="inline-flex items-center gap-1.5 px-2 py-0.8 bg-gray-50 border border-gray-300 rounded text-xs"
                      >
                        <span
                          className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded border ${config.badgeClass}`}
                        >
                          {config.label}
                        </span>
                        {dept && (
                          <span className="text-[9px] font-mono font-semibold px-1 py-0.2 bg-gray-100 text-gray-700 border border-gray-200 rounded">
                            {dept.code}
                          </span>
                        )}
                        <span className="font-mono font-bold text-gray-900 text-[11px]">
                          #{targetIss?.number || targetIss?.code || link.issueId}
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

              {isLinking && (
                <div className="p-2.5 bg-gray-50 border border-blue-200 rounded-md space-y-2">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="w-full sm:w-40 shrink-0">
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
                        className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 font-mono focus:outline-none focus:border-blue-500"
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
                              <span className="truncate text-gray-700 text-xs">{iss.title}</span>
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

      {/* Meta Info */}
      <div className="pt-3 border-t border-gray-200 text-[11px] font-mono text-gray-500 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Reporter:</span>
          <div className="inline-flex items-center gap-1.5">
            <UserAvatar user={currentUser} size="xs" />
            <span className="font-semibold text-gray-800 font-sans">{currentUser?.name}</span>
          </div>
        </div>
        <p>Created: on save</p>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="flex-1 overflow-hidden bg-white flex flex-col h-full min-h-0">
      {/* Top Header */}
      <div className="px-3 sm:px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between text-xs shrink-0 select-none">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setIsCreatingIssue(false)}
            className="flex items-center gap-1 text-gray-600 hover:text-black font-medium py-1 px-2 rounded hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">All Issues</span>
            <span className="sm:hidden">Back</span>
          </button>
          <span className="text-gray-300 shrink-0">/</span>
          <span className="font-mono font-bold text-gray-900 shrink-0">New</span>
          <span className="font-mono text-gray-400 truncate">
            ({currentDept ? `${currentDept.code}-new` : 'new'})
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              discardDraft.current = true;
              setIsCreatingIssue(false);
            }}
            className="px-2.5 py-1.5 text-gray-600 hover:text-black rounded hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="px-3.5 py-1.5 bg-black text-white font-medium rounded hover:bg-gray-800 transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Create Issue
          </button>
        </div>
      </div>

      {/* Main Split Layout: Title & Description on Left, Properties on Right */}
      <div className="flex-1 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-200 overflow-y-auto lg:overflow-hidden min-h-0 bg-white">
        <div className="shrink-0 lg:shrink lg:flex-1 min-w-0 p-3.5 sm:p-6 space-y-6 lg:overflow-y-auto lg:min-h-0">
          {/* Title & Metadata */}
          <div className="space-y-2">
            <input
              type="text"
              autoFocus
              placeholder="Issue title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-base sm:text-lg font-bold text-gray-900 placeholder-gray-400 border border-gray-300 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:border-black font-sans leading-snug"
            />
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>Opened just now by</span>
              <div className="inline-flex items-center gap-1.5">
                <UserAvatar user={currentUser} size="xs" />
                <span className="font-medium text-gray-800">{currentUser?.name}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold block">
              Description<span className="text-red-500 ml-0.5">*</span>
            </label>
            <textarea
              rows={10}
              placeholder="Context, details, acceptance criteria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3.5 sm:p-4 rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-800 placeholder-gray-400 leading-relaxed font-sans focus:outline-none focus:border-gray-500"
            />
          </div>

          {restored && (
            <p className="text-[11px] font-mono text-sky-600">
              Restored your unsaved draft. Cancel to discard it.
            </p>
          )}

          <p className="text-[11px] font-mono text-gray-500">
            {canSave ? (
              <span className="text-emerald-600">All required fields are filled in.</span>
            ) : (
              <>
                <span className="font-semibold text-gray-700">
                  {missing.length} required {missing.length === 1 ? 'field' : 'fields'} left:
                </span>{' '}
                {missing.join(', ')}
              </>
            )}
          </p>

          {/* Mobile Properties Card (< lg) */}
          <div className="lg:hidden bg-gray-50 border border-gray-200 rounded-lg p-3.5 sm:p-4 space-y-3 shadow-2xs text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <span className="text-[11px] font-mono uppercase tracking-wider text-gray-700 font-bold">
                Ticket Properties
              </span>
            </div>
            {renderProperties()}
          </div>
        </div>

        {/* Right Column: Properties Sidebar (Desktop only >= lg) */}
        <aside className="hidden lg:block w-72 xl:w-80 p-5 xl:p-6 space-y-5 bg-gray-50 border-l border-gray-200 text-xs shrink-0 overflow-y-auto min-h-0 [scrollbar-gutter:stable]">
          <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 font-bold block pb-2 border-b border-gray-200">
            Issue Properties
          </span>
          {renderProperties()}
        </aside>
      </div>
    </form>
  );
};
