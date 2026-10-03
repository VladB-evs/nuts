import React, { useState, useMemo } from 'react';
import { useIssues } from '../context/TicketContext';
import { UserProfile, EmploymentStatus } from '../types';
import { UserAvatar } from './UserAvatar';
import { CustomSelect, SelectOption } from './CustomSelect';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  UserCheck,
  UserMinus,
  UserPlus,
  Search,
  Sliders,
  Plus,
  Check,
  X,
  AlertCircle,
  Building2,
  Lock,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Mail,
  Briefcase,
  HelpCircle,
  HeartHandshake,
} from 'lucide-react';

const DEPARTURE_REASONS = [
  'Voluntary Departure / New Opportunity',
  'Company Transition / Mutual Agreement',
  'Contract Concluded / Milestone Achieved',
  'Retirement / Personal Sabbatical',
  'Other Professional Transition',
];

export const AdminDashboard: React.FC = () => {
  const {
    currentUser,
    users,
    departments,
    setActiveTab,
    openDepartmentModal,
    setUserEmploymentStatus,
    setUserAdminRole,
    addTeamMember,
    showToast,
  } = useIssues();

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'departed'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'member'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Modals state
  const [offboardTarget, setOffboardTarget] = useState<UserProfile | null>(null);
  const [departureReason, setDepartureReason] = useState(DEPARTURE_REASONS[0]);
  const [departureNotes, setDepartureNotes] = useState('');

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberNickname, setNewMemberNickname] = useState('');
  const [newMemberDepartment, setNewMemberDepartment] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [newMemberIsAdmin, setNewMemberIsAdmin] = useState(false);

  // Security check: Only admins can view Admin Dashboard
  if (!currentUser?.isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gray-50">
        <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-gray-900 mb-1">
          Administrator Access Required
        </h2>
        <p className="text-xs text-gray-500 max-w-sm mb-5 leading-relaxed">
          The Admin Dashboard is restricted to workspace administrators. If you need administrative privileges, please contact your workspace administrator.
        </p>
        <button
          onClick={() => setActiveTab('table')}
          className="px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-md text-xs font-medium transition-colors cursor-pointer"
        >
          Return to Ticket Board
        </button>
      </div>
    );
  }

  // Summary counts
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.status !== 'departed').length;
  const departedCount = users.filter((u) => u.status === 'departed').length;
  const adminCount = users.filter((u) => u.isAdmin).length;

  // Filtered members list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Status filter
      if (statusFilter === 'active' && u.status === 'departed') return false;
      if (statusFilter === 'departed' && u.status !== 'departed') return false;

      // Role filter
      if (roleFilter === 'admin' && !u.isAdmin) return false;
      if (roleFilter === 'member' && u.isAdmin) return false;

      // Department filter
      if (deptFilter !== 'all') {
        const matchesDeptId = u.department?.toLowerCase() === deptFilter.toLowerCase();
        const deptObj = departments.find((d) => d.id === deptFilter);
        const matchesDeptName = deptObj && u.department?.toLowerCase() === deptObj.name.toLowerCase();
        if (!matchesDeptId && !matchesDeptName) return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = u.name?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchNickname = u.nickname?.toLowerCase().includes(q);
        const matchRole = u.role?.toLowerCase().includes(q);
        const matchDept = u.department?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchNickname && !matchRole && !matchDept) return false;
      }

      return true;
    });
  }, [users, statusFilter, roleFilter, deptFilter, search, departments]);

  // Handlers
  const handleOpenOffboardModal = (member: UserProfile) => {
    setOffboardTarget(member);
    setDepartureReason(DEPARTURE_REASONS[0]);
    setDepartureNotes('');
  };

  const handleConfirmOffboard = () => {
    if (!offboardTarget) return;
    const note = departureNotes.trim() ? `${departureReason} — ${departureNotes.trim()}` : departureReason;
    setUserEmploymentStatus(offboardTarget.id, 'departed', note);
    setOffboardTarget(null);
  };

  const handleReactivateMember = (member: UserProfile) => {
    setUserEmploymentStatus(member.id, 'active');
  };

  const handleToggleAdmin = (member: UserProfile) => {
    if (member.isAdmin) {
      // Check if last admin
      const otherAdmins = users.filter((u) => u.id !== member.id && u.isAdmin && u.status !== 'departed');
      if (otherAdmins.length === 0) {
        showToast({
          type: 'error',
          title: 'Action Prohibited',
          message: 'Workspace must retain at least one active administrator.',
        });
        return;
      }
      if (window.confirm(`Are you sure you want to revoke administrative privileges from ${member.name}?`)) {
        setUserAdminRole(member.id, false);
      }
    } else {
      setUserAdminRole(member.id, true);
    }
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;

    const chosenDept = newMemberDepartment || departments[0]?.name || 'Engineering';

    addTeamMember({
      name: newMemberName.trim(),
      email: newMemberEmail.trim(),
      nickname: newMemberNickname.trim() || undefined,
      department: chosenDept,
      role: newMemberRole.trim() || 'Team Member',
      isAdmin: newMemberIsAdmin,
    });

    setIsAddMemberOpen(false);
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberNickname('');
    setNewMemberDepartment('');
    setNewMemberRole('');
    setNewMemberIsAdmin(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-y-auto font-sans select-none text-xs">
      {/* Top Banner & Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shrink-0 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('table')}
              className="p-1.5 rounded-md text-gray-500 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
              title="Return to Ticket Table"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-lg bg-black text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-gray-900 tracking-tight">
                  Admin Dashboard
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded font-semibold">
                  Administrator
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">
                Team member directory, employment transitions, permissions, and department governance
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => openDepartmentModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 hover:text-black hover:bg-gray-50 border border-gray-300 rounded-md font-medium text-xs transition-colors shadow-2xs cursor-pointer"
              title="Create new department (Admin exclusive)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Department</span>
            </button>

            <button
              onClick={() => setIsAddMemberOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white hover:bg-gray-800 rounded-md font-medium text-xs transition-colors shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Team Member</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-5">
        {/* KPI Metrics Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Members */}
          <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Team</span>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 font-mono">{totalCount}</div>
            <div className="text-[10px] text-gray-400 mt-1 font-mono">Workspace directory size</div>
          </div>

          {/* Active Members */}
          <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Active Employed</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 font-mono flex items-center gap-2">
              <span>{activeCount}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[10px] text-gray-400 mt-1 font-mono">Active ticket assignees</div>
          </div>

          {/* Offboarded / Former Members */}
          <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Former Members</span>
              <UserMinus className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold text-slate-700 font-mono">{departedCount}</div>
            <div className="text-[10px] text-gray-400 mt-1 font-mono">Offboarded / Accounts disabled</div>
          </div>

          {/* Administrators */}
          <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-2xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Admins</span>
              <ShieldCheck className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600 font-mono">{adminCount}</div>
            <div className="text-[10px] text-gray-400 mt-1 font-mono">Workspace managers</div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors shrink-0 cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
              }`}
            >
              All Members ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors shrink-0 cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
              }`}
            >
              Active Employed ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('departed')}
              className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors shrink-0 cursor-pointer ${
                statusFilter === 'departed'
                  ? 'bg-slate-700 text-white'
                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
              }`}
            >
              Former Members ({departedCount})
            </button>
          </div>

          {/* Search & Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, handle, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-black text-xs"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="py-1.5 px-2.5 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:border-black text-xs cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins Only</option>
              <option value="member">Standard Members</option>
            </select>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="py-1.5 px-2.5 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:border-black text-xs cursor-pointer"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Team Members List / Table */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
            <span className="font-semibold text-gray-900 text-xs">
              Team Directory ({filteredUsers.length})
            </span>
            <span className="text-[11px] text-gray-500 font-mono">
              Showing {filteredUsers.length} of {totalCount} profiles
            </span>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No team members match your current filter criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 overflow-x-auto">
              {filteredUsers.map((member) => {
                const isDeparted = member.status === 'departed';
                const isSelf = member.id === currentUser.id;

                return (
                  <div
                    key={member.id}
                    className={`p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/80 transition-colors ${
                      isDeparted ? 'bg-gray-50/50 opacity-80' : ''
                    }`}
                  >
                    {/* Member Details */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <UserAvatar user={member} size="md" />
                        {isDeparted && (
                          <span
                            className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-500 border-2 border-white flex items-center justify-center text-[7px] text-white font-bold"
                            title="Inactive"
                          >
                            ×
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-gray-900 text-xs truncate">
                            {member.name}
                          </span>
                          {isSelf && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 bg-black text-white rounded font-bold">
                              You
                            </span>
                          )}
                          {member.nickname && (
                            <span className="text-[10px] text-gray-400 font-mono">
                              @{member.nickname}
                            </span>
                          )}
                          {member.isAdmin ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded">
                              <ShieldCheck className="w-3 h-3 text-amber-600" />
                              Admin
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-gray-500 bg-gray-100 border border-gray-200 px-1 py-0.2 rounded">
                              Member
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                          <span className="truncate">{member.email}</span>
                          <span>•</span>
                          <span className="font-medium text-gray-700 truncate">
                            {member.role || 'Member'}
                          </span>
                          <span>•</span>
                          <span className="bg-gray-100 px-1.5 py-0.2 rounded text-[10px] text-gray-600 font-mono">
                            {member.department}
                          </span>
                        </div>

                        {/* Transition Note if Departed */}
                        {isDeparted && (
                          <div className="mt-1 text-[10px] text-slate-500 flex items-center gap-1 italic">
                            <span className="font-semibold not-italic text-slate-600 font-mono">
                              Transition:
                            </span>
                            <span>{member.departureReason || 'Transitioned to new opportunity'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Badge & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      {/* Employment Status Badge */}
                      {isDeparted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-300">
                          <UserMinus className="w-3 h-3 text-slate-500" />
                          <span>Former Member</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Active Employed</span>
                        </span>
                      )}

                      {/* Admin Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleAdmin(member)}
                        className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                          member.isAdmin
                            ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-black'
                        }`}
                        title={member.isAdmin ? 'Revoke Administrator Privileges' : 'Promote to Workspace Administrator'}
                      >
                        {member.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                      </button>

                      {/* Employment Status Action (Offboard vs Reactivate) */}
                      {isDeparted ? (
                        <button
                          type="button"
                          onClick={() => handleReactivateMember(member)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 hover:border-emerald-400 rounded text-[11px] font-medium transition-colors cursor-pointer"
                          title="Reactivate member account and restore ticket assignment availability"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reactivate</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenOffboardModal(member)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[11px] font-medium transition-colors cursor-pointer"
                          title="Respectfully transition team member and disable account sign-in"
                        >
                          <span>Offboard...</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* 1. RESPECTFUL OFFBOARDING MODAL */}
      {/* ================================================================ */}
      {offboardTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setOffboardTarget(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-xl border border-gray-300 shadow-2xl overflow-hidden z-10 animate-fade-in text-xs flex flex-col font-sans">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserMinus className="w-4 h-4 text-slate-700" />
                <h3 className="font-bold text-gray-900 text-sm">
                  Transition Team Member Profile
                </h3>
              </div>
              <button
                onClick={() => setOffboardTarget(null)}
                className="text-gray-400 hover:text-black p-1 rounded hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Member Summary Card */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <UserAvatar user={offboardTarget} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-gray-900 text-xs">
                    {offboardTarget.name}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">
                    {offboardTarget.email}
                  </div>
                  <div className="text-[10px] text-gray-600 font-mono mt-0.5">
                    {offboardTarget.role || 'Member'} • {offboardTarget.department}
                  </div>
                </div>
              </div>

              {/* Informative Guidance */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-slate-700 leading-relaxed text-[11px] space-y-1.5">
                <p className="font-semibold text-slate-900 flex items-center gap-1">
                  <HeartHandshake className="w-3.5 h-3.5 text-slate-600" />
                  <span>Dignified & Reversible Offboarding</span>
                </p>
                <p>
                  Transitioning this account marks the status as a <strong>Former Team Member</strong> and safely deactivates sign-in access.
                </p>
                <p className="text-slate-500">
                  All past ticket creations, comments, and audit history remain permanently preserved and attributed to them. You can reactivate their account at any time with one click.
                </p>
              </div>

              {/* Departure Reason Selector */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Reason for Transition *
                </label>
                <select
                  value={departureReason}
                  onChange={(e) => setDepartureReason(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-black text-xs cursor-pointer"
                >
                  {DEPARTURE_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Transition Notes */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Internal Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pursuing grad studies, excellent handover"
                  value={departureNotes}
                  onChange={(e) => setDepartureNotes(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-black text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setOffboardTarget(null)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-black font-medium border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOffboard}
                  className="px-4 py-1.5 text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 rounded transition-colors shadow-xs cursor-pointer"
                >
                  Confirm Transition & Deactivate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 2. ADD TEAM MEMBER MODAL */}
      {/* ================================================================ */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsAddMemberOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-xl border border-gray-300 shadow-2xl overflow-hidden z-10 animate-fade-in text-xs flex flex-col font-sans">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-black" />
                <h3 className="font-bold text-gray-900 text-sm">
                  Add New Team Member
                </h3>
              </div>
              <button
                onClick={() => setIsAddMemberOpen(false)}
                className="text-gray-400 hover:text-black p-1 rounded hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="p-5 space-y-3.5">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Hayes"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-black text-xs"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. jordan@company.internal"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-black text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Handle / Nickname
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. jhayes"
                    value={newMemberNickname}
                    onChange={(e) => setNewMemberNickname(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-black text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">
                    Department *
                  </label>
                  <select
                    value={newMemberDepartment}
                    onChange={(e) => setNewMemberDepartment(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-black text-xs cursor-pointer"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Job Role / Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Backend Engineer"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-black text-xs"
                />
              </div>

              {/* Admin Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newMemberIsAdmin}
                    onChange={(e) => setNewMemberIsAdmin(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-0 accent-black cursor-pointer mt-0.5"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 text-xs flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      Grant Administrator Privileges
                    </span>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-normal">
                      Admins can create departments, invite and offboard team members, and designate other administrators.
                    </p>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-black font-medium border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-black text-white hover:bg-gray-800 rounded transition-colors shadow-xs cursor-pointer"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
