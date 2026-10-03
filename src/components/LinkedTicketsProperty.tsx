import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useIssues } from '../context/TicketContext';
import {
  Issue,
  LinkRelationType,
  RELATION_CONFIG,
} from '../types';
import { CustomSelect, SelectOption } from './CustomSelect';
import {
  Link2,
  Plus,
  X,
  Search,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface LinkedTicketsPropertyProps {
  currentIssue: Issue;
}

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

export const LinkedTicketsProperty: React.FC<LinkedTicketsPropertyProps> = ({ currentIssue }) => {
  const { issues, departments, linkIssues, unlinkIssues, setSelectedIssue } = useIssues();

  const [isAdding, setIsAdding] = useState(false);
  const [selectedRelation, setSelectedRelation] = useState<LinkRelationType>('relates_to');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-focus search input when opening without scrolling the page
  useEffect(() => {
    if (isAdding && searchInputRef.current) {
      searchInputRef.current.focus({ preventScroll: true });
    }
  }, [isAdding]);

  // Click-outside and Escape key detection for frictionless dismiss
  useEffect(() => {
    if (!isAdding) return;

    const handleClickOutside = (e: MouseEvent) => {
      // If clicking the toggle button itself, let the button's onClick handle toggling
      if (toggleButtonRef.current && toggleButtonRef.current.contains(e.target as Node)) {
        return;
      }
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsAdding(false);
        setSearchQuery('');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAdding(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAdding]);

  // Existing linked items with resolved targets
  const linkedItems = useMemo(() => {
    const list = currentIssue.linkedIssues || [];
    return list.map((link) => {
      const target = issues.find((i) => i.id === link.issueId);
      const targetDept = target
        ? departments.find((d) => d.id === target.departmentId)
        : null;
      return {
        link,
        target,
        targetDept,
        config: RELATION_CONFIG[link.relation] || RELATION_CONFIG.relates_to,
      };
    });
  }, [currentIssue.linkedIssues, issues, departments]);

  // Already linked issue IDs
  const linkedIssueIds = useMemo(() => {
    return new Set((currentIssue.linkedIssues || []).map((l) => l.issueId));
  }, [currentIssue.linkedIssues]);

  // Candidate issues to link (cross-department, excluding self and already linked)
  const candidateIssues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return issues.filter((iss) => {
      if (iss.id === currentIssue.id) return false;
      if (linkedIssueIds.has(iss.id)) return false;

      // Department filter
      if (deptFilter !== 'all' && iss.departmentId !== deptFilter) return false;

      if (!q) return true;

      const codeMatch = iss.code.toLowerCase().includes(q);
      const numMatch = String(iss.number).includes(q);
      const titleMatch = iss.title.toLowerCase().includes(q);
      const dept = departments.find((d) => d.id === iss.departmentId);
      const deptMatch =
        dept?.name.toLowerCase().includes(q) ||
        dept?.code.toLowerCase().includes(q);

      return codeMatch || numMatch || titleMatch || Boolean(deptMatch);
    });
  }, [issues, currentIssue.id, linkedIssueIds, searchQuery, deptFilter, departments]);

  const handleLink = (targetId: string) => {
    linkIssues(currentIssue.id, targetId, selectedRelation);
    setIsAdding(false);
    setSearchQuery('');
  };

  const getStatusBadge = (status: string) => {
    const isDone = status === 'FIXED' || status === 'CLOSED';
    if (isDone) {
      return (
        <span className="font-mono text-[9px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold inline-flex items-center gap-0.5">
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
          {status}
        </span>
      );
    }
    return (
      <span className="font-mono text-[9px] px-1.5 py-0.2 bg-gray-100 text-gray-700 border border-gray-200 rounded">
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-2 pt-2 border-t border-gray-200 w-full min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-gray-500" />
          <label className="text-[11px] font-mono text-gray-700 font-semibold tracking-wide">
            Linked Tickets
          </label>
          {linkedItems.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-gray-200 text-gray-700 rounded-full font-bold">
              {linkedItems.length}
            </span>
          )}
        </div>

        {linkedItems.length > 0 && (
          <button
            ref={toggleButtonRef}
            type="button"
            onClick={() => {
              setIsAdding((prev) => !prev);
              setSearchQuery('');
            }}
            className={`w-14 h-6 inline-flex items-center justify-center gap-1 text-[11px] font-mono rounded border transition-colors cursor-pointer shrink-0 font-medium ${
              isAdding
                ? 'bg-gray-100 text-gray-900 border-gray-400'
                : 'bg-white hover:bg-gray-100 text-blue-600 hover:text-blue-800 border-gray-200'
            }`}
            title={isAdding ? 'Close link popover' : 'Link another ticket'}
          >
            <Plus className={`w-3 h-3 shrink-0 transition-transform duration-150 ${isAdding ? 'rotate-45' : ''}`} />
            <span>Link</span>
          </button>
        )}
      </div>

      {/* Add Link Dropdown / Popover panel */}
      {isAdding && (
        <div
          ref={popoverRef}
          className="w-full box-border p-3 bg-white border border-blue-200 rounded-md shadow-md space-y-2.5 animate-fade-in text-xs min-w-0 overflow-hidden"
        >
          {/* Relation picker */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-gray-500 font-medium block">Relationship:</span>
            <CustomSelect
              value={selectedRelation}
              onChange={(val) => setSelectedRelation(val as LinkRelationType)}
              options={RELATION_OPTIONS}
              size="xs"
            />
          </div>

          {/* Department Quick Filter Tabs if > 1 department */}
          {departments.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setDeptFilter('all')}
                className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-semibold cursor-pointer transition-colors ${
                  deptFilter === 'all'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                All
              </button>
              {departments.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDeptFilter(d.id)}
                  className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-semibold cursor-pointer transition-colors ${
                    deptFilter === d.id
                      ? 'bg-black text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {d.code}
                </button>
              ))}
            </div>
          )}

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, title, or department..."
              className="w-full pl-7 pr-7 py-1 text-xs border border-gray-300 rounded bg-gray-50/50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1.5 text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Candidates list (scrollable) */}
          <div className="max-h-44 overflow-y-auto space-y-1 divide-y divide-gray-100 border border-gray-100 rounded bg-gray-50/30 p-1">
            {candidateIssues.length > 0 ? (
              candidateIssues.slice(0, 10).map((iss) => {
                const dept = departments.find((d) => d.id === iss.departmentId);

                return (
                  <div
                    key={iss.id}
                    onClick={() => handleLink(iss.id)}
                    className="p-1.5 rounded hover:bg-blue-50/70 transition-colors cursor-pointer group flex items-start justify-between gap-1.5 text-left"
                    title={`Click to link as "${RELATION_CONFIG[selectedRelation].label}"`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {dept && (
                          <span className="font-mono text-[9px] px-1 py-0.2 bg-gray-100 border border-gray-200 text-gray-700 rounded font-semibold">
                            {dept.code}
                          </span>
                        )}
                        <span className="font-mono font-bold text-gray-900 text-[11px] group-hover:text-blue-600 transition-colors">
                          {iss.code}
                        </span>
                        {getStatusBadge(iss.status)}
                      </div>
                      <p className="text-[11px] text-gray-700 truncate font-sans mt-0.5 leading-snug">
                        {iss.title}
                      </p>
                    </div>

                    <div className="shrink-0 pt-0.5">
                      <span className="text-[10px] font-mono text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        <Plus className="w-3 h-3" /> Link
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-3 px-2 text-center text-[11px] font-mono text-gray-400">
                {searchQuery ? 'No tickets matching search.' : 'All available tickets are already linked.'}
              </div>
            )}
          </div>

          <div className="text-[10px] font-mono text-gray-400 flex items-center justify-between pt-0.5">
            <span>Click a ticket to link and close.</span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-gray-600 hover:text-black font-semibold cursor-pointer underline"
            >
              Cancel (Esc)
            </button>
          </div>
        </div>
      )}

      {/* List of currently linked tickets */}
      {linkedItems.length > 0 ? (
        <div className="space-y-1.5">
          {linkedItems.map(({ link, target, targetDept, config }) => {
            if (!target) {
              return (
                <div
                  key={link.issueId}
                  className="flex items-center justify-between p-2 rounded bg-white border border-gray-200 text-xs"
                >
                  <span className="text-gray-400 font-mono text-[10px] italic">
                    Deleted ticket ({link.issueId})
                  </span>
                  <button
                    type="button"
                    onClick={() => unlinkIssues(currentIssue.id, link.issueId)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100 cursor-pointer"
                    title="Remove dangling link"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }

            const isDone = target.status === 'FIXED' || target.status === 'CLOSED';
            return (
              <div
                key={target.id}
                onClick={() => setSelectedIssue(target)}
                className="group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 hover:shadow-2xs transition-all cursor-pointer"
                title={`Open ${target.code}: ${target.title}`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                  {/* Relationship */}
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border shrink-0 ${config.badgeClass}`}
                  >
                    {config.label}
                  </span>

                  {/* Department Code */}
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 bg-gray-100 text-gray-700 border border-gray-200 rounded shrink-0">
                    {targetDept?.code || target.departmentId}
                  </span>

                  {/* Ticket Number */}
                  <span
                    className={`font-mono font-bold text-xs group-hover:text-blue-600 transition-colors shrink-0 ${
                      isDone ? 'line-through text-gray-400' : 'text-gray-900'
                    }`}
                  >
                    #{target.number}
                  </span>
                </div>

                {/* Right actions: View icon + Unlink button */}
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className="opacity-0 group-hover:opacity-100 text-gray-400 group-hover:text-blue-600 transition-opacity"
                    title="View ticket"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      unlinkIssues(currentIssue.id, target.id);
                    }}
                    className="p-1 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                    title={`Unlink #${target.number}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !isAdding && (
          <div className="py-2 px-2.5 rounded border border-dashed border-gray-200 bg-gray-50/50 text-[11px] font-mono text-gray-400 flex items-center justify-between">
            <span>No linked tickets</span>
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer hover:underline"
            >
              + Link ticket
            </button>
          </div>
        )
      )}
    </div>
  );
};
