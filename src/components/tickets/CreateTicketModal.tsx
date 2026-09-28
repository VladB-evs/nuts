import React, { useState } from 'react';
import { useTickets } from '../../context/TicketContext';
import { Priority, TicketStatus, TicketCustomFields, TicketType } from '../../types';
import { Modal } from '../common/Modal';
import { DepartmentFields } from './DepartmentFields';
import { Sparkles, Plus, X } from 'lucide-react';

export const CreateTicketModal: React.FC = () => {
  const {
    isCreateModalOpen,
    setIsCreateModalOpen,
    departments,
    selectedDepartment,
    users,
    createTicket,
    setSelectedTicket,
  } = useTickets();

  const initialDeptId =
    selectedDepartment !== 'all' ? selectedDepartment : 'engineering';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState(initialDeptId);
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<TicketStatus>('new');
  const [type, setType] = useState<TicketType>('service_request');
  const [assigneeId, setAssigneeId] = useState<string>('unassigned');
  const [dueDate, setDueDate] = useState('');
  const [estimateHours, setEstimateHours] = useState<string>('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<TicketCustomFields>({});

  // Reset form
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDepartmentId(selectedDepartment !== 'all' ? selectedDepartment : 'engineering');
    setPriority('medium');
    setStatus('new');
    setType('service_request');
    setAssigneeId('unassigned');
    setDueDate('');
    setEstimateHours('');
    setTags([]);
    setTagInput('');
    setCustomFields({});
  };

  const handleClose = () => {
    setIsCreateModalOpen(false);
    resetForm();
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^#/, '');
      if (clean && !tags.includes(clean)) {
        setTags([...tags, clean]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Quick Template fillers
  const applyTemplate = (type: 'bug' | 'feature' | 'campaign' | 'deal') => {
    if (type === 'bug') {
      setDepartmentId('engineering');
      setPriority('high');
      setTitle('[Bug] ');
      setDescription('### Steps to reproduce:\n1. \n2. \n\n### Expected behavior:\n\n### Actual behavior:\n');
      setTags(['Bug', 'Needs-Triage']);
      setCustomFields({ engineering: { issueType: 'bug', targetEnv: 'production' } });
    } else if (type === 'feature') {
      setDepartmentId('engineering');
      setPriority('medium');
      setTitle('[Feature] ');
      setDescription('### Problem Statement:\n\n### Proposed Solution:\n\n### Acceptance Criteria:\n- [ ] ');
      setTags(['Feature', 'RFC']);
      setCustomFields({ engineering: { issueType: 'feature', targetEnv: 'staging' } });
    } else if (type === 'campaign') {
      setDepartmentId('marketing');
      setPriority('high');
      setTitle('Q4 Growth Campaign: ');
      setDescription('### Campaign Goals:\n\n### Deliverables needed:\n- Social assets\n- Email newsletter copy\n- Tracking UTM links');
      setTags(['Marketing', 'Growth', 'Campaign']);
      setCustomFields({ marketing: { channel: 'social' } });
    } else if (type === 'deal') {
      setDepartmentId('sales');
      setPriority('critical');
      setTitle('Enterprise Inbound: ');
      setDescription('### Account Overview:\n\n### Key Requirements / Pain Points:\n\n### Next Steps & Demo Date:');
      setTags(['Enterprise', 'Sales', 'P0']);
      setCustomFields({ sales: { dealStage: 'discovery', slaHours: 24 } });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const assignee = users.find((u) => u.id === assigneeId) || null;

    const newTicket = createTicket({
      title: title.trim(),
      description: description.trim(),
      departmentId,
      priority,
      status,
      type,
      assignee,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      estimateHours: estimateHours ? Number(estimateHours) : undefined,
      tags,
      customFields,
    });

    handleClose();
    // Open created ticket for inspection
    setSelectedTicket(newTicket);
  };

  return (
    <Modal
      isOpen={isCreateModalOpen}
      onClose={handleClose}
      title="Create New Ticket"
      description="Create a unified task or issue across any startup team"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Quick Templates bar */}
        <div className="flex items-center gap-1.5 flex-wrap pb-3 border-b border-zinc-800">
          <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> Quick Fill:
          </span>
          <button
            type="button"
            onClick={() => applyTemplate('bug')}
            className="text-[11px] font-mono px-2 py-1 rounded bg-zinc-900 border border-zinc-750 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
          >
            🐛 Bug Report
          </button>
          <button
            type="button"
            onClick={() => applyTemplate('feature')}
            className="text-[11px] font-mono px-2 py-1 rounded bg-zinc-900 border border-zinc-750 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
          >
            ✨ Feature Spec
          </button>
          <button
            type="button"
            onClick={() => applyTemplate('campaign')}
            className="text-[11px] font-mono px-2 py-1 rounded bg-zinc-900 border border-zinc-750 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
          >
            📣 Marketing
          </button>
          <button
            type="button"
            onClick={() => applyTemplate('deal')}
            className="text-[11px] font-mono px-2 py-1 rounded bg-zinc-900 border border-zinc-750 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
          >
            💼 Sales Deal
          </button>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-mono text-zinc-400 mb-1.5 font-medium">
            Ticket Title *
          </label>
          <input
            type="text"
            required
            autoFocus
            placeholder="e.g. Implement webhook retry queue with exponential backoff"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-700/80 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:border-white font-sans"
          />
        </div>

        {/* Department, Priority, Status grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              Department *
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700/80 rounded-lg text-zinc-200 font-mono focus:outline-none focus:border-white cursor-pointer"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700/80 rounded-lg text-zinc-200 font-mono focus:outline-none focus:border-white cursor-pointer"
            >
              <option value="critical">Critical (Blocker)</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              Initial Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TicketStatus)}
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700/80 rounded-lg text-zinc-200 font-mono focus:outline-none focus:border-white cursor-pointer"
            >
              <option value="new">New / Triage</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Waiting on Info</option>
            </select>
          </div>
        </div>

        {/* Assignee, Due date, Estimate grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              Assignee
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700/80 rounded-lg text-zinc-200 font-mono focus:outline-none focus:border-white cursor-pointer"
            >
              <option value="unassigned">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700/80 rounded-lg text-zinc-200 font-mono focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5">
              Estimate (Hours)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="e.g. 6"
              value={estimateHours}
              onChange={(e) => setEstimateHours(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700/80 rounded-lg text-zinc-200 font-mono focus:outline-none focus:border-white"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-mono text-zinc-400 mb-1.5">
            Description
          </label>
          <textarea
            rows={4}
            placeholder="Context, user story, details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700/80 rounded-lg text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-white font-mono leading-relaxed"
          />
        </div>

        {/* Department-specific custom attributes */}
        <DepartmentFields
          departmentId={departmentId}
          customFields={customFields}
          isEditing={true}
          onChange={(newFields) => setCustomFields(newFields)}
        />

        {/* Tags */}
        <div>
          <label className="block text-xs font-mono text-zinc-400 mb-1.5">
            Tags (Press Enter to add)
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 text-[11px] font-mono bg-zinc-900 border border-zinc-700 text-zinc-200 px-2 py-0.5 rounded"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(t)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            placeholder="e.g. backend, urgent, q4-goals..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700/80 rounded-lg text-zinc-200 placeholder-zinc-400 font-mono focus:outline-none focus:border-white"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-mono font-medium bg-white text-black hover:bg-zinc-200 rounded-lg shadow transition-colors active:scale-95"
          >
            Create Ticket
          </button>
        </div>
      </form>
    </Modal>
  );
};
