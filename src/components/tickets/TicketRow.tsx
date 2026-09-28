import React from 'react';
import { Ticket, TicketStatus } from '../../types';
import { useTickets } from '../../context/TicketContext';
import { PriorityPill } from '../common/PriorityPill';
import { StatusBadge } from '../common/StatusBadge';
import { DepartmentBadge } from '../common/DepartmentBadge';
import { Avatar } from '../common/Avatar';
import { formatDate } from '../../lib/utils';
import { CheckSquare, MessageSquare, Trash2, CheckCircle2 } from 'lucide-react';

interface TicketRowProps {
  ticket: Ticket;
  onSelect: () => void;
}

export const TicketRow: React.FC<TicketRowProps> = ({ ticket, onSelect }) => {
  const { departments, moveTicketStatus, deleteTicket } = useTickets();
  const department = departments.find((d) => d.id === ticket.departmentId);

  const completedChecklist = ticket.checklist.filter((c) => c.completed).length;
  const totalChecklist = ticket.checklist.length;

  return (
    <div
      onClick={onSelect}
      className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:px-4 sm:py-3 border-b border-zinc-800/80 hover:bg-zinc-900/50 transition-colors cursor-pointer gap-2.5"
    >
      {/* Left side: Code, Dept, Title & Tags */}
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        {/* Ticket Code */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="w-2 h-2 rounded-full hidden sm:block flex-shrink-0"
            style={{ backgroundColor: department?.color || '#ffffff' }}
          />
          <span className="font-mono text-xs font-semibold text-zinc-300 group-hover:text-white">
            {ticket.code}
          </span>
        </div>

        {/* Department Badge */}
        {department && (
          <div className="hidden md:block flex-shrink-0">
            <DepartmentBadge department={department} size="sm" />
          </div>
        )}

        {/* Title and tags */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-100 truncate group-hover:text-white">
            {ticket.title}
          </p>
          {ticket.tags && ticket.tags.length > 0 && (
            <div className="flex items-center gap-1.5 mt-0.5">
              {ticket.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-800"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Status, Priority, Assignee, Due Date & Actions */}
      <div
        className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Status Dropdown */}
        <select
          value={ticket.status}
          onChange={(e) => moveTicketStatus(ticket.id, e.target.value as TicketStatus)}
          className="px-2 py-1 text-xs bg-zinc-900 border border-zinc-800 rounded font-mono text-zinc-300 focus:outline-none focus:border-zinc-600 cursor-pointer"
        >
          <option value="backlog">Backlog</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="in_review">In Review</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Priority */}
        <PriorityPill priority={ticket.priority} size="sm" />

        {/* Assignee */}
        <div className="w-6 flex items-center justify-center">
          <Avatar user={ticket.assignee} size="xs" />
        </div>

        {/* Tasks & comments counter */}
        <div className="hidden lg:flex items-center gap-2 font-mono text-[10px] text-zinc-400 w-16 justify-end">
          {totalChecklist > 0 && (
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3 text-zinc-400" />
              {completedChecklist}/{totalChecklist}
            </span>
          )}
          {ticket.comments.length > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-zinc-400" />
              {ticket.comments.length}
            </span>
          )}
        </div>

        {/* Due Date */}
        <span className="hidden md:inline-block font-mono text-xs text-zinc-400 w-20 text-right">
          {ticket.dueDate ? formatDate(ticket.dueDate) : '—'}
        </span>

        {/* Row actions */}
        <div className="flex items-center gap-1">
          {ticket.status !== 'done' && (
            <button
              onClick={() => moveTicketStatus(ticket.id, 'done')}
              className="p-1 text-zinc-400 hover:text-emerald-400 rounded hover:bg-zinc-800 transition-colors"
              title="Quick Complete"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => {
              if (confirm(`Delete ${ticket.code}: "${ticket.title}"?`)) {
                deleteTicket(ticket.id);
              }
            }}
            className="p-1 text-zinc-400 hover:text-rose-400 rounded hover:bg-zinc-800 transition-colors"
            title="Delete ticket"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
