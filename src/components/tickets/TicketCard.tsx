import React from 'react';
import { Ticket, TicketStatus } from '../../types';
import { useTickets } from '../../context/TicketContext';
import { PriorityPill } from '../common/PriorityPill';
import { Avatar } from '../common/Avatar';
import { formatDate } from '../../lib/utils';
import {
  CheckSquare,
  MessageSquare,
  Calendar,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  CheckCircle2,
} from 'lucide-react';

interface TicketCardProps {
  ticket: Ticket;
  onSelect: () => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, onSelect }) => {
  const { departments, moveTicketStatus } = useTickets();
  const department = departments.find((d) => d.id === ticket.departmentId);

  const completedChecklist = ticket.checklist.filter((c) => c.completed).length;
  const totalChecklist = ticket.checklist.length;

  // Status transitions for quick actions
  const statusFlow: TicketStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
  const currentIndex = statusFlow.indexOf(ticket.status);
  const prevStatus = currentIndex > 0 ? statusFlow[currentIndex - 1] : null;
  const nextStatus = currentIndex < statusFlow.length - 1 ? statusFlow[currentIndex + 1] : null;

  return (
    <div
      onClick={onSelect}
      className="group relative bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-650 rounded-xl p-3.5 transition-all cursor-pointer shadow-sm hover:shadow-md flex flex-col gap-2.5"
    >
      {/* Top Header: Code, Dept indicator, and Priority */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: department?.color || '#ffffff' }}
            title={department?.name}
          />
          <span className="font-mono text-xs font-semibold text-zinc-300 group-hover:text-white">
            {ticket.code}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <PriorityPill priority={ticket.priority} size="sm" />
        </div>
      </div>

      {/* Title */}
      <h4 className="text-xs font-medium text-zinc-100 leading-snug line-clamp-2">
        {ticket.title}
      </h4>

      {/* Tags */}
      {ticket.tags && ticket.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {ticket.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800"
            >
              #{tag}
            </span>
          ))}
          {ticket.tags.length > 3 && (
            <span className="text-[10px] font-mono text-zinc-500 self-center">
              +{ticket.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Card Footer: Metadata & Assignee */}
      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-zinc-400 text-xs">
        <div className="flex items-center gap-2.5 font-mono text-[11px]">
          {/* Checklist progress */}
          {totalChecklist > 0 && (
            <span
              className={`flex items-center gap-1 ${
                completedChecklist === totalChecklist ? 'text-emerald-400 font-semibold' : ''
              }`}
              title={`${completedChecklist} of ${totalChecklist} tasks done`}
            >
              <CheckSquare className="w-3 h-3 text-zinc-500" />
              <span>
                {completedChecklist}/{totalChecklist}
              </span>
            </span>
          )}

          {/* Comments count */}
          {ticket.comments.length > 0 && (
            <span
              className="flex items-center gap-1"
              title={`${ticket.comments.length} comments`}
            >
              <MessageSquare className="w-3 h-3 text-zinc-500" />
              <span>{ticket.comments.length}</span>
            </span>
          )}

          {/* Due date */}
          {ticket.dueDate && (
            <span
              className="flex items-center gap-1"
              title={`Due ${formatDate(ticket.dueDate)}`}
            >
              <Calendar className="w-3 h-3 text-zinc-500" />
              <span>{formatDate(ticket.dueDate)}</span>
            </span>
          )}
        </div>

        {/* Assignee Avatar */}
        <Avatar user={ticket.assignee} size="xs" />
      </div>

      {/* Quick Move Status Hover Buttons */}
      <div
        className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2.5 right-2 flex items-center gap-1 bg-zinc-950 border border-zinc-750 rounded-md p-0.5 shadow-lg z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {prevStatus && (
          <button
            onClick={() => moveTicketStatus(ticket.id, prevStatus)}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
            title={`Move back to ${prevStatus}`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
        {nextStatus && (
          <button
            onClick={() => moveTicketStatus(ticket.id, nextStatus)}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
            title={`Move forward to ${nextStatus}`}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
        {ticket.status !== 'done' && (
          <button
            onClick={() => moveTicketStatus(ticket.id, 'done')}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-emerald-400"
            title="Mark as Done"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
