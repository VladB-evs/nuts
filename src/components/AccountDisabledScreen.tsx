import React, { useState } from 'react';
import { useIssues } from '../context/TicketContext';
import { UserAvatar } from './UserAvatar';
import { LogOut, HeartHandshake, ArrowRight, UserCheck, ShieldAlert, Users } from 'lucide-react';

export const AccountDisabledScreen: React.FC = () => {
  const { currentUser, logout, isDemoMode, users, setCurrentUser, exitDemoMode } = useIssues();
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  if (!currentUser) return null;

  const activeDemoUsers = users.filter((u) => u.status !== 'departed' && u.id !== currentUser.id);

  const formattedDate = currentUser.departedAt
    ? new Date(currentUser.departedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recent';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 font-sans select-none">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-lg p-6 sm:p-8 text-center animate-fade-in">
        {/* NUTS Branding */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-xs">
            N
          </div>
          <span className="font-bold text-base text-gray-900 tracking-tight">NUTS</span>
        </div>

        {/* Transition Icon */}
        <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4 text-slate-600 shadow-2xs">
          <HeartHandshake className="w-7 h-7" />
        </div>

        {/* Heading */}
        <h1 className="text-xl font-bold text-gray-900 tracking-tight mb-1">
          Account Transitioned
        </h1>
        <p className="text-xs text-gray-500 font-medium mb-5">
          Thank you for your valuable contributions to the team
        </p>

        {/* Profile Card */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 mb-5 text-left">
          <div className="flex items-center gap-3 mb-3">
            <UserAvatar user={currentUser} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-900 text-xs truncate">
                  {currentUser.name}
                </span>
                {currentUser.nickname && (
                  <span className="text-[10px] text-gray-400 font-mono">
                    @{currentUser.nickname}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 truncate">
                {currentUser.role || 'Former Member'} • {currentUser.department}
              </p>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-gray-200 text-gray-700 shrink-0">
              Former Member
            </span>
          </div>

          <div className="pt-2.5 border-t border-gray-200/70 text-[11px] space-y-1 font-sans">
            <div className="flex justify-between text-gray-600">
              <span>Status:</span>
              <span className="font-medium text-gray-800">Inactive / Offboarded</span>
            </div>
            {currentUser.departureReason && (
              <div className="flex justify-between text-gray-600">
                <span>Transition Note:</span>
                <span className="font-medium text-gray-800 text-right truncate max-w-[200px]">
                  {currentUser.departureReason}
                </span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Recorded:</span>
              <span className="font-medium text-gray-800">{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Dignified Explanatory Message */}
        <div className="text-xs text-gray-600 leading-relaxed text-left space-y-2 mb-6 bg-slate-50/60 p-3 rounded border border-slate-100">
          <p>
            This account has been updated to former team member status and direct workspace access is deactivated.
          </p>
          <p className="text-[11px] text-gray-500">
            All your ticket history, comments, and project milestones remain intact and attributed to you. If you need assistance, please contact your workspace administrator.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {isDemoMode && activeDemoUsers.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSwitchModal(true)}
              className="w-full py-2 px-3 bg-black text-white hover:bg-gray-800 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Switch Demo Persona (Test Active User)</span>
            </button>
          )}

          <button
            type="button"
            onClick={logout}
            className="w-full py-2 px-3 bg-white text-gray-700 hover:text-black hover:bg-gray-100 border border-gray-300 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out to Login</span>
          </button>
        </div>
      </div>

      {/* Demo Persona Switcher Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-scrim/40 backdrop-blur-xs"
            onClick={() => setShowSwitchModal(false)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-lg border border-gray-200 shadow-xl p-4 z-10 animate-fade-in text-xs">
            <h2 className="text-sm font-bold text-gray-900 mb-2">Select Active Demo Persona</h2>
            <p className="text-gray-500 text-[11px] mb-3">
              Switch back to an active team member or administrator to continue exploring NUTS.
            </p>
            <div className="space-y-1 max-h-60 overflow-y-auto mb-3">
              {activeDemoUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setCurrentUser(u);
                    setShowSwitchModal(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-100 text-left transition-colors border border-transparent hover:border-gray-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <UserAvatar user={u} size="sm" />
                    <div>
                      <div className="font-semibold text-gray-900 flex items-center gap-1">
                        <span>{u.name}</span>
                        {u.isAdmin && (
                          <span className="text-[9px] font-mono px-1 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        {u.role || u.department}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSwitchModal(false)}
              className="w-full py-1.5 text-xs text-gray-600 hover:text-black font-medium border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
