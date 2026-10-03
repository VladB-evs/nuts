import React from 'react';
import { useIssues } from '../context/TicketContext';
import { NavView } from '../types';
import { getUserDepartmentId } from '../lib/departmentRules';
import {
  Inbox,
  UserCheck,
  FileText,
  Star,
  CheckCircle2,
  Plus,
  Settings2,
  Clock,
  X,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    navView,
    setNavView,
    activeTab,
    setActiveTab,
    departments,
    currentUser,
    selectedDepartment,
    setSelectedDepartment,
    counts,
    issues,
    openDepartmentModal,
    setSelectedIssue,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    setIsCreateModalOpen,
  } = useIssues();

  if (!currentUser) return null;

  const userDeptId = getUserDepartmentId(currentUser, departments);
  const userDept = departments.find((d) => d.id === userDeptId);

  const views: { id: NavView; label: string; badge?: string; tooltip: string; icon: any; count: number }[] = [
    {
      id: 'assigned_to_me',
      label: 'Assigned to me',
      badge: userDept?.code || 'DEV',
      tooltip: `Open issues assigned to you in your department (${userDept?.name || currentUser.department})`,
      icon: UserCheck,
      count: counts.assignedToMe,
    },
    {
      id: 'open',
      label: 'Open Issues',
      badge: userDept?.code || 'DEV',
      tooltip: `Open issues in your assigned department (${userDept?.name || currentUser.department})`,
      icon: Inbox,
      count: counts.open,
    },
    {
      id: 'reported_by_me',
      label: 'Reported by me',
      tooltip: 'Tickets reported by you',
      icon: FileText,
      count: counts.reportedByMe,
    },
    {
      id: 'starred',
      label: 'Starred',
      tooltip: 'Starred tickets',
      icon: Star,
      count: counts.starred,
    },
    {
      id: 'closed',
      label: 'Closed / Fixed',
      tooltip: `Closed/Fixed issues in your department (${userDept?.name || currentUser.department})`,
      icon: CheckCircle2,
      count: counts.closed,
    },
  ];

  const renderNavContent = () => (
    <>
      {/* Create Issue Action Button */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => {
            setIsCreateModalOpen(true);
            setIsMobileMenuOpen(false);
          }}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-black text-white hover:bg-gray-800 rounded-md text-xs font-medium transition-colors shadow-2xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Issue</span>
        </button>
      </div>

      {/* Views */}
      <div className="space-y-0.5 mb-5">
        <div className="px-2 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          Views
        </div>
        {views.map((v) => {
          const Icon = v.icon;
          const isSelected = navView === v.id && selectedDepartment === 'all';
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setNavView(v.id);
                setSelectedDepartment('all');
                setSelectedIssue(null);
                setActiveTab('table');
                setIsMobileMenuOpen(false);
              }}
              title={v.tooltip}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors group cursor-pointer ${
                isSelected && activeTab === 'table'
                  ? 'bg-gray-100 font-semibold text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected && activeTab === 'table' ? 'text-black' : 'text-gray-400'}`} />
                <span className="truncate">{v.label}</span>
                {v.badge && (
                  <span
                    className={`font-mono text-[9px] px-1 py-0.2 rounded border ${
                      isSelected && activeTab === 'table'
                        ? 'bg-white text-gray-800 border-gray-300 font-bold'
                        : 'bg-gray-50 text-gray-400 border-gray-200'
                    }`}
                  >
                    {v.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-gray-400 font-mono shrink-0 ml-1.5">{v.count}</span>
            </button>
          );
        })}
      </div>

      {/* Lifecycle Timeline Tab */}
      <div className="space-y-0.5 mb-5">
        <div className="px-2 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          Analytics & Flow
        </div>
        <button
          type="button"
          onClick={() => {
            setActiveTab('timeline');
            setSelectedIssue(null);
            setIsMobileMenuOpen(false);
          }}
          title="Visualize ticket lifecycle durations, bottlenecks, and transitions"
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors group cursor-pointer ${
            activeTab === 'timeline'
              ? 'bg-gray-100 font-semibold text-gray-900'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Clock className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'timeline' ? 'text-black' : 'text-gray-400'}`} />
            <span className="truncate">Lifecycle Timeline</span>
          </div>
          <span className="font-mono text-[9px] px-1.5 py-0.2 rounded border bg-sky-50 text-sky-700 border-sky-200 font-medium">
            Stages
          </span>
        </button>
      </div>

      {/* Departments */}
      <div className="flex-1 overflow-y-auto space-y-0.5">
        <div className="flex items-center justify-between px-2 pb-1">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Departments
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                openDepartmentModal(selectedDepartment !== 'all' ? selectedDepartment : undefined);
                setIsMobileMenuOpen(false);
              }}
              className="text-gray-400 hover:text-black p-0.5 rounded hover:bg-gray-100 transition-colors cursor-pointer"
              title="Department Settings"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                openDepartmentModal();
                setIsMobileMenuOpen(false);
              }}
              className="text-gray-400 hover:text-black p-0.5 rounded hover:bg-gray-100 transition-colors cursor-pointer"
              title="Add new department"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {departments.map((dept) => {
          const isSelected = selectedDepartment === dept.id && activeTab === 'table';
          const count = issues.filter((i) => i.departmentId === dept.id).length;

          return (
            <div
              key={dept.id}
              onClick={() => {
                setSelectedDepartment(dept.id);
                setSelectedIssue(null);
                setActiveTab('table');
                setIsMobileMenuOpen(false);
              }}
              className={`group w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-gray-100 font-semibold text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                <span className="truncate">{dept.name}</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[10px] text-gray-400 shrink-0">
                <span>[{dept.code}]</span>
                <span>{count}</span>
                <button
                  type="button"
                  title={`Department Settings: ${dept.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    openDepartmentModal(dept.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-black p-0.5 ml-0.5 rounded hover:bg-gray-200 transition-opacity"
                >
                  <Settings2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Static Sidebar */}
      <aside className="hidden md:flex md:w-56 border-r border-gray-200 bg-white py-3 px-2 flex-col h-full overflow-y-auto select-none shrink-0 text-xs">
        {renderNavContent()}
      </aside>

      {/* 2. Mobile Responsive Slide-out Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer container */}
          <aside className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col py-4 px-3 overflow-y-auto select-none text-xs z-10 animate-fade-in">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center font-bold text-xs tracking-wider">
                  N
                </div>
                <span className="font-bold text-sm text-gray-900 tracking-tight">NUTS Navigation</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-md text-gray-500 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderNavContent()}
          </aside>
        </div>
      )}
    </>
  );
};
