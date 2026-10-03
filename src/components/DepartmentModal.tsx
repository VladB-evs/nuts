import React, { useState, useEffect } from 'react';
import { useIssues } from '../context/TicketContext';
import { CustomFieldDefinition, CustomFieldType } from '../types';
import { CustomSelect, SelectOption } from './CustomSelect';
import { X, Plus, Trash2, Sliders, AlertTriangle } from 'lucide-react';

const FIELD_TYPE_OPTIONS: SelectOption[] = [
  { value: 'select', label: 'Dropdown Menu (Select)', description: 'Predefined options list' },
  { value: 'text', label: 'Single-line Text', description: 'Free-form text input' },
];

export const DepartmentModal: React.FC = () => {
  const {
    isDepartmentModalOpen,
    closeDepartmentModal,
    editingDepartmentId,
    departments,
    issues,
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

  // New field creator state
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('select');
  const [newFieldOptionsRaw, setNewFieldOptionsRaw] = useState('');
  const [isAddingField, setIsAddingField] = useState(false);

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
      } else {
        setName('');
        setCode('');
        setDescription('');
        setCustomFields([]);
      }
      setIsAddingField(false);
      setNewFieldName('');
      setNewFieldType('select');
      setNewFieldOptionsRaw('');
      setShowDeleteConfirm(false);
    }
  }, [isDepartmentModalOpen, targetDept]);

  if (!isDepartmentModalOpen) return null;

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;

    const id = newFieldName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/^_+|_+$/g, '');

    const options =
      newFieldType === 'select'
        ? newFieldOptionsRaw
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined;

    const newField: CustomFieldDefinition = {
      id: id || `field_${Date.now()}`,
      name: newFieldName.trim(),
      type: newFieldType,
      options: options && options.length > 0 ? options : newFieldType === 'select' ? ['Default'] : undefined,
    };

    setCustomFields((prev) => [...prev, newField]);
    setNewFieldName('');
    setNewFieldOptionsRaw('');
    setIsAddingField(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    if (isEditing && editingDepartmentId) {
      updateDepartment(editingDepartmentId, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim(),
        customFields,
      });
    } else {
      addDepartment(name.trim(), code.trim().toUpperCase(), description.trim(), customFields);
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
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={closeDepartmentModal} />

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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Basic Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-gray-700 font-semibold">Department Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!isEditing && !code) {
                    setCode(e.target.value.substring(0, 3).toUpperCase());
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
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. DEV"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black font-mono uppercase font-bold"
              />
            </div>
          </div>

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
                  Custom fields automatically display on each ticket of this department.
                </p>
              </div>
              {!isAddingField && (
                <button
                  type="button"
                  onClick={() => setIsAddingField(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 rounded transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Property</span>
                </button>
              )}
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

            {/* Add Property Form Drawer */}
            {isAddingField && (
              <div className="p-3 border border-gray-300 rounded-md bg-white space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between font-semibold text-gray-900 text-[11px]">
                  <span>Add New Property</span>
                  <button
                    type="button"
                    onClick={() => setIsAddingField(false)}
                    className="text-gray-400 hover:text-black"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] text-gray-600 font-medium">Property Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Environment, Deal Stage"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-black"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] text-gray-600 font-medium">Property Type</label>
                    <CustomSelect
                      value={newFieldType}
                      onChange={(val) => setNewFieldType(val as CustomFieldType)}
                      options={FIELD_TYPE_OPTIONS}
                      size="xs"
                    />
                  </div>
                </div>

                {newFieldType === 'select' && (
                  <div className="space-y-1">
                    <label className="block text-[11px] text-gray-600 font-medium">
                      Dropdown Options (comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. LOCAL, STAGING, PROD"
                      value={newFieldOptionsRaw}
                      onChange={(e) => setNewFieldOptionsRaw(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-black font-mono text-[11px]"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingField(false)}
                    className="px-2.5 py-1 text-[11px] text-gray-600 hover:text-black"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="px-3 py-1 text-[11px] font-medium bg-black text-white rounded hover:bg-gray-800"
                  >
                    Add Property
                  </button>
                </div>
              </div>
            )}
          </div>

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

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={closeDepartmentModal}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-black hover:bg-gray-100 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium bg-black text-white rounded hover:bg-gray-800 transition-colors shadow-2xs"
            >
              {isEditing ? 'Save Changes' : 'Create Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
