import React, { useState, useEffect, useMemo } from 'react';
import { useIssues } from '../context/TicketContext';
import {
  Building2,
  ShieldCheck,
  Plus,
  Trash2,
  Check,
  ArrowRight,
  LogOut,
  AlertCircle,
  Sparkles,
  Layers,
  UserCheck,
} from 'lucide-react';

const DEPARTMENT_PRESETS = [
  { name: 'Engineering', code: 'DEV', description: 'Core product development, bug triage, and feature engineering' },
  { name: 'Product', code: 'PRD', description: 'Product management, user research, and roadmap planning' },
  { name: 'Marketing', code: 'MKT', description: 'Content, growth campaigns, SEO, and brand acquisition' },
  { name: 'Sales', code: 'SLS', description: 'Pipelines, enterprise deals, partnerships, and account executive tasks' },
  { name: 'Operations', code: 'OPS', description: 'Finance, legal contracts, IT access, and office facilities' },
  { name: 'Customer Support', code: 'CS', description: 'Customer tickets, troubleshooting, and issue escalation' },
  { name: 'Design', code: 'DSN', description: 'Product design, UI/UX systems, and visual design assets' },
];

export const DepartmentOnboardingModal: React.FC = () => {
  const {
    currentUser,
    departments,
    addDepartment,
    deleteDepartment,
    updateUserProfile,
    logout,
    isLoadingDatabase,
    isDemoMode,
  } = useIssues();

  const [selectedDeptName, setSelectedDeptName] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Check if current user has a department that matches one in the organization
  const isDepartmentValid = useMemo(() => {
    if (!currentUser || isDemoMode) return true;
    const deptName = currentUser.department?.trim();
    if (!deptName) return false;
    return departments.some(
      (d) =>
        d.name.toLowerCase() === deptName.toLowerCase() ||
        d.id.toLowerCase() === deptName.toLowerCase() ||
        d.code.toLowerCase() === deptName.toLowerCase()
    );
  }, [currentUser, departments, isDemoMode]);

  // Keep selected department aligned with available departments
  useEffect(() => {
    if (departments.length > 0) {
      const currentSelected = departments.find(
        (d) => d.name.toLowerCase() === selectedDeptName.toLowerCase()
      );
      if (!currentSelected) {
        // Try matching currentUser department if any, else first department
        const matched = departments.find(
          (d) =>
            d.name.toLowerCase() === currentUser?.department?.trim().toLowerCase() ||
            d.id.toLowerCase() === currentUser?.department?.trim().toLowerCase() ||
            d.code.toLowerCase() === currentUser?.department?.trim().toLowerCase()
        );
        setSelectedDeptName(matched ? matched.name : departments[0].name);
      }
    } else {
      setSelectedDeptName('');
    }
  }, [departments, selectedDeptName, currentUser?.department]);

  if (!currentUser || isDemoMode || isDepartmentValid) {
    return null;
  }

  // Loading state while Neon fetches initial organization departments
  if (isLoadingDatabase) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-8 max-w-sm w-full text-center space-y-3 font-mono">
          <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-gray-700 font-medium">Connecting to company workspace...</p>
        </div>
      </div>
    );
  }

  const isAdmin = Boolean(currentUser.isAdmin);
  const orgName = currentUser.organization?.name || 'Company Workspace';

  // Available presets that aren't already added
  const availablePresets = DEPARTMENT_PRESETS.filter(
    (preset) =>
      !departments.some(
        (d) =>
          d.name.toLowerCase() === preset.name.toLowerCase() ||
          d.code.toLowerCase() === preset.code.toLowerCase()
      )
  );

  const handleAddPreset = (preset: (typeof DEPARTMENT_PRESETS)[0]) => {
    setError(null);
    try {
      addDepartment(preset.name, preset.code, preset.description);
      if (!selectedDeptName) {
        setSelectedDeptName(preset.name);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to add department');
    }
  };

  const handleAddCustomDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanName = customName.trim();
    let cleanCode = customCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (!cleanName) {
      setError('Please enter a department name.');
      return;
    }

    if (!cleanCode) {
      cleanCode = cleanName.substring(0, 3).toUpperCase();
    }

    const nameExists = departments.some(
      (d) => d.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (nameExists) {
      setError(`Department "${cleanName}" already exists.`);
      return;
    }

    const codeExists = departments.some(
      (d) => d.code.toLowerCase() === cleanCode.toLowerCase()
    );
    if (codeExists) {
      setError(`Department code "[${cleanCode}]" is already in use.`);
      return;
    }

    try {
      addDepartment(cleanName, cleanCode);
      setCustomName('');
      setCustomCode('');
      setIsAddingCustom(false);
      if (!selectedDeptName) {
        setSelectedDeptName(cleanName);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to add custom department');
    }
  };

  const handleDeleteDepartment = (deptId: string, deptName: string) => {
    setError(null);
    if (departments.length <= 1) {
      setError('Your company must have at least one department.');
      return;
    }
    deleteDepartment(deptId);
    if (selectedDeptName === deptName) {
      const remaining = departments.filter((d) => d.id !== deptId);
      setSelectedDeptName(remaining[0]?.name || '');
    }
  };

  const handleSaveAndContinue = async () => {
    if (!selectedDeptName) {
      setError('Please choose which department you belong to.');
      return;
    }

    const targetDept = departments.find(
      (d) => d.name.toLowerCase() === selectedDeptName.toLowerCase()
    );
    if (!targetDept) {
      setError('The selected department does not exist in your company.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      updateUserProfile(currentUser.id, {
        department: targetDept.name,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to save department.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-300 max-w-lg w-full overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2 py-0.5 rounded">
              {isAdmin ? 'Workspace Setup' : 'Onboarding'}
            </span>
            <span className="font-mono text-xs text-gray-500 truncate">
              {orgName}
            </span>
          </div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
            {isAdmin ? (
              <>
                <ShieldCheck className="w-5 h-5 text-black" />
                <span>Configure Departments & Your Role</span>
              </>
            ) : (
              <>
                <Building2 className="w-5 h-5 text-black" />
                <span>Select Your Department</span>
              </>
            )}
          </h2>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            {isAdmin
              ? 'As the Workspace Admin, first add or review the departments for your company, then select which department you belong to.'
              : `Welcome to ${orgName}! Please select the department you belong to so your issues and views are accurately assigned.`}
          </p>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ADMIN FLOW: STEP 1 - Manage Company Departments */}
          {isAdmin && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-gray-200">
                <span className="text-xs font-bold text-gray-900 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-gray-500" />
                  <span>1. Company Departments ({departments.length})</span>
                </span>
                <span className="text-[11px] text-gray-500 font-mono">
                  All employees will choose from these
                </span>
              </div>

              {/* List of current company departments */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {departments.map((dept) => (
                  <div
                    key={dept.id}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-gray-900 truncate">
                        {dept.name}
                      </span>
                      <span className="font-mono text-[10px] font-semibold bg-white border border-gray-300 text-gray-700 px-1.5 py-0.5 rounded shrink-0">
                        [{dept.code}]
                      </span>
                      {dept.description && (
                        <span className="text-gray-400 text-[11px] truncate hidden sm:inline">
                          — {dept.description}
                        </span>
                      )}
                    </div>
                    {departments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                        className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors shrink-0"
                        title={`Delete ${dept.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Quick Preset Adders */}
              {availablePresets.length > 0 && (
                <div className="pt-2">
                  <div className="text-[11px] font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Quick-add common departments:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {availablePresets.map((preset) => (
                      <button
                        key={preset.code}
                        type="button"
                        onClick={() => handleAddPreset(preset)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded text-xs text-gray-700 font-medium transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-gray-500" />
                        <span>{preset.name}</span>
                        <span className="font-mono text-[10px] text-gray-400">[{preset.code}]</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Department Adder */}
              <div className="pt-1">
                {!isAddingCustom ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingCustom(true)}
                    className="text-xs font-semibold text-gray-700 hover:text-black flex items-center gap-1 py-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add custom department...</span>
                  </button>
                ) : (
                  <form
                    onSubmit={handleAddCustomDepartment}
                    className="p-3 bg-gray-50 border border-gray-200 rounded space-y-2"
                  >
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                          Department Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Legal, Finance, Security"
                          value={customName}
                          onChange={(e) => {
                            setCustomName(e.target.value);
                            if (!customCode || customCode.length <= 3) {
                              setCustomCode(e.target.value.substring(0, 3).toUpperCase());
                            }
                          }}
                          className="w-full px-2.5 py-1 text-xs bg-white border border-gray-300 rounded focus:outline-none focus:border-black font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                          Code
                        </label>
                        <input
                          type="text"
                          maxLength={5}
                          required
                          placeholder="LGL"
                          value={customCode}
                          onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                          className="w-full px-2.5 py-1 text-xs bg-white border border-gray-300 rounded focus:outline-none focus:border-black font-mono font-semibold"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCustom(false);
                          setCustomName('');
                          setCustomCode('');
                        }}
                        className="px-2.5 py-1 text-xs text-gray-600 hover:text-black rounded cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-black text-white hover:bg-gray-800 text-xs font-semibold rounded cursor-pointer"
                      >
                        Add Department
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* SECTION 2: Select Which Department YOU Belong To */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-gray-200">
              <span className="text-xs font-bold text-gray-900 uppercase font-mono tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-gray-500" />
                <span>
                  {isAdmin
                    ? '2. Which department do you belong to?'
                    : 'Choose your department'}
                </span>
              </span>
              <span className="text-[11px] text-gray-500 font-mono">
                Must exist in {orgName}
              </span>
            </div>

            {departments.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs space-y-2">
                <p className="font-semibold">No company departments found.</p>
                <p className="text-[11px]">
                  {isAdmin
                    ? 'Please add at least one department above before selecting your department.'
                    : 'Your workspace administrator has not configured any departments yet. Please contact your admin or check back shortly.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {departments.map((dept) => {
                  const isSelected =
                    selectedDeptName.toLowerCase() === dept.name.toLowerCase();

                  return (
                    <div
                      key={dept.id}
                      onClick={() => {
                        setSelectedDeptName(dept.name);
                        setError(null);
                      }}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-gray-50 border-black ring-1 ring-black shadow-xs'
                          : 'bg-white border-gray-200 hover:border-gray-400 hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-gray-900 block truncate">
                            {dept.name}
                          </span>
                          <span className="font-mono text-[10px] font-semibold text-gray-500">
                            [{dept.code}]
                          </span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected
                              ? 'bg-black border-black text-white'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>
                      {dept.description && (
                        <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 leading-normal font-sans">
                          {dept.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-medium transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </button>

          <button
            type="button"
            disabled={submitting || departments.length === 0 || !selectedDeptName}
            onClick={handleSaveAndContinue}
            className="inline-flex items-center gap-2 px-5 py-2 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 rounded-md text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <span>{submitting ? 'Saving setup...' : 'Save & Enter Workspace'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
