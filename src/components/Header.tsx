import React, { useState } from 'react';
import { useIssues } from '../context/TicketContext';
import { USERS } from '../data/mockData';
import { Search, Plus, Database, Check } from 'lucide-react';

interface HeaderProps {
  onOpenSupabase: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSupabase }) => {
  const {
    searchQuery,
    setSearchQuery,
    currentUser,
    setCurrentUser,
    setIsCreateModalOpen,
    setSelectedIssue,
  } = useIssues();

  const [userDropdown, setUserDropdown] = useState(false);

  return (
    <header className="h-14 border-b border-gray-200 bg-white px-4 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedIssue(null)}
          className="flex items-center gap-2.5 focus:outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-sm tracking-wider">
            N
          </div>
          <div className="text-left">
            <span className="font-bold text-sm text-gray-900 tracking-tight">NUTS</span>
            <span className="text-[11px] text-gray-500 ml-1.5 font-mono">Issue Tracker</span>
          </div>
        </button>
      </div>

      {/* Center Search Input (Google style) */}
      <div className="flex-1 max-w-xl mx-4">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search issues by ID, title, or assignee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-gray-500 transition-colors"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Supabase backend status */}
        <button
          onClick={onOpenSupabase}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-600 hover:text-black border border-gray-200 hover:border-gray-400 rounded-md transition-colors"
          title="Supabase Migration Info"
        >
          <Database className="w-3.5 h-3.5 text-gray-500" />
          <span className="font-mono text-[11px]">Supabase SQL</span>
        </button>

        {/* New Issue Button */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-black text-white hover:bg-gray-800 rounded-md transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Issue</span>
        </button>

        {/* Current user switch */}
        <div className="relative">
          <button
            onClick={() => setUserDropdown(!userDropdown)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-colors text-xs text-gray-700"
          >
            <div className="w-6 h-6 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center font-medium text-[11px] text-gray-800">
              {currentUser.name[0]}
            </div>
            <span className="hidden md:inline font-medium">{currentUser.name}</span>
          </button>

          {userDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserDropdown(false)}
              />
              <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-1 text-xs">
                <div className="px-2.5 py-1.5 border-b border-gray-100 text-gray-500 text-[10px] uppercase font-mono">
                  Switch Persona
                </div>
                {USERS.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setCurrentUser(u);
                      setUserDropdown(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-50 text-left"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-[10px] text-gray-500">{u.department}</p>
                    </div>
                    {currentUser.id === u.id && <Check className="w-3.5 h-3.5 text-black" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
