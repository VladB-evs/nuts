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
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    navView,
    setNavView,
    departments,
    currentUser,
    selectedDepartment,
    setSelectedDepartment,
    counts,
    issues,
    openDepartmentModal,
    setSelectedIssue,
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

  return (
    <aside className="w-56 border-r border-gray-200 bg-white py-3 px-2 flex flex-col h-[calc(100vh-3.5rem)] sticky top-14 select-none shrink-0 text-xs">
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
              onClick={() => {
                setNavView(v.id);
                setSelectedDepartment('all');
                setSelectedIssue(null);
              }}
              title={v.tooltip}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors group ${
                isSelected
                  ? 'bg-gray-100 font-semibold text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-black' : 'text-gray-400'}`} />
                <span className="truncate">{v.label}</span>
                {v.badge && (
                  <span
                    className={`font-mono text-[9px] px-1 py-0.2 rounded border ${
                      isSelected
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

      {/* Departments */}
      <div className="flex-1 overflow-y-auto space-y-0.5">
        <div className="flex items-center justify-between px-2 pb-1">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Departments
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => openDepartmentModal(selectedDepartment !== 'all' ? selectedDepartment : undefined)}
              className="text-gray-400 hover:text-black p-0.5 rounded hover:bg-gray-100 transition-colors"
              title="Department Settings"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => openDepartmentModal()}
              className="text-gray-400 hover:text-black p-0.5 rounded hover:bg-gray-100 transition-colors"
              title="Add new department"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {departments.map((dept) => {
          const isSelected = selectedDepartment === dept.id;
          const count = issues.filter((i) => i.departmentId === dept.id).length;

          return (
            <div
              key={dept.id}
              onClick={() => {
                setSelectedDepartment(dept.id);
                setSelectedIssue(null);
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
    </aside>
  );
};
