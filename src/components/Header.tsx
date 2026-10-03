import React, { useState } from 'react';
import { useIssues } from '../context/TicketContext';
import { UserAvatar } from './UserAvatar';
import {
  Search,
  Plus,
  Check,
  UserCog,
  ChevronDown,
  Settings2,
  LogOut,
  Building2,
  Copy,
  Users as UsersIcon,
} from 'lucide-react';

interface HeaderProps {}

export const Header: React.FC<HeaderProps> = () => {
  const {
    searchQuery,
    setSearchQuery,
    currentUser,
    setCurrentUser,
    logout,
    users,
    setIsCreateModalOpen,
    setSelectedIssue,
    setIsProfileModalOpen,
    openDepartmentModal,
    isDemoMode,
    exitDemoMode,
  } = useIssues();

  const [userDropdown, setUserDropdown] = useState(false);
  const [copiedOrgCode, setCopiedOrgCode] = useState(false);
  const [copiedSalesLink, setCopiedSalesLink] = useState(false);

  if (!currentUser) return null;

  const handleCopyOrgCode = () => {
    if (currentUser.organization?.code) {
      navigator.clipboard.writeText(currentUser.organization.code);
      setCopiedOrgCode(true);
      setTimeout(() => setCopiedOrgCode(false), 2000);
    }
  };

  const handleCopySalesLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/?create-org=true`;
      navigator.clipboard.writeText(url);
      setCopiedSalesLink(true);
      setTimeout(() => setCopiedSalesLink(false), 2000);
    }
  };

  const coworkers = users.filter((u) => u.id !== currentUser.id);

  return (
    <header className="h-14 border-b border-gray-200 bg-white px-4 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Brand & Organization */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedIssue(null)}
          className="flex items-center gap-2.5 focus:outline-none cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-sm tracking-wider">
            N
          </div>
          <div className="text-left">
            <span className="font-bold text-sm text-gray-900 tracking-tight">NUTS</span>
            <span className="text-[11px] text-gray-500 ml-1.5 font-mono">Issue Tracker</span>
          </div>
        </button>

        {/* Multi-Tenant Org Badge (Production) */}
        {!isDemoMode && currentUser.organization && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-md text-xs">
            <Building2 className="w-3.5 h-3.5 text-gray-500" />
            <span
              className="font-semibold text-gray-900 max-w-[130px] truncate"
              title={currentUser.organization.name}
            >
              {currentUser.organization.name}
            </span>
            {currentUser.isAdmin ? (
              <button
                type="button"
                onClick={handleCopyOrgCode}
                title="Click to copy employee invite code (Admin)"
                className="font-mono text-[10px] bg-white border border-gray-300 hover:border-black px-1.5 py-0.5 rounded text-gray-700 flex items-center gap-1 transition-colors cursor-pointer ml-1"
              >
                <span>{currentUser.organization.code}</span>
                {copiedOrgCode ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3 text-gray-400" />
                )}
              </button>
            ) : (
              <span className="text-[10px] text-gray-400 font-mono ml-1">Team</span>
            )}
          </div>
        )}

        {/* Demo Mode Badge */}
        {isDemoMode && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-300 text-amber-900 rounded-md text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Demo Mode</span>
            <button
              onClick={exitDemoMode}
              className="ml-1 text-[10px] underline hover:text-black font-semibold cursor-pointer"
            >
              Exit
            </button>
          </div>
        )}
      </div>

      {/* Center Search Input (Google Buganizer style) */}
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
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-black text-white hover:bg-gray-800 rounded-md transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Issue</span>
        </button>

        {/* Current user & Account Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserDropdown(!userDropdown)}
            className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-colors text-xs text-gray-700 cursor-pointer"
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
              <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-2.5 text-xs animate-fade-in">
                {/* Active Profile Info */}
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-md mb-2 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <UserAvatar user={currentUser} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 truncate">{currentUser.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{currentUser.email}</p>
                      {currentUser.nickname && (
                        <p className="text-[10px] text-gray-500 font-mono truncate">
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
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-black text-white hover:bg-gray-800 rounded font-medium text-xs transition-colors cursor-pointer"
                  >
                    <UserCog className="w-3.5 h-3.5" />
                    <span>Edit Profile & Avatar</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserDropdown(false);
                      openDepartmentModal();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white text-gray-700 hover:text-black hover:bg-gray-100 border border-gray-200 rounded font-medium text-xs transition-colors cursor-pointer"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>Department Settings</span>
                  </button>
                </div>

                {/* Real Company Workspace Info (Production Users) */}
                {!isDemoMode && currentUser.organization && (
                  <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-gray-500" />
                        <span className="truncate">{currentUser.organization.name}</span>
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">
                        {currentUser.isAdmin ? 'Admin' : 'Member'}
                      </span>
                    </div>

                    {/* Admin Exclusivity: Only Admin can see and copy the employee invite code */}
                    {currentUser.isAdmin ? (
                      <>
                        <div className="flex items-center justify-between bg-white border border-gray-200 rounded p-1.5 mt-1.5">
                          <div className="font-mono text-xs font-bold text-gray-800 tracking-wider">
                            {currentUser.organization.code}
                          </div>
                          <button
                            onClick={handleCopyOrgCode}
                            className="flex items-center gap-1 px-2 py-0.5 bg-black text-white hover:bg-gray-800 rounded text-[10px] font-medium transition-colors cursor-pointer"
                          >
                            {copiedOrgCode ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Code</span>
                              </>
                            )}
                          </button>
                        </div>

                        <p className="text-[10px] text-gray-500 mt-1 leading-normal">
                          Share this invite code with employees so they can join your company workspace.
                        </p>

                        {/* Special Sales Onboarding Link (for Founder / Sales calls) */}
                        <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                            Sales Call Link
                          </span>
                          <button
                            onClick={handleCopySalesLink}
                            className="text-[10px] text-gray-700 hover:text-black font-semibold underline flex items-center gap-1 cursor-pointer"
                            title="Copy the guarded link to share on sales calls for a new company to create their workspace"
                          >
                            {copiedSalesLink ? (
                              <span className="text-emerald-600 font-bold">Link Copied!</span>
                            ) : (
                              <span>Copy New Org Link</span>
                            )}
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-[10px] text-gray-500 mt-1 leading-normal">
                        Internal workspace for {currentUser.organization.name}. Contact your admin for invite codes.
                      </p>
                    )}

                    {/* Coworkers list if any */}
                    {coworkers.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          <UsersIcon className="w-3 h-3" />
                          <span>Team Members ({coworkers.length + 1})</span>
                        </div>
                        <div className="max-h-24 overflow-y-auto space-y-1">
                          {coworkers.slice(0, 5).map((cw) => (
                            <div key={cw.id} className="flex items-center gap-1.5 text-[11px] text-gray-700">
                              <UserAvatar user={cw} size="sm" />
                              <span className="truncate font-medium">{cw.name}</span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                ({cw.department})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Persona Switcher ONLY in Demo Mode */}
                {isDemoMode && (
                  <>
                    <div className="px-2 py-1 text-gray-400 text-[10px] uppercase font-mono font-semibold">
                      Demo Persona Switcher
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {users.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            setCurrentUser(u);
                            setUserDropdown(false);
                          }}
                          className={`w-full flex items-center justify-between p-1.5 rounded text-left transition-colors cursor-pointer ${
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
                  </>
                )}

                {/* Sign Out */}
                <div className="pt-1.5 mt-1.5 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setUserDropdown(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors text-xs font-medium cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
