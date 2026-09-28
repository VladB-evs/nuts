import React, { useState } from 'react';
import { useIssues } from '../context/TicketContext';
import { NavView } from '../types';
import {
  Inbox,
  UserCheck,
  FileText,
  Star,
  CheckCircle2,
  Folder,
  Plus,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    navView,
    setNavView,
    departments,
    selectedDepartment,
    setSelectedDepartment,
    counts,
    issues,
    addDepartment,
    setSelectedIssue,
  } = useIssues();

  const [isAddingDept, setIsAddingDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');

  const views: { id: NavView; label: string; icon: any; count: number }[] = [
    { id: 'open', label: 'Open Issues', icon: Inbox, count: counts.open },
    { id: 'assigned_to_me', label: 'Assigned to me', icon: UserCheck, count: counts.assignedToMe },
    { id: 'reported_by_me', label: 'Reported by me', icon: FileText, count: counts.reportedByMe },
    { id: 'starred', label: 'Starred', icon: Star, count: counts.starred },
    { id: 'closed', label: 'Closed / Fixed', icon: CheckCircle2, count: counts.closed },
  ];

  const handleCreateDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || !newDeptCode.trim()) return;
    addDepartment(newDeptName.trim(), newDeptCode.trim());
    setIsAddingDept(false);
    setNewDeptName('');
    setNewDeptCode('');
  };

  return (
    <aside className="w-56 border-r border-gray-200 bg-white py-3 px-2 flex flex-col h-[calc(100vh-3.5rem)] sticky top-14 select-none shrink-0 text-xs">
      {/* Views */}
      <div className="space-y-0.5 mb-5">
        <div className="px-2 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          Views
        </div>
        {views.map((v) => {
          const Icon = v.icon;
          const isSelected = navView === v.id;
          return (
            <button
              key={v.id}
              onClick={() => {
                setNavView(v.id);
                setSelectedIssue(null);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors ${
                isSelected
                  ? 'bg-gray-100 font-semibold text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-black' : 'text-gray-400'}`} />
                <span>{v.label}</span>
              </div>
              <span className="text-[11px] text-gray-400 font-mono">{v.count}</span>
            </button>
          );
        })}
      </div>

      {/* Components / Departments */}
      <div className="flex-1 overflow-y-auto space-y-0.5">
        <div className="flex items-center justify-between px-2 pb-1">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Components
          </span>
          <button
            onClick={() => setIsAddingDept(true)}
            className="text-gray-400 hover:text-black p-0.5 rounded"
            title="Add component"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={() => {
            setSelectedDepartment('all');
            setSelectedIssue(null);
          }}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors ${
            selectedDepartment === 'all'
              ? 'bg-gray-100 font-semibold text-gray-900'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Folder className="w-3.5 h-3.5 text-gray-400" />
            <span>All Components</span>
          </div>
          <span className="text-[11px] text-gray-400 font-mono">{issues.length}</span>
        </button>

        {departments.map((dept) => {
          const isSelected = selectedDepartment === dept.id;
          const count = issues.filter((i) => i.departmentId === dept.id).length;

          return (
            <button
              key={dept.id}
              onClick={() => {
                setSelectedDepartment(dept.id);
                setSelectedIssue(null);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors ${
                isSelected
                  ? 'bg-gray-100 font-semibold text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                <span className="truncate">{dept.name}</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[10px] text-gray-400">
                <span>[{dept.code}]</span>
                <span>{count}</span>
              </div>
            </button>
          );
        })}

        {isAddingDept && (
          <form onSubmit={handleCreateDept} className="p-2 border border-gray-200 rounded-md bg-gray-50 space-y-2 mt-2">
            <input
              type="text"
              required
              placeholder="Name (e.g. Security)"
              value={newDeptName}
              onChange={(e) => {
                setNewDeptName(e.target.value);
                if (!newDeptCode) {
                  setNewDeptCode(e.target.value.substring(0, 3).toUpperCase());
                }
              }}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none"
            />
            <input
              type="text"
              required
              maxLength={4}
              placeholder="Code (e.g. SEC)"
              value={newDeptCode}
              onChange={(e) => setNewDeptCode(e.target.value.toUpperCase())}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 font-mono focus:outline-none uppercase"
            />
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingDept(false)}
                className="px-2 py-0.5 text-[11px] text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-2.5 py-0.5 text-[11px] font-medium bg-black text-white rounded"
              >
                Add
              </button>
            </div>
          </form>
        )}
      </div>
    </aside>
  );
};
