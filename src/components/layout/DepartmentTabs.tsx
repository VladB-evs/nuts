import React, { useState } from 'react';
import { useTickets } from '../../context/TicketContext';
import { getDepartmentIcon } from '../common/DepartmentBadge';
import { cn } from '../../lib/utils';
import { Layers, Plus, X } from 'lucide-react';
import { Modal } from '../common/Modal';

export const DepartmentTabs: React.FC = () => {
  const {
    departments,
    selectedDepartment,
    setSelectedDepartment,
    tickets,
    addDepartment,
  } = useTickets();

  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptColor, setNewDeptColor] = useState('#ec4899');
  const [newDeptDesc, setNewDeptDesc] = useState('');

  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || !newDeptCode.trim()) return;

    const created = addDepartment({
      name: newDeptName.trim(),
      code: newDeptCode.trim().toUpperCase(),
      color: newDeptColor,
      icon: 'Layers',
      description: newDeptDesc.trim() || 'Custom department',
    });

    setSelectedDepartment(created.id);
    setIsAddDeptOpen(false);
    setNewDeptName('');
    setNewDeptCode('');
    setNewDeptDesc('');
  };

  return (
    <>
      <div className="w-full border-b border-zinc-800 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2 overflow-x-auto no-scrollbar">
          {/* All Departments Tab */}
          <button
            onClick={() => setSelectedDepartment('all')}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all whitespace-nowrap border',
              selectedDepartment === 'all'
                ? 'bg-zinc-100 text-zinc-950 border-white shadow-sm'
                : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Departments</span>
            <span
              className={cn(
                'px-1.5 py-0.2 text-[10px] rounded-full font-mono',
                selectedDepartment === 'all'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-800 text-zinc-400'
              )}
            >
              {tickets.length}
            </span>
          </button>

          {/* Department specific tabs */}
          {departments.map((dept) => {
            const count = tickets.filter((t) => t.departmentId === dept.id).length;
            const isSelected = selectedDepartment === dept.id;

            return (
              <button
                key={dept.id}
                onClick={() => setSelectedDepartment(dept.id)}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all whitespace-nowrap border',
                  isSelected
                    ? 'bg-zinc-900 text-white border-zinc-600 shadow-sm'
                    : 'bg-zinc-950/60 text-zinc-400 border-zinc-850 hover:text-zinc-200 hover:border-zinc-700'
                )}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0 transition-transform"
                  style={{
                    backgroundColor: dept.color,
                    boxShadow: isSelected ? `0 0 8px ${dept.color}80` : 'none',
                  }}
                />
                <span style={{ color: isSelected ? '#ffffff' : dept.color }}>
                  {getDepartmentIcon(dept.icon, 'w-3.5 h-3.5')}
                </span>
                <span>{dept.name}</span>
                <span className="text-[10px] text-zinc-500 font-mono tracking-wider">
                  [{dept.code}]
                </span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 text-[10px] rounded-full font-mono',
                    isSelected
                      ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                      : 'bg-zinc-900 text-zinc-500'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {/* Add Department button */}
          <button
            onClick={() => setIsAddDeptOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono text-zinc-400 border border-dashed border-zinc-800 hover:border-zinc-600 hover:text-white transition-all whitespace-nowrap"
            title="Create a new department"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Dept</span>
          </button>
        </div>
      </div>

      {/* Modal to add a new department */}
      <Modal
        isOpen={isAddDeptOpen}
        onClose={() => setIsAddDeptOpen(false)}
        title="Add New Department"
        description="Expand NUTS to support another team or function in your startup"
        maxWidth="md"
      >
        <form onSubmit={handleAddDept} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              Department Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Legal, Data Science, Security"
              value={newDeptName}
              onChange={(e) => {
                setNewDeptName(e.target.value);
                if (!newDeptCode) {
                  setNewDeptCode(
                    e.target.value
                      .replace(/[^a-zA-Z]/g, '')
                      .substring(0, 3)
                      .toUpperCase()
                  );
                }
              }}
              className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-white font-sans"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                Ticket Code Prefix *
              </label>
              <input
                type="text"
                required
                maxLength={5}
                placeholder="e.g. LEG"
                value={newDeptCode}
                onChange={(e) => setNewDeptCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-white font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                Accent Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newDeptColor}
                  onChange={(e) => setNewDeptColor(e.target.value)}
                  className="w-10 h-9 p-0.5 rounded border border-zinc-700 bg-zinc-900 cursor-pointer"
                />
                <span className="text-xs font-mono text-zinc-400">{newDeptColor}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              Department Description
            </label>
            <textarea
              rows={2}
              placeholder="Brief description of responsibilities..."
              value={newDeptDesc}
              onChange={(e) => setNewDeptDesc(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setIsAddDeptOpen(false)}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium bg-white text-black hover:bg-zinc-200 rounded-lg transition-colors font-mono"
            >
              Create Department
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};
