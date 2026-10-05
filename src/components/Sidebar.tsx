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
  Bookmark,
  Clock,
  X,
  ShieldCheck,
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
    setIsCreatingIssue,
    savedViews,
    applyView,
  } = useIssues();

  if (!currentUser) return null;

  const userDeptId = getUserDepartmentId(currentUser, departments);
  const userDept = departments.find((d) => d.id === userDeptId);

  type ViewItem = { id: NavView; label: string; tooltip: string; icon: any; count: number };
  const deptName = userDept?.name || currentUser.department || 'your department';

  // Scoped to the signed-in user's own department
  const departmentViews: ViewItem[] = [
    {
      id: 'assigned_to_me',
      label: 'Assigned to me',
      tooltip: `Open issues assigned to you in ${deptName}`,
      icon: UserCheck,
      count: counts.assignedToMe,
    },
    {
      id: 'open',
      label: 'Open issues',
      tooltip: `All open issues in ${deptName}`,
      icon: Inbox,
      count: counts.open,
    },
    {
      id: 'closed',
      label: 'Closed / Completed',
      tooltip: `Completed and closed issues in ${deptName}`,
      icon: CheckCircle2,
      count: counts.closed,
    },
  ];

  // Not scoped: these look at every department
  const allDepartmentViews: ViewItem[] = [
    {
      id: 'reported_by_me',
      label: 'Reported by me',
      tooltip: 'Tickets you reported, in any department',
      icon: FileText,
      count: counts.reportedByMe,
    },
    {
      id: 'starred',
      label: 'Starred',
      tooltip: 'Your starred tickets, in any department',
      icon: Star,
      count: counts.starred,
    },
  ];

  const renderView = (v: ViewItem) => {
    const Icon = v.icon;
    const isSelected = navView === v.id && selectedDepartment === 'all' && activeTab === 'table';
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
          isSelected
            ? 'bg-gray-100 font-semibold text-gray-900'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-black' : 'text-gray-400'}`} />
          <span className="truncate">{v.label}</span>
        </div>
        <span className="text-[11px] text-gray-400 font-mono shrink-0 ml-1.5">{v.count}</span>
      </button>
    );
  };

  const renderNavContent = () => (
    <>
      {/* Create Issue Action Button */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => {
            setIsCreatingIssue(true);
            setIsMobileMenuOpen(false);
          }}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-black text-white hover:bg-gray-800 rounded-md text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          title="New issue (press C)"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Issue</span>
        </button>
      </div>

      {/* My department's views */}
      <div className="space-y-0.5 mb-4">
        <div className="px-2 pb-1 flex items-baseline justify-between gap-2" title={`These three views only include ${deptName}`}>
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            My department
          </span>
          <span className="text-[10px] font-mono text-gray-500 truncate">{userDept?.code || ''}</span>
        </div>
        {departmentViews.map(renderView)}
      </div>

      {/* Views across every department */}
      <div className="space-y-0.5 mb-5">
        <div className="px-2 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          All departments
        </div>
        {allDepartmentViews.map(renderView)}
      </div>

      {/* Saved views (personal) */}
      {savedViews.length > 0 && (
        <div className="space-y-0.5 mb-5">
          <div className="px-2 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Saved views
          </div>
          {savedViews.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => applyView(v)}
              title={`Apply "${v.name}"`}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5 shrink-0 text-gray-400" />
              <span className="truncate">{v.name}</span>
            </button>
          ))}
        </div>
      )}

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

      {/* Admin Dashboard Tab (Admin Only) */}
      {currentUser?.isAdmin && (
        <div className="space-y-0.5 mb-5">
          <div className="px-2 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Governance
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setSelectedIssue(null);
              setIsMobileMenuOpen(false);
            }}
            title="Team directory, role permissions, and account offboarding"
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors group cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-gray-100 font-semibold text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'admin' ? 'text-amber-600' : 'text-gray-400'}`} />
              <span className="truncate">Admin Dashboard</span>
            </div>
            <span className="font-mono text-[9px] px-1.5 py-0.2 rounded border bg-amber-50 text-amber-700 border-amber-200 font-medium">
              Admin
            </span>
          </button>
        </div>
      )}

      {/* Departments */}
      <div className="flex-1 overflow-y-auto space-y-0.5">
        <div className="flex items-center justify-between px-2 pb-1">
          <span
            className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider"
            title="Open issues in each department. Click one to browse it."
          >
            Departments
          </span>
          <div className="flex items-center gap-1">
            {currentUser?.isAdmin && (
              <>
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
                  title="Add new department (Admin only)"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {departments.map((dept) => {
          const isSelected = selectedDepartment === dept.id && activeTab === 'table';
          const count = issues.filter(
            (i) => i.departmentId === dept.id && i.status !== 'COMPLETED' && i.status !== 'CLOSED'
          ).length;
          const isMine = dept.id === userDeptId;

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
                {isMine && (
                  <span className="font-mono text-[9px] px-1 rounded border bg-gray-50 text-gray-500 border-gray-200 shrink-0" title="Your department">
                    you
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 font-mono text-[10px] text-gray-400 shrink-0">
                <span>[{dept.code}]</span>
                <span>{count}</span>
                {currentUser?.isAdmin && (
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
                )}
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
            className="fixed inset-0 bg-scrim/50 backdrop-blur-xs transition-opacity"
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
