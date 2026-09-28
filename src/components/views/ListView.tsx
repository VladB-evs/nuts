import React, { useState } from 'react';
import { useTickets } from '../../context/TicketContext';
import { Ticket, Priority, TicketStatus, ResolutionReason } from '../../types';
import { PriorityPill } from '../common/PriorityPill';
import { StatusBadge } from '../common/StatusBadge';
import { SlaBadge } from '../common/SlaBadge';
import { DepartmentBadge } from '../common/DepartmentBadge';
import { Avatar } from '../common/Avatar';
import { formatDate } from '../../lib/utils';
import { ArrowUpDown, Plus, UserCheck, CheckCircle2, Trash2 } from 'lucide-react';

type SortField = 'code' | 'title' | 'priority' | 'createdAt' | 'slaDeadline';
type SortOrder = 'asc' | 'desc';

export const ListView: React.FC = () => {
  const {
    filteredTickets,
    setSelectedTicket,
    setActiveView,
    departments,
    currentUser,
    assignTicketToMe,
    resolveTicket,
    deleteTicket,
    setIsCreateModalOpen,
  } = useTickets();

  const [sortField, setSortField] = useState<SortField>('slaDeadline');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
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
    } else if (sortField === 'slaDeadline') {
      comparison = new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime();
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="hidden lg:flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 text-[11px] font-mono text-zinc-400 select-none">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => handleSort('code')}
              className="flex items-center gap-1 hover:text-white transition-colors w-24"
            >
              <span>KEY</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
            <span className="w-24">TYPE</span>
            <span className="w-32">REQUESTER</span>
            <button
              onClick={() => handleSort('title')}
              className="flex items-center gap-1 hover:text-white transition-colors flex-1"
            >
              <span>SUBJECT</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <span className="w-28 text-center">DEPARTMENT</span>
            <span className="w-28 text-center">STATUS</span>
            <button
              onClick={() => handleSort('priority')}
              className="flex items-center gap-1 hover:text-white transition-colors w-16"
            >
              <span>PRIORITY</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleSort('slaDeadline')}
              className="flex items-center gap-1 hover:text-white transition-colors w-24 justify-end"
            >
              <span>SLA TARGET</span>
              <ArrowUpDown className="w-3 h-3" />
            </button>
            <span className="w-8 text-center">AGENT</span>
            <span className="w-16 text-right">ACTIONS</span>
          </div>
        </div>

        {/* Table Rows */}
        {sortedTickets.length > 0 ? (
          <div className="divide-y divide-zinc-850">
            {sortedTickets.map((ticket) => {
              const dept = departments.find((d) => d.id === ticket.departmentId);
              const rDept = departments.find((d) => d.id === ticket.requesterDepartmentId);

              return (
                <div
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setActiveView('console');
                  }}
                  className="group flex flex-col lg:flex-row lg:items-center justify-between p-3.5 hover:bg-zinc-900/60 cursor-pointer transition-colors gap-2 text-xs"
                >
                  {/* Left Side: Code, Type, Requester, Title */}
                  <div className="flex items-start lg:items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: dept?.color }}
                      />
                      <span className="font-mono font-bold text-white group-hover:underline">
                        {ticket.code}
                      </span>
                    </div>

                    <span className="hidden lg:inline-block w-24 font-mono text-[10px] uppercase text-zinc-400 truncate">
                      {ticket.type.replace('_', ' ')}
                    </span>

                    <div className="w-32 flex-shrink-0 truncate font-mono text-[11px] text-zinc-300">
                      <span>{ticket.reporter.name}</span>
                      {rDept && (
                        <span className="text-zinc-500 text-[10px] ml-1">[{rDept.code}]</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-100 truncate group-hover:text-white">
                        {ticket.title}
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Dept, Status, Priority, SLA, Agent, Actions */}
                  <div
                    className="flex items-center justify-between lg:justify-end gap-3 flex-shrink-0 pt-1 lg:pt-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {dept && (
                      <div className="w-28 text-center hidden lg:block">
                        <DepartmentBadge department={dept} size="sm" />
                      </div>
                    )}

                    <div className="w-28 text-center">
                      <StatusBadge status={ticket.status} size="sm" />
                    </div>

                    <div className="w-16">
                      <PriorityPill priority={ticket.priority} size="sm" showIcon={false} />
                    </div>

                    <div className="w-24 text-right">
                      <SlaBadge deadline={ticket.slaDeadline} status={ticket.status} size="sm" />
                    </div>

                    <div className="w-8 flex items-center justify-center">
                      <Avatar user={ticket.assignee} size="xs" />
                    </div>

                    <div className="flex items-center gap-1 w-16 justify-end">
                      {ticket.assignee?.id !== currentUser.id && (
                        <button
                          onClick={() => assignTicketToMe(ticket.id)}
                          className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"
                          title="Assign to me"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {ticket.status !== 'resolved' && (
                        <button
                          onClick={() => resolveTicket(ticket.id, 'resolved_fixed')}
                          className="p-1 text-zinc-400 hover:text-emerald-400 rounded hover:bg-zinc-800"
                          title="Mark Resolved"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${ticket.code}?`)) {
                            deleteTicket(ticket.id);
                          }
                        }}
                        className="p-1 text-zinc-400 hover:text-rose-400 rounded hover:bg-zinc-800"
                        title="Delete ticket"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center space-y-3">
            <p className="font-mono text-sm text-zinc-400">No tickets found in this queue.</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Submit Ticket</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
