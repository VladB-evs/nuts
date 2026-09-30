import React, { useState } from 'react';
import { useIssues } from '../context/TicketContext';
import { UserAvatar } from './UserAvatar';
import { Search, Plus, Database, Check, UserCog, ChevronDown, Settings2 } from 'lucide-react';

interface HeaderProps {
  onOpenNeon: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNeon }) => {
  const {
    searchQuery,
    setSearchQuery,
    currentUser,
    setCurrentUser,
    users,
    setIsCreateModalOpen,
    setSelectedIssue,
    setIsProfileModalOpen,
    openDepartmentModal,
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
            placeholder="Search by ID, title, @nickname, role, or assignee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-gray-500 transition-colors"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Neon backend status */}
        <button
          onClick={onOpenNeon}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-600 hover:text-black border border-gray-200 hover:border-gray-400 rounded-md transition-colors"
          title="Neon Serverless Postgres Setup & Migration"
        >
          <Database className="w-3.5 h-3.5 text-gray-500" />
          <span className="font-mono text-[11px]">Neon SQL</span>
        </button>

        {/* Department Settings */}
        <button
          onClick={() => openDepartmentModal()}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-600 hover:text-black border border-gray-200 hover:border-gray-400 rounded-md transition-colors"
          title="Department Settings & Custom Fields"
        >
          <Settings2 className="w-3.5 h-3.5 text-gray-500" />
          <span className="font-mono text-[11px]">Departments</span>
        </button>

        {/* New Issue Button */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-black text-white hover:bg-gray-800 rounded-md transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Issue</span>
        </button>

        {/* Current user & Profile Switcher */}
        <div className="relative">
          <button
            onClick={() => setUserDropdown(!userDropdown)}
            className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-colors text-xs text-gray-700"
          >
            <UserAvatar user={currentUser} size="sm" />
            <div className="hidden md:flex flex-col text-left leading-tight">
              <span className="font-medium text-gray-900 text-xs">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                {currentUser.nickname ? `@${currentUser.nickname}` : currentUser.department}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-gray-400 ml-0.5" />
          </button>

          {userDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserDropdown(false)}
              />
              <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-2 text-xs animate-fade-in">
                {/* Active Profile Info */}
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-md mb-2 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <UserAvatar user={currentUser} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 truncate">{currentUser.name}</p>
                      {currentUser.nickname && (
                        <p className="text-[11px] text-gray-500 font-mono truncate">
                          @{currentUser.nickname}
                        </p>
                      )}
                      <p className="text-[10px] font-semibold text-gray-700 bg-white border border-gray-300 px-1.5 py-0.5 rounded inline-block mt-1 font-mono truncate max-w-full">
                        {currentUser.role || 'Member'} • {currentUser.department}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setUserDropdown(false);
                      setIsProfileModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-black text-white hover:bg-gray-800 rounded font-medium text-xs transition-colors shadow-2xs"
                  >
                    <UserCog className="w-3.5 h-3.5" />
                    <span>Edit Profile & Avatar</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserDropdown(false);
                      openDepartmentModal();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white text-gray-700 hover:text-black hover:bg-gray-100 border border-gray-200 rounded font-medium text-xs transition-colors"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>Department Settings</span>
                  </button>
                </div>

                {/* Persona Switcher */}
                <div className="px-2 py-1 text-gray-400 text-[10px] uppercase font-mono font-semibold">
                  Switch Persona
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setCurrentUser(u);
                        setUserDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded text-left transition-colors ${
                        currentUser.id === u.id
                          ? 'bg-gray-100 font-semibold text-gray-900'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <UserAvatar user={u} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="font-medium text-gray-900 truncate">{u.name}</p>
                            {u.nickname && (
                              <span className="text-[10px] text-gray-400 font-mono">
                                @{u.nickname}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 truncate">
                            {u.role ? `${u.role} (${u.department})` : u.department}
                          </p>
                        </div>
                      </div>
                      {currentUser.id === u.id && (
                        <Check className="w-3.5 h-3.5 text-black shrink-0 ml-1.5" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
