import React from 'react';
import { useTickets } from '../../context/TicketContext';
import { Priority, TicketStatus, ViewMode } from '../../types';
import { cn } from '../../lib/utils';
import {
  Search,
  Filter,
  X,
  Kanban,
  ListTodo,
  BarChart3,
  SlidersHorizontal,
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
  } = useTickets();

  const isFiltered =
    filters.search ||
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.assigneeId !== 'all';

  return (
    <div className="w-full px-4 sm:px-6 py-3 border-b border-zinc-800 bg-zinc-950/40">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Search & Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Filter by keyword, #tag..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-zinc-900 border border-zinc-700/80 rounded-lg text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-zinc-500 font-mono"
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
            className="px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700/80 rounded-lg text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono cursor-pointer"
          >
            <option value="all">Status: All</option>
            <option value="backlog">Backlog</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="done">Done</option>
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
            className="px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700/80 rounded-lg text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono cursor-pointer"
          >
            <option value="all">Priority: All</option>
            <option value="critical">Critical (P0)</option>
            <option value="high">High (P1)</option>
            <option value="medium">Medium (P2)</option>
            <option value="low">Low (P3)</option>
          </select>

          {/* Assignee Dropdown */}
          <select
            value={filters.assigneeId}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, assigneeId: e.target.value }))
            }
            className="px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700/80 rounded-lg text-zinc-200 focus:outline-none focus:border-zinc-500 font-mono cursor-pointer"
          >
            <option value="all">Assignee: All</option>
            <option value="unassigned">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {/* Reset Filters button */}
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 rounded-lg border border-zinc-700/60 transition-colors"
            >
              <X className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}

          {/* Match counter */}
          <span className="text-xs font-mono text-zinc-400 ml-1">
            {filteredTickets.length} of {tickets.length} tickets
          </span>
        </div>

        {/* Right: View toggle switcher for desktop / tablet */}
        <div className="hidden sm:flex items-center border border-zinc-700/80 rounded-lg p-0.5 bg-zinc-900">
          <button
            onClick={() => setActiveView('kanban')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors',
              activeView === 'kanban'
                ? 'bg-zinc-800 text-white font-medium shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
            title="Kanban Board View"
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Board</span>
          </button>

          <button
            onClick={() => setActiveView('list')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors',
              activeView === 'list'
                ? 'bg-zinc-800 text-white font-medium shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
            title="List / Table View"
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>List</span>
          </button>

          <button
            onClick={() => setActiveView('metrics')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors',
              activeView === 'metrics'
                ? 'bg-zinc-800 text-white font-medium shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
            title="Analytics & Metrics"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Metrics</span>
          </button>
        </div>
      </div>
    </div>
  );
};
