import React, { useState, useEffect, useRef } from 'react';
import { useTickets } from '../../context/TicketContext';
import { PriorityPill } from '../common/PriorityPill';
import { DepartmentBadge } from '../common/DepartmentBadge';
import {
  Search,
  Plus,
  Kanban,
  ListTodo,
  BarChart3,
  Moon,
  Sun,
  Layers,
  Database,
  ArrowRight,
} from 'lucide-react';

interface CommandPaletteProps {
  onOpenSupabaseGuide: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onOpenSupabaseGuide }) => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    tickets,
    departments,
    setSelectedTicket,
    setSelectedDepartment,
    setActiveView,
    setIsCreateModalOpen,
    toggleDarkMode,
    isDarkMode,
  } = useTickets();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  // Filter tickets matching query
  const matchingTickets = query.trim()
    ? tickets
        .filter(
          (t) =>
            t.title.toLowerCase().includes(query.toLowerCase()) ||
            t.code.toLowerCase().includes(query.toLowerCase()) ||
            t.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
        )
        .slice(0, 5)
    : [];

  // Quick action commands
  const quickActions = [
    {
      id: 'create-ticket',
      label: 'Create New Ticket',
      icon: Plus,
      category: 'Actions',
      action: () => {
        setIsCommandPaletteOpen(false);
        setIsCreateModalOpen(true);
      },
    },
    {
      id: 'view-kanban',
      label: 'Go to Kanban Board',
      icon: Kanban,
      category: 'Navigation',
      action: () => {
        setActiveView('kanban');
        setIsCommandPaletteOpen(false);
      },
    },
    {
      id: 'view-list',
      label: 'Go to List / Table View',
      icon: ListTodo,
      category: 'Navigation',
      action: () => {
        setActiveView('list');
        setIsCommandPaletteOpen(false);
      },
    },
    {
      id: 'view-metrics',
      label: 'Go to Metrics & SLA Dashboard',
      icon: BarChart3,
      category: 'Navigation',
      action: () => {
        setActiveView('metrics');
        setIsCommandPaletteOpen(false);
      },
    },
    {
      id: 'toggle-theme',
      label: isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      icon: isDarkMode ? Sun : Moon,
      category: 'Preferences',
      action: () => {
        toggleDarkMode();
        setIsCommandPaletteOpen(false);
      },
    },
    {
      id: 'supabase-guide',
      label: 'View Supabase Schema & Migrations',
      icon: Database,
      category: 'Backend',
      action: () => {
        setIsCommandPaletteOpen(false);
        onOpenSupabaseGuide();
      },
    },
  ];

  const matchingActions = quickActions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => setIsCommandPaletteOpen(false)}
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-xl rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden animate-slide-up">
        {/* Search Input Box */}
        <div className="flex items-center px-4 border-b border-zinc-800">
          <Search className="w-4 h-4 text-zinc-400 mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search tickets..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsCommandPaletteOpen(false);
              }
            }}
            className="w-full py-3.5 bg-transparent text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none font-mono"
          />
          <kbd className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-700/80 px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-4">
          {/* Tickets Results */}
          {matchingTickets.length > 0 && (
            <div>
              <p className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                Matching Tickets
              </p>
              <div className="space-y-1">
                {matchingTickets.map((ticket) => {
                  const dept = departments.find((d) => d.id === ticket.departmentId);
                  return (
                    <button
                      key={ticket.id}
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setIsCommandPaletteOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-zinc-900 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-xs font-semibold text-white group-hover:text-zinc-300">
                          {ticket.code}
                        </span>
                        <span className="text-xs text-zinc-300 truncate">
                          {ticket.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {dept && <DepartmentBadge department={dept} size="sm" />}
                        <PriorityPill priority={ticket.priority} size="sm" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {matchingActions.length > 0 && (
            <div>
              <p className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                Quick Actions
              </p>
              <div className="space-y-1">
                {matchingActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={action.action}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-zinc-900 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-white">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-mono text-zinc-200 group-hover:text-white">
                          {action.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                        {action.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Department switcher commands */}
          {query.trim() === '' && (
            <div>
              <p className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                Jump to Department
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    onClick={() => {
                      setSelectedDepartment(dept.id);
                      setIsCommandPaletteOpen(false);
                    }}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-900 transition-colors text-left text-xs font-mono"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: dept.color }}
                    />
                    <span className="text-zinc-200 truncate">{dept.name}</span>
                    <span className="text-[10px] text-zinc-400 ml-auto">[{dept.code}]</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchingTickets.length === 0 && matchingActions.length === 0 && query.trim() !== '' && (
            <div className="py-8 text-center text-xs font-mono text-zinc-400">
              No tickets or actions found for "{query}".
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-between text-[10px] font-mono text-zinc-400">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span>NUTS Command Engine</span>
        </div>
      </div>
    </div>
  );
};
