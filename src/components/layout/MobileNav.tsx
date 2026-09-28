import React from 'react';
import { useTickets } from '../../context/TicketContext';
import { cn } from '../../lib/utils';
import {
  Kanban,
  ListTodo,
  BarChart3,
  Plus,
  Layers,
  X,
  Database,
  RotateCcw,
} from 'lucide-react';
import { getDepartmentIcon } from '../common/DepartmentBadge';

interface MobileNavProps {
  onOpenSupabaseGuide: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenSupabaseGuide }) => {
  const {
    activeView,
    setActiveView,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    setIsCreateModalOpen,
    departments,
    selectedDepartment,
    setSelectedDepartment,
    tickets,
    resetToDefaultData,
  } = useTickets();

  return (
    <>
      {/* Bottom Navigation Bar for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-3 py-1.5 flex items-center justify-around safe-area-bottom">
        <button
          onClick={() => setActiveView('kanban')}
          className={cn(
            'flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-mono transition-colors',
            activeView === 'kanban'
              ? 'text-white font-medium'
              : 'text-zinc-400 hover:text-zinc-200'
          )}
        >
          <Kanban className="w-4 h-4" />
          <span>Board</span>
        </button>

        <button
          onClick={() => setActiveView('list')}
          className={cn(
            'flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-mono transition-colors',
            activeView === 'list'
              ? 'text-white font-medium'
              : 'text-zinc-400 hover:text-zinc-200'
          )}
        >
          <ListTodo className="w-4 h-4" />
          <span>List</span>
        </button>

        {/* Center Quick Action: New Ticket */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center w-11 h-11 -mt-4 rounded-full bg-white text-black shadow-lg hover:bg-zinc-200 active:scale-95 transition-transform border border-zinc-700"
          aria-label="Create new ticket"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>

        <button
          onClick={() => setActiveView('metrics')}
          className={cn(
            'flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-mono transition-colors',
            activeView === 'metrics'
              ? 'text-white font-medium'
              : 'text-zinc-400 hover:text-zinc-200'
          )}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Metrics</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-mono text-zinc-400 hover:text-zinc-200"
        >
          <Layers className="w-4 h-4" />
          <span>Depts</span>
        </button>
      </nav>

      {/* Slide-out Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-4/5 max-w-sm bg-zinc-950 border-r border-zinc-800 p-5 flex flex-col h-full shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white text-base">NUTS</span>
                <span className="text-[10px] font-mono text-zinc-500 border border-zinc-800 px-1 rounded">
                  MOBILE
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Department List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-1">
              <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">
                Filter by Department
              </p>

              <button
                onClick={() => {
                  setSelectedDepartment('all');
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-mono transition-colors',
                  selectedDepartment === 'all'
                    ? 'bg-white text-black font-semibold'
                    : 'text-zinc-300 hover:bg-zinc-900'
                )}
              >
                <span>All Departments</span>
                <span className="text-[10px]">{tickets.length}</span>
              </button>

              {departments.map((dept) => {
                const isSelected = selectedDepartment === dept.id;
                const count = tickets.filter((t) => t.departmentId === dept.id).length;

                return (
                  <button
                    key={dept.id}
                    onClick={() => {
                      setSelectedDepartment(dept.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-mono transition-colors',
                      isSelected
                        ? 'bg-zinc-800 text-white font-medium border border-zinc-700'
                        : 'text-zinc-400 hover:bg-zinc-900'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: dept.color }}
                      />
                      <span>{dept.name}</span>
                    </div>
                    <span className="text-[10px]">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-zinc-850 space-y-2">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenSupabaseGuide();
                }}
                className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-mono bg-zinc-900 border border-zinc-800 text-zinc-200"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Supabase Backend Guide</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Reset to default starter data?')) {
                    resetToDefaultData();
                    setIsMobileMenuOpen(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-[11px] font-mono text-zinc-500 hover:text-zinc-300"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Demo Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
