import React from 'react';
import { useTickets } from '../../context/TicketContext';
import { QueueId, ViewMode } from '../../types';
import { cn } from '../../lib/utils';
import {
  Inbox,
  UserCheck,
  Layers,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Table,
  BarChart3,
  HelpCircle,
  Database,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  onOpenSupabaseGuide: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSupabaseGuide }) => {
  const {
    activeView,
    setActiveView,
    activeQueue,
    setActiveQueue,
    departments,
    selectedDepartment,
    setSelectedDepartment,
    tickets,
    queueCounts,
    metrics,
    resetToDefaultData,
  } = useTickets();

  const queues: { id: QueueId; label: string; icon: any; isUrgent?: boolean }[] = [
    { id: 'triage', label: 'Triage Queue', icon: Inbox },
    { id: 'my_tickets', label: 'Assigned to Me', icon: UserCheck },
    { id: 'all_open', label: 'All Active Tickets', icon: Layers },
    { id: 'sla_risk', label: 'SLA Risk / Breached', icon: AlertTriangle, isUrgent: true },
    { id: 'pending_requester', label: 'Waiting on Requester', icon: Clock },
    { id: 'resolved_closed', label: 'Resolved & Closed', icon: CheckCircle2 },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-zinc-800 bg-zinc-950 p-3.5 select-none shrink-0 h-[calc(100vh-3.5rem)] sticky top-14">
      {/* Primary Workspaces / Modes */}
      <div className="space-y-1 mb-5">
        <p className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
          Workspace
        </p>

        <button
          onClick={() => setActiveView('console')}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono font-medium transition-colors',
            activeView === 'console'
              ? 'bg-zinc-900 text-white border border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
          )}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white" />
            <span>Ticketing Console</span>
          </div>
          <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
            Split
          </span>
        </button>

        <button
          onClick={() => setActiveView('table')}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono font-medium transition-colors',
            activeView === 'table'
              ? 'bg-zinc-900 text-white border border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
          )}
        >
          <div className="flex items-center gap-2">
            <Table className="w-3.5 h-3.5 text-zinc-400" />
            <span>Table & Filters</span>
          </div>
        </button>

        <button
          onClick={() => setActiveView('portal')}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono font-medium transition-colors',
            activeView === 'portal'
              ? 'bg-zinc-900 text-white border border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
          )}
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
            <span>Submit a Ticket</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">Portal</span>
        </button>

        <button
          onClick={() => setActiveView('sla_metrics')}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono font-medium transition-colors',
            activeView === 'sla_metrics'
              ? 'bg-zinc-900 text-white border border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
          )}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5 text-zinc-400" />
            <span>SLA Performance</span>
          </div>
          {metrics.slaBreached > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800 font-bold">
              {metrics.slaBreached}
            </span>
          )}
        </button>
      </div>

      {/* Ticket Queues */}
      <div className="space-y-1 mb-5">
        <p className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
          Service Queues
        </p>

        {queues.map((q) => {
          const Icon = q.icon;
          const isSelected = activeQueue === q.id && (activeView === 'console' || activeView === 'table');
          const count = queueCounts[q.id];

          return (
            <button
              key={q.id}
              onClick={() => {
                setActiveQueue(q.id);
                if (activeView !== 'console' && activeView !== 'table') {
                  setActiveView('console');
                }
              }}
              className={cn(
                'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors',
                isSelected
                  ? 'bg-zinc-900 text-white font-medium border border-zinc-750'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <Icon
                  className={cn(
                    'w-3.5 h-3.5 flex-shrink-0',
                    q.isUrgent && count > 0 ? 'text-rose-400' : 'text-zinc-400'
                  )}
                />
                <span className="truncate">{q.label}</span>
              </div>

              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded font-mono',
                  q.isUrgent && count > 0
                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Department Routing Queues */}
      <div className="flex-1 overflow-y-auto space-y-1 mb-4 no-scrollbar">
        <p className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
          Department Queues
        </p>

        <button
          onClick={() => setSelectedDepartment('all')}
          className={cn(
            'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors',
            selectedDepartment === 'all'
              ? 'bg-zinc-900 text-white font-medium border border-zinc-800'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>All Departments</span>
          </div>
          <span className="text-[10px] text-zinc-500">{tickets.length}</span>
        </button>

        {departments.map((dept) => {
          const isSelected = selectedDepartment === dept.id;
          const count = tickets.filter((t) => t.departmentId === dept.id).length;

          return (
            <button
              key={dept.id}
              onClick={() => setSelectedDepartment(dept.id)}
              className={cn(
                'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors group',
                isSelected
                  ? 'bg-zinc-900 text-white font-medium border border-zinc-800'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: dept.color }}
                />
                <span className="truncate">{dept.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-500 font-mono">[{dept.code}]</span>
                <span className="text-[10px] text-zinc-400 font-mono">{count}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="pt-3 border-t border-zinc-900 space-y-1.5">
        <button
          onClick={onOpenSupabaseGuide}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono text-zinc-400 hover:text-white hover:bg-zinc-900 border border-dashed border-zinc-800 transition-colors"
        >
          <Database className="w-3.5 h-3.5 text-zinc-400" />
          <span>Supabase Backend</span>
          <span className="ml-auto text-[10px] bg-zinc-800 px-1 rounded text-zinc-400">SQL</span>
        </button>

        <button
          onClick={() => {
            if (confirm('Reset tickets and queues back to default starter state?')) {
              resetToDefaultData();
            }
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40 transition-colors"
        >
          <RotateCcw className="w-3 h-3 text-zinc-500" />
          <span>Reset Demo Tickets</span>
        </button>
      </div>
    </aside>
  );
};
