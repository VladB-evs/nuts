import React, { useState, useEffect } from 'react';
import { useIssues } from '../context/TicketContext';
import { CustomFieldDefinition, Status } from '../types';
import { X, Plus, Trash2, Sliders, AlertTriangle, ShieldAlert } from 'lucide-react';
import {
  DEPARTMENT_TEMPLATES,
  DepartmentTemplate,
  parseQuickProperty,
  suggestDepartmentCode,
} from '../lib/departmentTemplates';
import { findDuplicateDepartment } from '../lib/departmentRules';
import { ALL_STATUSES, sanitizeWorkflow } from '../lib/workflow';

export const DepartmentModal: React.FC = () => {
  const {
    isDepartmentModalOpen,
    closeDepartmentModal,
    editingDepartmentId,
    departments,
    issues,
    currentUser,
    addDepartment,
    updateDepartment,
    deleteDepartment,
  } = useIssues();

  const isEditing = Boolean(editingDepartmentId);
  const targetDept = departments.find((d) => d.id === editingDepartmentId);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);

  // Code follows the name until the admin types their own
  const [codeTouched, setCodeTouched] = useState(false);
  const [templateName, setTemplateName] = useState<string | null>(null);

  // Workflow: which statuses the department uses, and what it calls them
  const [workflowStatuses, setWorkflowStatuses] = useState<Status[]>([...ALL_STATUSES]);
  const [workflowLabels, setWorkflowLabels] = useState<Partial<Record<Status, string>>>({});

  // One-line "Name: option, option" property entry
  const [quickProperty, setQuickProperty] = useState('');

  // New option tag input for existing select field
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});

  // Confirmation state for deleting
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isDepartmentModalOpen) {
      if (targetDept) {
        setName(targetDept.name);
        setCode(targetDept.code);
        setDescription(targetDept.description || '');
        setCustomFields(targetDept.customFields ? JSON.parse(JSON.stringify(targetDept.customFields)) : []);
        setWorkflowStatuses(targetDept.workflow?.statuses ? [...targetDept.workflow.statuses] : [...ALL_STATUSES]);
        setWorkflowLabels({ ...(targetDept.workflow?.labels || {}) });
      } else {
        setName('');
        setCode('');
        setDescription('');
        setCustomFields([]);
        setWorkflowStatuses([...ALL_STATUSES]);
        setWorkflowLabels({});
      }
      setCodeTouched(false);
      setTemplateName(null);
      setQuickProperty('');
      setShowDeleteConfirm(false);
    }
  }, [isDepartmentModalOpen, targetDept]);

  if (!isDepartmentModalOpen) return null;

  const handleQuickAdd = () => {
    const field = parseQuickProperty(quickProperty, customFields.map((f) => f.id));
    if (!field) return;
    setCustomFields((prev) => [...prev, field]);
    setQuickProperty('');
  };

  const applyTemplate = (template: DepartmentTemplate | null) => {
    setTemplateName(template?.name ?? null);
    setName(template?.name ?? '');
    setCode(template?.code ?? '');
    setCodeTouched(Boolean(template));
    setDescription(template?.description ?? '');
    setCustomFields(template ? JSON.parse(JSON.stringify(template.customFields)) : []);
  };

  const handleToggleFilter = (fieldId: string) => {
    setCustomFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, showAsFilter: !f.showAsFilter } : f))
    );
  };

  const handleRemoveField = (fieldId: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== fieldId));
  };

  const handleAddOptionToField = (fieldId: string) => {
    const optVal = (newOptionInputs[fieldId] || '').trim();
    if (!optVal) return;

    setCustomFields((prev) =>
      prev.map((f) => {
        if (f.id === fieldId) {
          const currentOptions = f.options || [];
          if (!currentOptions.includes(optVal)) {
            return { ...f, options: [...currentOptions, optVal] };
          }
        }
        return f;
      })
    );

    setNewOptionInputs((prev) => ({ ...prev, [fieldId]: '' }));
  };

  const handleRemoveOptionFromField = (fieldId: string, optionToRemove: string) => {
    setCustomFields((prev) =>
      prev.map((f) => {
        if (f.id === fieldId && f.options) {
          return { ...f, options: f.options.filter((o) => o !== optionToRemove) };
        }
        return f;
      })
    );
  };

  const duplicate = findDuplicateDepartment(departments, name, code, editingDepartmentId);
  const workflowResult = sanitizeWorkflow({ statuses: workflowStatuses, labels: workflowLabels });
  const workflowError = workflowResult.ok ? null : workflowResult.error;
  const workflow = workflowResult.ok ? workflowResult.value : null;
  const droppedStatusTickets = isEditing
    ? issues.filter((i) => i.departmentId === editingDepartmentId && !workflowStatuses.includes(i.status)).length
    : 0;
  const toggleWorkflowStatus = (st: Status) =>
    setWorkflowStatuses((prev) => (prev.includes(st) ? prev.filter((x) => x !== st) : [...prev, st]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || duplicate || workflowError) return;

    if (isEditing && editingDepartmentId) {
      updateDepartment(editingDepartmentId, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim(),
        customFields,
        workflow: workflow || undefined,
      });
    } else {
      if (!currentUser?.isAdmin) return;
      addDepartment(name.trim(), code.trim().toUpperCase(), description.trim(), customFields, workflow || undefined);
    }

    closeDepartmentModal();
  };

  const deptIssueCount = editingDepartmentId
    ? issues.filter((i) => i.departmentId === editingDepartmentId).length
    : 0;

  const handleDelete = () => {
    if (editingDepartmentId) {
      deleteDepartment(editingDepartmentId);
      closeDepartmentModal();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-scrim/40 backdrop-blur-xs" onClick={closeDepartmentModal} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-lg border border-gray-300 shadow-xl overflow-hidden z-10 animate-fade-in text-xs max-h-[92vh] flex flex-col font-sans">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-black" />
            <h2 className="text-sm font-semibold text-gray-900 truncate">
              {isEditing ? `Department Settings: ${targetDept?.name || name}` : 'Create New Department'}
            </h2>
          </div>
          <button
            onClick={closeDepartmentModal}
            className="text-gray-400 hover:text-black p-1 rounded hover:bg-gray-200 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Non-admin access denial for creation */}
        {!isEditing && !currentUser?.isAdmin ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Administrator Privileges Required</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
              Only workspace administrators have permission to create new departments. Please contact your workspace administrator to set up new departments.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={closeDepartmentModal}
                className="px-4 py-1.5 bg-black text-white hover:bg-gray-800 rounded font-medium text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Content Form */
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Templates (new departments only) */}
          {!isEditing && (
            <div className="space-y-1.5">
              <label className="block text-gray-700 font-semibold">Start from a template</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyTemplate(null)}
                  className={`px-2.5 py-1 rounded border text-[11px] font-medium transition-colors cursor-pointer ${
                    templateName === null
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'
                  }`}
                >
                  Blank
                </button>
                {DEPARTMENT_TEMPLATES.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className={`px-2.5 py-1 rounded border text-[11px] font-medium transition-colors cursor-pointer ${
                      templateName === t.name
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Basic Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-gray-700 font-semibold">Department Name *</label>
              <input
                type="text"
                required
                value={name}
                autoFocus={!isEditing}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!isEditing && !codeTouched) {
                    setCode(suggestDepartmentCode(e.target.value));
                  }
                }}
                placeholder="e.g. Engineering, Security, Mobile"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-gray-700 font-semibold">Code *</label>
              <input
                type="text"
                required
                maxLength={5}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setCodeTouched(true);
                }}
                placeholder="e.g. DEV"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black font-mono uppercase font-bold"
              />
            </div>
          </div>

          {duplicate && (
            <p className="text-[11px] text-red-600 -mt-2">
              {duplicate.name.trim().toLowerCase() === name.trim().toLowerCase()
                ? `A department named "${duplicate.name}" already exists.`
                : `The code ${duplicate.code} is already used by ${duplicate.name}.`}
            </p>
          )}

          <div className="space-y-1">
            <label className="block text-gray-700 font-medium">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of this department's scope"
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black"
            />
          </div>

          {/* Custom Properties Section */}
          <div className="pt-3 border-t border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-gray-900 uppercase font-mono tracking-wider">
                  Custom Fields & Properties ({customFields.length})
                </h3>
                <p className="text-[11px] text-gray-500">
                  Every property is filled in when a ticket is created.
                </p>
              </div>
            </div>

            {/* List of Defined Custom Fields */}
            {customFields.length > 0 ? (
              <div className="space-y-2">
                {customFields.map((field) => (
                  <div
                    key={field.id}
                    className="p-3 border border-gray-200 rounded-md bg-gray-50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{field.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border bg-white text-gray-600 border-gray-200 uppercase">
                          {field.type}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveField(field.id)}
                        className="text-gray-400 hover:text-red-600 p-1 rounded"
                        title="Delete property"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {field.type === 'select' && (
                      <label className="flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(field.showAsFilter)}
                          onChange={() => handleToggleFilter(field.id)}
                          className="w-3.5 h-3.5 accent-black cursor-pointer"
                        />
                        <span>Show as a filter on the issue list</span>
                      </label>
                    )}

                    {/* If select, display options chips and add option input */}
                    {field.type === 'select' && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(field.options || []).map((opt) => (
                            <span
                              key={opt}
                              className="inline-flex items-center gap-1 text-[10px] font-mono bg-white border border-gray-300 px-1.5 py-0.5 rounded text-gray-800"
                            >
                              <span>{opt}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveOptionFromField(field.id, opt)}
                                className="text-gray-400 hover:text-red-500 font-bold ml-0.5"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>

                        {/* Add Option Input */}
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <input
                            type="text"
                            placeholder="Add option..."
                            value={newOptionInputs[field.id] || ''}
                            onChange={(e) =>
                              setNewOptionInputs((prev) => ({ ...prev, [field.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddOptionToField(field.id);
                              }
                            }}
                            className="px-2 py-0.5 text-[11px] border border-gray-300 rounded bg-white text-gray-900 focus:outline-none w-36"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddOptionToField(field.id)}
                            className="px-2 py-0.5 text-[10px] bg-gray-200 hover:bg-gray-300 rounded font-medium text-gray-800"
                          >
                            + Option
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 border border-dashed border-gray-300 rounded-md text-center text-gray-500 text-[11px]">
                No custom properties defined. Tickets in this department will only have standard fields (Title, Priority, Status, Assignee).
              </div>
            )}

            {/* Quick add: one line per property */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={quickProperty}
                  onChange={(e) => setQuickProperty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickAdd();
                    }
                  }}
                  placeholder="Add a property, e.g.  Channel: Social, Email, Paid"
                  className="flex-1 min-w-0 px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black font-mono text-[11px]"
                />
                <button
                  type="button"
                  onClick={handleQuickAdd}
                  disabled={!quickProperty.trim()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-black text-white rounded hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>
              <p className="text-[10px] text-gray-500">
                Press Enter. Add options after a colon for a dropdown; leave them off for a free-text field.
              </p>
            </div>
          </div>

          {/* Workflow */}
          <details className="pt-3 border-t border-gray-200 group" open={Boolean(targetDept?.workflow)}>
            <summary className="cursor-pointer select-none text-xs font-semibold text-gray-900 uppercase font-mono tracking-wider">
              Workflow {workflow ? `(${workflowStatuses.length} of ${ALL_STATUSES.length} statuses)` : '(all statuses)'}
            </summary>
            <div className="mt-2 space-y-2">
              <p className="text-[11px] text-gray-500">
                Choose the statuses this department uses and, if you like, what it calls them. Existing tickets keep the status they have.
              </p>
              <div className="space-y-1">
                {ALL_STATUSES.map((st) => {
                  const on = workflowStatuses.includes(st);
                  const locked = st === 'NEW' || st === 'CLOSED'; // tickets start as NEW and leave Open as CLOSED
                  return (
                    <div key={st} className="flex items-center gap-2">
                      <label className="flex items-center gap-2 w-36 shrink-0 font-mono text-[11px] text-gray-800 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={locked}
                          onChange={() => toggleWorkflowStatus(st)}
                          className="w-3.5 h-3.5 accent-black cursor-pointer disabled:cursor-not-allowed"
                        />
                        {st}
                      </label>
                      <input
                        type="text"
                        value={workflowLabels[st] || ''}
                        disabled={!on}
                        maxLength={30}
                        onChange={(e) => setWorkflowLabels((prev) => ({ ...prev, [st]: e.target.value }))}
                        placeholder={`Shown as ${st}`}
                        className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black text-[11px] disabled:opacity-40"
                      />
                    </div>
                  );
                })}
              </div>
              {workflowError && <p className="text-[11px] text-red-600">{workflowError}</p>}
              {droppedStatusTickets > 0 && (
                <p className="text-[11px] text-amber-700">
                  {droppedStatusTickets} {droppedStatusTickets === 1 ? 'ticket uses' : 'tickets use'} a status you removed. They keep it until someone changes it.
                </p>
              )}
            </div>
          </details>

          {/* Delete Department Section (Only for existing department) */}
          {isEditing && (
            <div className="pt-3 border-t border-gray-200">
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium p-1 rounded hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Department...</span>
                </button>
              ) : (
                <div className="p-3 border border-red-200 bg-red-50/60 rounded-md space-y-2">
                  <div className="flex items-start gap-2 text-red-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Permanently delete {targetDept?.name}?</span>
                      <span className="text-[11px] text-red-700 block">
                        This department contains {deptIssueCount} {deptIssueCount === 1 ? 'ticket' : 'tickets'}. Deleting the department will permanently remove it and all of its associated tickets.
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2.5 py-1 text-[11px] font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-2.5 py-1 text-[11px] font-medium text-white bg-red-600 rounded hover:bg-red-700"
                    >
                      Yes, Delete Department
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          </div>

          {/* Actions */}
          <div className="shrink-0 flex items-center justify-end gap-2 px-4 sm:px-5 py-3 border-t border-gray-200 bg-gray-50/80">
            <button
              type="button"
              onClick={closeDepartmentModal}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-black hover:bg-gray-100 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={Boolean(duplicate) || Boolean(workflowError)}
              className="px-4 py-1.5 text-xs font-medium bg-black text-white rounded hover:bg-gray-800 transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isEditing ? 'Save Changes' : 'Create Department'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
