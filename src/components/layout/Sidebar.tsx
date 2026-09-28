import React from 'react';
import { useTickets } from '../../context/TicketContext';
import { getDepartmentIcon } from '../common/DepartmentBadge';
import { cn } from '../../lib/utils';
import {
  Kanban,
  ListTodo,
  BarChart3,
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
    departments,
    selectedDepartment,
    setSelectedDepartment,
    tickets,
    metrics,
    resetToDefaultData,
  } = useTickets();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-zinc-800 bg-zinc-950/70 p-4 select-none shrink-0 h-[calc(100vh-3.5rem)] sticky top-14">
      {/* Navigation views */}
      <div className="space-y-1 mb-6">
        <p className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
          Views
        </p>

        <button
          onClick={() => setActiveView('kanban')}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors font-mono',
            activeView === 'kanban'
              ? 'bg-zinc-900 text-white border border-zinc-700/80 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
          )}
        >
          <div className="flex items-center gap-2.5">
            <Kanban className="w-4 h-4 text-zinc-400" />
            <span>Kanban Board</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400">
            {tickets.filter((t) => t.status !== 'done').length}
          </span>
        </button>

        <button
          onClick={() => setActiveView('list')}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors font-mono',
            activeView === 'list'
              ? 'bg-zinc-900 text-white border border-zinc-700/80 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
          )}
        >
          <div className="flex items-center gap-2.5">
            <ListTodo className="w-4 h-4 text-zinc-400" />
            <span>List & Table</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400">
            {tickets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveView('metrics')}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors font-mono',
            activeView === 'metrics'
              ? 'bg-zinc-900 text-white border border-zinc-700/80 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
          )}
        >
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-4 h-4 text-zinc-400" />
            <span>Metrics & SLA</span>
          </div>
          {metrics.critical > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-800/50 font-bold">
              {metrics.critical} P0
            </span>
          )}
        </button>
      </div>

      {/* Departments filter list */}
      <div className="flex-1 overflow-y-auto space-y-1 mb-4 no-scrollbar">
        <div className="flex items-center justify-between px-2 pb-1.5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            Departments
          </p>
          <span className="text-[10px] font-mono text-zinc-400">
            {departments.length} teams
          </span>
        </div>

        <button
          onClick={() => setSelectedDepartment('all')}
          className={cn(
            'w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors font-mono',
            selectedDepartment === 'all'
              ? 'bg-zinc-900 text-white font-medium border border-zinc-800'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>All Departments</span>
          </div>
          <span className="text-[10px] text-zinc-400">{tickets.length}</span>
        </button>

        {departments.map((dept) => {
          const isSelected = selectedDepartment === dept.id;
          const count = tickets.filter((t) => t.departmentId === dept.id).length;

          return (
            <button
              key={dept.id}
              onClick={() => setSelectedDepartment(dept.id)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors font-mono group',
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
                <span className="text-[10px] font-mono text-zinc-400 group-hover:text-zinc-400">
                  {dept.code}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {count}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Supabase & Reset Actions */}
      <div className="pt-3 border-t border-zinc-900 space-y-1.5">
        <button
          onClick={onOpenSupabaseGuide}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono text-zinc-400 hover:text-white hover:bg-zinc-900 border border-dashed border-zinc-800/80 transition-colors"
        >
          <Database className="w-3.5 h-3.5 text-zinc-400" />
          <span>Supabase Backend</span>
          <span className="ml-auto text-[10px] bg-zinc-800 px-1 rounded text-zinc-400">SQL</span>
        </button>

        <button
          onClick={() => {
            if (confirm('Reset all tickets and departments back to default starter data?')) {
              resetToDefaultData();
            }
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/40 transition-colors"
        >
          <RotateCcw className="w-3 h-3 text-zinc-400" />
          <span>Reset Demo Data</span>
        </button>
      </div>
    </aside>
  );
};
