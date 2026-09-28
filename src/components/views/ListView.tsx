import React, { useState } from 'react';
import { useTickets } from '../../context/TicketContext';
import { TicketRow } from '../tickets/TicketRow';
import { ArrowUpDown, Plus } from 'lucide-react';
import { Ticket } from '../../types';

type SortField = 'code' | 'title' | 'priority' | 'createdAt' | 'dueDate';
type SortOrder = 'asc' | 'desc';

export const ListView: React.FC = () => {
  const { filteredTickets, setSelectedTicket, setIsCreateModalOpen } = useTickets();

  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const priorityWeight = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  const sortedTickets = [...filteredTickets].sort((a: Ticket, b: Ticket) => {
    let comparison = 0;
    if (sortField === 'code') {
      comparison = a.code.localeCompare(b.code);
    } else if (sortField === 'title') {
      comparison = a.title.localeCompare(b.title);
    } else if (sortField === 'priority') {
      comparison = priorityWeight[a.priority] - priorityWeight[b.priority];
    } else if (sortField === 'createdAt') {
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortField === 'dueDate') {
      const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      comparison = aTime - bTime;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden shadow-sm">
        {/* Table Header on Desktop */}
        <div className="hidden sm:flex items-center justify-between px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800 text-[11px] font-mono text-zinc-400 select-none">
          <div className="flex items-center gap-6 flex-1">
            <button
              onClick={() => handleSort('code')}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <span>KEY</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
            <span className="hidden md:inline-block w-24">DEPARTMENT</span>
            <button
              onClick={() => handleSort('title')}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <span>SUMMARY</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-6 flex-shrink-0">
            <span className="w-24 text-center">STATUS</span>
            <button
              onClick={() => handleSort('priority')}
              className="flex items-center gap-1 hover:text-white transition-colors w-16"
            >
              <span>PRIORITY</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
            <span className="w-6 text-center">ASSIGNEE</span>
            <span className="hidden lg:inline-block w-16 text-right">TASKS</span>
            <button
              onClick={() => handleSort('dueDate')}
              className="hidden md:flex items-center gap-1 hover:text-white transition-colors w-20 justify-end"
            >
              <span>DUE DATE</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
            <span className="w-12 text-right">ACTIONS</span>
          </div>
        </div>

        {/* List Content */}
        {sortedTickets.length > 0 ? (
          <div>
            {sortedTickets.map((ticket) => (
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                onSelect={() => setSelectedTicket(ticket)}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center space-y-3">
            <p className="font-mono text-sm text-zinc-400">
              No tickets match your active filters.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Ticket</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
