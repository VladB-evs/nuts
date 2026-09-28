import React, { useState } from 'react';
import { useTickets } from '../../context/TicketContext';
import { TicketStatus } from '../../types';
import { TicketCard } from '../tickets/TicketCard';
import { STATUS_CONFIG } from '../common/StatusBadge';
import { Plus, Archive, Circle, PlayCircle, Clock, CheckCircle2 } from 'lucide-react';

const COLUMNS: { id: TicketStatus; label: string; icon: any }[] = [
  { id: 'backlog', label: 'Backlog', icon: Archive },
  { id: 'todo', label: 'To Do', icon: Circle },
  { id: 'in_progress', label: 'In Progress', icon: PlayCircle },
  { id: 'in_review', label: 'In Review', icon: Clock },
  { id: 'done', label: 'Done', icon: CheckCircle2 },
];

export const KanbanView: React.FC = () => {
  const {
    filteredTickets,
    setSelectedTicket,
    moveTicketStatus,
    setIsCreateModalOpen,
  } = useTickets();

  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<TicketStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    e.dataTransfer.setData('text/plain', ticketId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTicketId(ticketId);
  };

  const handleDragOver = (e: React.DragEvent, status: TicketStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropColumn !== status) {
      setActiveDropColumn(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the drop container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setActiveDropColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TicketStatus) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData('text/plain') || draggedTicketId;
    if (ticketId) {
      moveTicketStatus(ticketId, targetStatus);
    }
    setDraggedTicketId(null);
    setActiveDropColumn(null);
  };

  return (
    <div className="flex-1 overflow-x-auto p-4 sm:p-6 no-scrollbar">
      <div className="flex items-start gap-4 min-w-[1250px] pb-8">
        {COLUMNS.map((col) => {
          const colTickets = filteredTickets.filter((t) => t.status === col.id);
          const config = STATUS_CONFIG[col.id];
          const Icon = col.icon;
          const isDropActive = activeDropColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`w-72 sm:w-80 flex-shrink-0 flex flex-col rounded-xl border transition-colors ${
                isDropActive
                  ? 'border-white bg-zinc-900/90 ring-2 ring-white/20'
                  : 'border-zinc-800/80 bg-zinc-950/50'
              }`}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-zinc-850 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${config.dotColor}`}
                  />
                  <Icon className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="font-mono text-xs font-semibold text-zinc-200">
                    {col.label}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400 px-1.5 py-0.2 rounded-full bg-zinc-900 border border-zinc-800">
                    {colTickets.length}
                  </span>
                </div>

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
                  title={`Add ticket to ${col.label}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Ticket Cards Container */}
              <div className="p-2 space-y-2.5 min-h-[450px] max-h-[calc(100vh-16rem)] overflow-y-auto">
                {colTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, ticket.id)}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <TicketCard
                      ticket={ticket}
                      onSelect={() => setSelectedTicket(ticket)}
                    />
                  </div>
                ))}

                {colTickets.length === 0 && (
                  <div className="h-32 border border-dashed border-zinc-800/80 rounded-lg flex items-center justify-center text-center p-4">
                    <p className="font-mono text-[11px] text-zinc-400">
                      {isDropActive ? 'Drop ticket here' : 'No tickets in this column'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
