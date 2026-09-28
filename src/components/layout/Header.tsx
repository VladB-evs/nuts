import React from 'react';
import { useTickets } from '../../context/TicketContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { Avatar } from '../common/Avatar';
import {
  Search,
  Plus,
  Moon,
  Sun,
  Menu,
  Database,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';

interface HeaderProps {
  onOpenSupabaseGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSupabaseGuide }) => {
  const {
    isDarkMode,
    toggleDarkMode,
    setIsCreateModalOpen,
    setIsCommandPaletteOpen,
    setIsMobileMenuOpen,
    currentUser,
    setCurrentUser,
    users,
  } = useTickets();

  const [showUserDropdown, setShowUserDropdown] = React.useState(false);
  const supabaseReady = isSupabaseConfigured();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-black/90 backdrop-blur-md">
      <div className="flex items-center justify-between h-14 px-4 sm:px-6">
        {/* Left: Mobile menu toggle + Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 focus:outline-none"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center p-1.5 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" className="w-full h-full">
                <path d="M50 20L76 35V65L50 80L24 65V35L50 20Z" stroke="#ffffff" strokeWidth="7" strokeLinejoin="round"/>
                <circle cx="50" cy="50" r="14" fill="#ffffff"/>
                <circle cx="50" cy="50" r="6" fill="#09090b"/>
                <line x1="50" y1="20" x2="50" y2="36" stroke="#ffffff" strokeWidth="5" strokeLinecap="round"/>
                <line x1="76" y1="65" x2="62" y2="57" stroke="#ffffff" strokeWidth="5" strokeLinecap="round"/>
                <line x1="24" y1="65" x2="38" y2="57" stroke="#ffffff" strokeWidth="5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold tracking-wider text-base text-white">NUTS</span>
                <span className="hidden sm:inline-block text-[11px] font-mono text-zinc-500 uppercase tracking-widest border border-zinc-800 px-1.5 py-0.2 rounded">
                  v0.1
                </span>
              </div>
              <p className="hidden md:block text-[10px] text-zinc-400 font-mono -mt-0.5 tracking-tight">
                NEURO UNIFIED TICKETING SYSTEM
              </p>
            </div>
          </div>
        </div>

        {/* Center: Search / Command Palette Trigger */}
        <div className="hidden sm:flex items-center flex-1 max-w-md mx-6">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-mono rounded-lg border border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors shadow-inner"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-zinc-500" />
              <span>Search tickets, departments, tags...</span>
            </div>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Supabase status indicator badge */}
          <button
            onClick={onOpenSupabaseGuide}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 transition-colors"
            title="Click to view Supabase schema and configuration"
          >
            {supabaseReady ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400 font-medium">Supabase Connected</span>
              </>
            ) : (
              <>
                <Database className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-zinc-400">UI Mode</span>
                <span className="text-[10px] px-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">SQL Ready</span>
              </>
            )}
          </button>

          {/* Quick Create Ticket */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-black hover:bg-zinc-200 active:scale-95 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="font-mono">New Ticket</span>
            <kbd className="hidden md:inline-block text-[10px] bg-black/10 px-1 rounded font-mono">C</kbd>
          </button>

          {/* Mobile search icon */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="sm:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 focus:outline-none"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors focus:outline-none"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Current User Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-1.5 p-1 rounded-full hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors focus:outline-none"
              title={`Logged in as ${currentUser.name}`}
            >
              <Avatar user={currentUser} size="sm" />
              <ChevronDown className="w-3 h-3 text-zinc-500 hidden sm:block" />
            </button>

            {showUserDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl z-50 animate-slide-up">
                  <div className="px-2 py-1.5 border-b border-zinc-800/80 mb-1">
                    <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                      Switch Active Persona
                    </p>
                    <p className="text-xs font-medium text-white truncate">{currentUser.name}</p>
                    <p className="text-[10px] font-mono text-zinc-500">{currentUser.role}</p>
                  </div>
                  <div className="space-y-0.5">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setCurrentUser(u);
                          setShowUserDropdown(false);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs hover:bg-zinc-900 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar user={u} size="xs" />
                          <div className="truncate">
                            <p className="font-medium text-zinc-200 truncate">{u.name}</p>
                            <p className="text-[10px] text-zinc-500 truncate">{u.role}</p>
                          </div>
                        </div>
                        {currentUser.id === u.id && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
