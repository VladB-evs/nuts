import React from 'react';
import { useTickets } from '../../context/TicketContext';
import { Priority, TicketStatus, TicketType } from '../../types';
import { cn } from '../../lib/utils';
import {
  Search,
  X,
  Layers,
  Table,
  Inbox,
  UserCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export const FilterBar: React.FC = () => {
  const {
    filters,
    setFilters,
    resetFilters,
    filteredTickets,
    tickets,
    users,
    activeView,
    setActiveView,
    activeQueue,
    setActiveQueue,
  } = useTickets();

  const isFiltered =
    filters.search ||
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.assigneeId !== 'all' ||
    filters.type !== 'all';

  const queueLabels: Record<string, string> = {
    triage: '📥 Triage Queue',
    my_tickets: '👤 Assigned to Me',
    all_open: '⚡ All Active Tickets',
    sla_risk: '⏰ SLA Risk / Breached',
    pending_requester: '⏳ Waiting on Requester',
    resolved_closed: '📁 Resolved & Closed',
  };

  return (
    <div className="w-full px-4 sm:px-6 py-2.5 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Active Queue Indicator + Search + Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Active Queue pill */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900 border border-zinc-750 text-xs font-mono font-semibold text-white">
            <span>{queueLabels[activeQueue] || 'Queue'}</span>
          </div>

          {/* Search box */}
          <div className="relative min-w-[180px] max-w-xs flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search code, title, requester..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="w-full pl-8 pr-7 py-1 text-xs bg-zinc-900 border border-zinc-750 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 font-mono"
            />
            {filters.search && (
              <button
                onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                status: e.target.value as TicketStatus | 'all',
              }))
            }
            className="px-2 py-1 text-xs bg-zinc-900 border border-zinc-750 rounded-lg text-zinc-200 focus:outline-none font-mono cursor-pointer"
          >
            <option value="all">Status: All</option>
            <option value="new">New / Triage</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Waiting on Info</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority Dropdown */}
          <select
            value={filters.priority}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                priority: e.target.value as Priority | 'all',
              }))
            }
            className="px-2 py-1 text-xs bg-zinc-900 border border-zinc-750 rounded-lg text-zinc-200 focus:outline-none font-mono cursor-pointer"
          >
            <option value="all">Priority: All</option>
            <option value="critical">Critical (P0)</option>
            <option value="high">High (P1)</option>
            <option value="medium">Medium (P2)</option>
            <option value="low">Low (P3)</option>
          </select>

          {/* Type Dropdown */}
          <select
            value={filters.type}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                type: e.target.value as TicketType | 'all',
              }))
            }
            className="px-2 py-1 text-xs bg-zinc-900 border border-zinc-750 rounded-lg text-zinc-200 focus:outline-none font-mono cursor-pointer"
          >
            <option value="all">Type: All</option>
            <option value="incident">Incident</option>
            <option value="bug">Bug</option>
            <option value="service_request">Service Request</option>
            <option value="feature">Feature</option>
            <option value="question">Question</option>
          </select>

          {/* Assignee Dropdown */}
          <select
            value={filters.assigneeId}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, assigneeId: e.target.value }))
            }
            className="px-2 py-1 text-xs bg-zinc-900 border border-zinc-750 rounded-lg text-zinc-200 focus:outline-none font-mono cursor-pointer"
          >
            <option value="all">Assignee: All</option>
            <option value="unassigned">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono text-zinc-400 hover:text-white bg-zinc-900 rounded border border-zinc-700 transition-colors"
            >
              <X className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}

          <span className="text-[11px] font-mono text-zinc-500 ml-1">
            {filteredTickets.length} of {tickets.length} tickets
          </span>
        </div>

        {/* Right: Switch between Split Console and Table View */}
        <div className="hidden sm:flex items-center border border-zinc-750 rounded-lg p-0.5 bg-zinc-900 shrink-0">
          <button
            onClick={() => setActiveView('console')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors',
              activeView === 'console'
                ? 'bg-zinc-800 text-white font-medium shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
            title="Ticketing Split Console"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Console</span>
          </button>

          <button
            onClick={() => setActiveView('table')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors',
              activeView === 'table'
                ? 'bg-zinc-800 text-white font-medium shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
            title="Dense Table View"
          >
            <Table className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
        </div>
      </div>
    </div>
  );
};
