import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Issue,
  Department,
  UserProfile,
  Priority,
  Status,
  NavView,
  Environment,
  DevScope,
  MarketingChannel,
  DeliverableType,
  DealSegment,
  DealStage,
  OpsCategory,
  ImpactLevel,
  HistoryEntry,
  CustomFieldDefinition,
} from '../types';
import { INITIAL_DEPARTMENTS, INITIAL_ISSUES, USERS } from '../data/mockData';
import { getUserDepartmentId } from '../lib/departmentRules';

interface IssueContextType {
  issues: Issue[];
  departments: Department[];
  users: UserProfile[];
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  updateUserProfile: (userId: string, updates: Partial<UserProfile>) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  isDepartmentModalOpen: boolean;
  setIsDepartmentModalOpen: (open: boolean) => void;
  editingDepartmentId: string | null;
  openDepartmentModal: (deptId?: string) => void;
  closeDepartmentModal: () => void;
  selectedDepartment: string;
  setSelectedDepartment: (deptId: string) => void;
  navView: NavView;
  setNavView: (view: NavView) => void;
  selectedIssue: Issue | null;
  setSelectedIssue: (issue: Issue | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  priorityFilter: string;
  setPriorityFilter: (priority: string) => void;
  envFilter: string;
  setEnvFilter: (env: string) => void;
  subFilter: string;
  setSubFilter: (filter: string) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;

  // Actions
  createIssue: (data: {
    title: string;
    description: string;
    departmentId: string;
    priority: Priority;
    customAttributes?: Record<string, any>;
    environment?: Environment;
    devScope?: DevScope;
    marketingChannel?: MarketingChannel;
    deliverableType?: DeliverableType;
    dealSegment?: DealSegment;
    dealStage?: DealStage;
    opsCategory?: OpsCategory;
    impactLevel?: ImpactLevel;
    assigneeId?: string;
  }) => Issue;
  updateIssue: (id: string, updates: Partial<Issue>) => void;
  addComment: (issueId: string, text: string, newStatus?: Status) => void;
  toggleStar: (issueId: string) => void;
  deleteIssue: (issueId: string) => void;
  addDepartment: (
    name: string,
    code: string,
    description?: string,
    customFields?: CustomFieldDefinition[]
  ) => Department;
  updateDepartment: (deptId: string, updates: Partial<Department>) => void;
  deleteDepartment: (deptId: string) => void;
  filteredIssues: Issue[];
  counts: {
    open: number;
    assignedToMe: number;
    reportedByMe: number;
    starred: number;
    closed: number;
  };
}

const IssueContext = createContext<IssueContextType | undefined>(undefined);

const STORAGE_KEY = 'nuts_issues_v9';
const STORAGE_DEPTS = 'nuts_depts_v9';
const STORAGE_USERS = 'nuts_users_v9';
const STORAGE_CURRENT_USER = 'nuts_current_user_v9';

const getFieldLabel = (key: string): string => {
  const labels: Record<string, string> = {
    title: 'Title',
    description: 'Description',
    departmentId: 'Department',
    priority: 'Priority',
    status: 'Status',
    assignee: 'Assignee',
    environment: 'Environment Stage',
    devScope: 'Development Layer',
    marketingChannel: 'Marketing Channel',
    deliverableType: 'Deliverable Type',
    dealSegment: 'Deal Segment',
    dealStage: 'Deal Stage',
    opsCategory: 'Ops Category',
    impactLevel: 'Impact Level',
  };
  return labels[key] || key;
};

const formatValueForHistory = (key: string, val: any, departments?: Department[]): string => {
  if (val === null || val === undefined || val === '') return 'None';
  if (key === 'assignee' && typeof val === 'object' && 'name' in val) {
    return val.nickname ? `${val.name} (@${val.nickname})` : val.name;
  }
  if (typeof val === 'object' && 'name' in val) return val.name;
  if (key === 'departmentId' && departments) {
    const dept = departments.find((d) => d.id === val);
    if (dept) return `${dept.name} (${dept.code})`;
  }
  if (key === 'devScope') {
    if (val === 'both') return 'Frontend + Backend';
    if (val === 'frontend') return 'Frontend only';
    if (val === 'backend') return 'Backend only';
  }
  return String(val);
};

export const IssueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [departments, setDepartments] = useState<Department[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DEPTS);
      return saved ? JSON.parse(saved) : INITIAL_DEPARTMENTS;
    } catch {
      return INITIAL_DEPARTMENTS;
    }
  });

  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USERS);
      return saved ? JSON.parse(saved) : USERS;
    } catch {
      return USERS;
    }
  });

  const [currentUser, setCurrentUserState] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CURRENT_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        const matched = USERS.find((u) => u.id === parsed.id);
        return { ...matched, ...parsed };
      }
      return USERS[1]; // Alex Rivera
    } catch {
      return USERS[1];
    }
  });

  const setCurrentUser = (user: UserProfile) => {
    setCurrentUserState(user);
    localStorage.setItem(STORAGE_CURRENT_USER, JSON.stringify(user));
  };

  const [issues, setIssues] = useState<Issue[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_ISSUES;
    } catch {
      return INITIAL_ISSUES;
    }
  });

  const [selectedDepartment, setSelectedDepartmentState] = useState<string>('all');
  const [navView, setNavView] = useState<NavView>('open');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [subFilter, setSubFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);

  const openDepartmentModal = (deptId?: string) => {
    setEditingDepartmentId(deptId || null);
    setIsDepartmentModalOpen(true);
  };

  const closeDepartmentModal = () => {
    setEditingDepartmentId(null);
    setIsDepartmentModalOpen(false);
  };

  const setSelectedDepartment = (deptId: string) => {
    setSelectedDepartmentState(deptId);
    setSubFilter('ALL');
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
  }, [issues]);

  useEffect(() => {
    localStorage.setItem(STORAGE_DEPTS, JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
  }, [users]);

  const updateUserProfile = (userId: string, updates: Partial<UserProfile>) => {
    setUsers((prevUsers) => {
      const nextUsers = prevUsers.map((u) => {
        if (u.id === userId) {
          return { ...u, ...updates };
        }
        return u;
      });
      localStorage.setItem(STORAGE_USERS, JSON.stringify(nextUsers));
      return nextUsers;
    });

    setCurrentUserState((prev) => {
      if (prev.id === userId) {
        const next = { ...prev, ...updates };
        localStorage.setItem(STORAGE_CURRENT_USER, JSON.stringify(next));
        return next;
      }
      return prev;
    });

    setIssues((prevIssues) =>
      prevIssues.map((iss) => {
        let changed = false;
        let newAssignee = iss.assignee;
        let newReporter = iss.reporter;
        let newComments = iss.comments;
        let newHistory = iss.history;

        if (iss.assignee && iss.assignee.id === userId) {
          newAssignee = { ...iss.assignee, ...updates };
          changed = true;
        }
        if (iss.reporter && iss.reporter.id === userId) {
          newReporter = { ...iss.reporter, ...updates };
          changed = true;
        }
        if (iss.comments && iss.comments.some((c) => c.author.id === userId)) {
          newComments = iss.comments.map((c) =>
            c.author.id === userId ? { ...c, author: { ...c.author, ...updates } } : c
          );
          changed = true;
        }
        if (iss.history && iss.history.some((h) => h.actor.id === userId)) {
          newHistory = iss.history.map((h) =>
            h.actor.id === userId ? { ...h, actor: { ...h.actor, ...updates } } : h
          );
          changed = true;
        }

        if (changed) {
          const updated: Issue = {
            ...iss,
            assignee: newAssignee,
            reporter: newReporter,
            comments: newComments,
            history: newHistory,
          };
          if (selectedIssue && selectedIssue.id === iss.id) {
            setSelectedIssue(updated);
          }
          return updated;
        }
        return iss;
      })
    );
  };

  const createIssue = (data: {
    title: string;
    description: string;
    departmentId: string;
    priority: Priority;
    customAttributes?: Record<string, any>;
    environment?: Environment;
    devScope?: DevScope;
    marketingChannel?: MarketingChannel;
    deliverableType?: DeliverableType;
    dealSegment?: DealSegment;
    dealStage?: DealStage;
    opsCategory?: OpsCategory;
    impactLevel?: ImpactLevel;
    assigneeId?: string;
  }): Issue => {
    const dept = departments.find((d) => d.id === data.departmentId) || departments[0];
    const maxNum = issues.reduce((max, i) => Math.max(max, i.number || 100), 100);
    const newNum = maxNum + 1;
    const assignee = users.find((u) => u.id === data.assigneeId) || null;

    const now = new Date().toISOString();
    const customAttrs: Record<string, any> = { ...(data.customAttributes || {}) };

    // Synchronize legacy fields into customAttributes if not set
    if (data.environment && !customAttrs.environment) customAttrs.environment = data.environment;
    if (data.devScope && !customAttrs.devScope) {
      customAttrs.devScope =
        data.devScope === 'both'
          ? 'Both (Frontend + Backend)'
          : data.devScope === 'frontend'
          ? 'Frontend only'
          : 'Backend only';
    }
    if (data.marketingChannel && !customAttrs.marketingChannel) customAttrs.marketingChannel = data.marketingChannel;
    if (data.deliverableType && !customAttrs.deliverableType) customAttrs.deliverableType = data.deliverableType;
    if (data.dealSegment && !customAttrs.dealSegment) customAttrs.dealSegment = data.dealSegment;
    if (data.dealStage && !customAttrs.dealStage) customAttrs.dealStage = data.dealStage;
    if (data.opsCategory && !customAttrs.opsCategory) customAttrs.opsCategory = data.opsCategory;
    if (data.impactLevel && !customAttrs.impactLevel) customAttrs.impactLevel = data.impactLevel;

    // Ensure all defined custom fields for this department have a default value
    if (dept.customFields) {
      dept.customFields.forEach((field) => {
        if (customAttrs[field.id] === undefined || customAttrs[field.id] === null || customAttrs[field.id] === '') {
          customAttrs[field.id] =
            field.defaultValue ||
            (field.options && field.options.length > 0 ? field.options[0] : 'Unset');
        }
      });
    }

    const newIssue: Issue = {
      id: `iss-${Date.now()}`,
      number: newNum,
      code: `${dept.code}-${newNum}`,
      title: data.title,
      description: data.description,
      departmentId: dept.id,
      priority: data.priority,
      status: assignee ? 'ASSIGNED' : 'NEW',
      customAttributes: customAttrs,
      environment: (customAttrs.environment as Environment) || data.environment,
      devScope: data.devScope,
      marketingChannel: (customAttrs.marketingChannel as MarketingChannel) || data.marketingChannel,
      deliverableType: (customAttrs.deliverableType as DeliverableType) || data.deliverableType,
      dealSegment: (customAttrs.dealSegment as DealSegment) || data.dealSegment,
      dealStage: (customAttrs.dealStage as DealStage) || data.dealStage,
      opsCategory: (customAttrs.opsCategory as OpsCategory) || data.opsCategory,
      impactLevel: (customAttrs.impactLevel as ImpactLevel) || data.impactLevel,
      assignee,
      reporter: currentUser,
      createdAt: now,
      updatedAt: now,
      comments: [],
      history: [
        {
          id: `h-${Date.now()}-created`,
          actor: currentUser,
          field: 'Issue',
          oldValue: '',
          newValue: 'Created',
          message: `Created issue ${dept.code}-${newNum} in ${dept.name}`,
          createdAt: now,
        },
      ],
    };

    setIssues((prev) => [newIssue, ...prev]);
    setSelectedIssue(newIssue);
    return newIssue;
  };

  const updateIssue = (id: string, updates: Partial<Issue>) => {
    setIssues((prev) =>
      prev.map((iss) => {
        if (iss.id === id) {
          const now = new Date().toISOString();
          const newEntries: HistoryEntry[] = [];
          const currentDept = departments.find((d) => d.id === (updates.departmentId || iss.departmentId));

          // 1. Check customAttributes changes
          if (updates.customAttributes) {
            const oldAttrs = iss.customAttributes || {};
            const newAttrs = updates.customAttributes;

            Object.keys(newAttrs).forEach((attrKey) => {
              const oldVal = oldAttrs[attrKey] !== undefined ? oldAttrs[attrKey] : (iss as any)[attrKey];
              const newVal = newAttrs[attrKey];

              if (oldVal !== newVal) {
                const fieldDef = currentDept?.customFields?.find((f) => f.id === attrKey);
                const fieldLabel = fieldDef?.name || getFieldLabel(attrKey);
                const oldFormatted = oldVal !== undefined && oldVal !== null && oldVal !== '' ? String(oldVal) : 'None';
                const newFormatted = newVal !== undefined && newVal !== null && newVal !== '' ? String(newVal) : 'None';

                if (oldFormatted !== newFormatted) {
                  newEntries.push({
                    id: `h-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    actor: currentUser,
                    field: fieldLabel,
                    oldValue: oldFormatted,
                    newValue: newFormatted,
                    message:
                      oldFormatted === 'None'
                        ? `Set ${fieldLabel} to "${newFormatted}"`
                        : newFormatted === 'None'
                        ? `Cleared ${fieldLabel} (was "${oldFormatted}")`
                        : `Changed ${fieldLabel} from "${oldFormatted}" to "${newFormatted}"`,
                    createdAt: now,
                  });
                }
              }
            });
          }

          // 2. Check standard fields
          (Object.keys(updates) as (keyof Issue)[]).forEach((key) => {
            if (
              key === 'updatedAt' ||
              key === 'comments' ||
              key === 'history' ||
              key === 'id' ||
              key === 'number' ||
              key === 'code' ||
              key === 'createdAt' ||
              key === 'reporter' ||
              key === 'starred' ||
              key === 'customAttributes'
            ) {
              return;
            }

            const oldRaw = iss[key];
            const newRaw = updates[key];

            const oldFormatted = formatValueForHistory(key as string, oldRaw, departments);
            const newFormatted = formatValueForHistory(key as string, newRaw, departments);

            if (oldFormatted !== newFormatted) {
              const fieldLabel = getFieldLabel(key as string);
              newEntries.push({
                id: `h-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                actor: currentUser,
                field: fieldLabel,
                oldValue: oldFormatted,
                newValue: newFormatted,
                message:
                  oldFormatted === 'None'
                    ? `Set ${fieldLabel} to "${newFormatted}"`
                    : newFormatted === 'None'
                    ? `Cleared ${fieldLabel} (was "${oldFormatted}")`
                    : `Changed ${fieldLabel} from "${oldFormatted}" to "${newFormatted}"`,
                createdAt: now,
              });
            }
          });

          // Merge customAttributes
          const mergedCustomAttrs = updates.customAttributes
            ? { ...(iss.customAttributes || {}), ...updates.customAttributes }
            : iss.customAttributes;

          const updated: Issue = {
            ...iss,
            ...updates,
            customAttributes: mergedCustomAttrs,
            history: [...(iss.history || []), ...newEntries],
            updatedAt: now,
          };

          if (selectedIssue && selectedIssue.id === id) {
            setSelectedIssue(updated);
          }
          return updated;
        }
        return iss;
      })
    );
  };

  const addComment = (issueId: string, text: string, newStatus?: Status) => {
    const current = issues.find((i) => i.id === issueId);
    if (!current) return;

    const now = new Date().toISOString();
    let statusChangeText: string | undefined = undefined;
    const newHistoryEntries: HistoryEntry[] = [];

    if (newStatus && newStatus !== current.status) {
      statusChangeText = `Status changed from ${current.status} to ${newStatus}`;
      newHistoryEntries.push({
        id: `h-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        actor: currentUser,
        field: 'Status',
        oldValue: current.status,
        newValue: newStatus,
        message: statusChangeText,
        createdAt: now,
      });
    }

    const newComment = {
      id: `c-${Date.now()}`,
      author: currentUser,
      text: text.trim(),
      createdAt: now,
      statusChange: statusChangeText,
    };

    const updatedIssue: Issue = {
      ...current,
      status: newStatus || current.status,
      comments:
        text.trim() || statusChangeText ? [...current.comments, newComment] : current.comments,
      history: [...(current.history || []), ...newHistoryEntries],
      updatedAt: now,
    };

    setIssues((prev) => prev.map((i) => (i.id === issueId ? updatedIssue : i)));
    if (selectedIssue?.id === issueId) {
      setSelectedIssue(updatedIssue);
    }
  };

  const toggleStar = (issueId: string) => {
    setIssues((prev) =>
      prev.map((i) => {
        if (i.id === issueId) {
          const updated = { ...i, starred: !i.starred };
          if (selectedIssue?.id === issueId) setSelectedIssue(updated);
          return updated;
        }
        return i;
      })
    );
  };

  const deleteIssue = (issueId: string) => {
    setIssues((prev) => prev.filter((i) => i.id !== issueId));
    if (selectedIssue?.id === issueId) {
      setSelectedIssue(null);
    }
  };

  const addDepartment = (
    name: string,
    code: string,
    description?: string,
    customFields?: CustomFieldDefinition[]
  ): Department => {
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newDept: Department = {
      id,
      name,
      code: code.toUpperCase(),
      description: description || '',
      customFields: customFields || [],
    };
    setDepartments((prev) => [...prev, newDept]);
    return newDept;
  };

  const updateDepartment = (deptId: string, updates: Partial<Department>) => {
    setDepartments((prev) =>
      prev.map((d) => {
        if (d.id === deptId) {
          return { ...d, ...updates };
        }
        return d;
      })
    );

    // Automatically populate custom fields on each ticket of that department if missing
    if (updates.customFields) {
      const activeFields = updates.customFields;
      setIssues((prev) =>
        prev.map((iss) => {
          if (iss.departmentId === deptId) {
            const updatedAttrs = { ...(iss.customAttributes || {}) };
            let modified = false;
            activeFields.forEach((field) => {
              if (
                updatedAttrs[field.id] === undefined ||
                updatedAttrs[field.id] === null ||
                updatedAttrs[field.id] === ''
              ) {
                updatedAttrs[field.id] =
                  field.defaultValue ||
                  (field.options && field.options.length > 0 ? field.options[0] : 'Unset');
                modified = true;
              }
            });
            if (modified) {
              const updated = {
                ...iss,
                customAttributes: updatedAttrs,
              };
              if (selectedIssue && selectedIssue.id === iss.id) {
                setSelectedIssue(updated);
              }
              return updated;
            }
          }
          return iss;
        })
      );
    }

    // If department code changed, update issue codes for that department
    if (updates.code) {
      const newCode = updates.code.toUpperCase();
      setIssues((prev) =>
        prev.map((i) => {
          if (i.departmentId === deptId) {
            return {
              ...i,
              code: `${newCode}-${i.number}`,
            };
          }
          return i;
        })
      );
    }
  };

  const deleteDepartment = (deptId: string) => {
    setDepartments((prev) => prev.filter((d) => d.id !== deptId));
    setIssues((prev) => prev.filter((i) => i.departmentId !== deptId));

    if (selectedDepartment === deptId) {
      setSelectedDepartment('all');
    }
    if (selectedIssue && selectedIssue.departmentId === deptId) {
      setSelectedIssue(null);
    }
  };

  // Filtered Issues computation
  const filteredIssues = useMemo(() => {
    const userDeptId = getUserDepartmentId(currentUser, departments);

    return issues.filter((issue) => {
      // Nav View Filter
      if (navView === 'open') {
        // "Opened issues will show all the opened issues in the department I am assigned to."
        if (issue.status === 'FIXED' || issue.status === 'CLOSED') return false;

        if (selectedDepartment === 'all') {
          if (userDeptId && issue.departmentId !== userDeptId) return false;
        } else {
          if (issue.departmentId !== selectedDepartment) return false;
        }
      } else if (navView === 'assigned_to_me') {
        // "and assigned to me will show all the tickets that are assigned to me even of the tickets are from other departments."
        if (issue.assignee?.id !== currentUser.id) return false;
        if (issue.status === 'FIXED' || issue.status === 'CLOSED') return false;
      } else if (navView === 'reported_by_me') {
        if (issue.reporter.id !== currentUser.id) return false;
        if (selectedDepartment !== 'all' && issue.departmentId !== selectedDepartment) return false;
      } else if (navView === 'starred') {
        if (!issue.starred) return false;
        if (selectedDepartment !== 'all' && issue.departmentId !== selectedDepartment) return false;
      } else if (navView === 'closed') {
        if (issue.status !== 'FIXED' && issue.status !== 'CLOSED') return false;
        if (selectedDepartment === 'all') {
          if (userDeptId && issue.departmentId !== userDeptId) return false;
        } else {
          if (issue.departmentId !== selectedDepartment) return false;
        }
      }

      // Priority Filter
      if (priorityFilter !== 'ALL' && issue.priority !== priorityFilter) {
        return false;
      }

      // Department-specific SubFilter
      if (subFilter !== 'ALL') {
        const matchesCustom = Object.values(issue.customAttributes || {}).some(
          (val) => String(val).toLowerCase() === subFilter.toLowerCase()
        );

        const matches =
          matchesCustom ||
          issue.environment === subFilter ||
          issue.devScope === subFilter ||
          issue.marketingChannel === subFilter ||
          issue.deliverableType === subFilter ||
          issue.dealSegment === subFilter ||
          issue.dealStage === subFilter ||
          issue.opsCategory === subFilter ||
          issue.impactLevel === subFilter;

        if (!matches) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCode = issue.code.toLowerCase().includes(q);
        const matchesNum = String(issue.number).includes(q);
        const matchesTitle = issue.title.toLowerCase().includes(q);
        const matchesDesc = issue.description.toLowerCase().includes(q);
        const matchesAssignee =
          issue.assignee?.name.toLowerCase().includes(q) ||
          issue.assignee?.nickname?.toLowerCase().includes(q) ||
          issue.assignee?.role?.toLowerCase().includes(q);
        const matchesReporter =
          issue.reporter.name.toLowerCase().includes(q) ||
          issue.reporter.nickname?.toLowerCase().includes(q) ||
          issue.reporter.role?.toLowerCase().includes(q);
        const matchesDeptTag =
          issue.environment?.toLowerCase().includes(q) ||
          issue.marketingChannel?.toLowerCase().includes(q) ||
          issue.deliverableType?.toLowerCase().includes(q) ||
          issue.dealSegment?.toLowerCase().includes(q) ||
          issue.dealStage?.toLowerCase().includes(q) ||
          issue.opsCategory?.toLowerCase().includes(q) ||
          issue.impactLevel?.toLowerCase().includes(q);
        const matchesCustomAttrs = Object.values(issue.customAttributes || {}).some((v) =>
          String(v).toLowerCase().includes(q)
        );

        if (
          !matchesCode &&
          !matchesNum &&
          !matchesTitle &&
          !matchesDesc &&
          !matchesAssignee &&
          !matchesReporter &&
          !matchesDeptTag &&
          !matchesCustomAttrs
        ) {
          return false;
        }
      }

      return true;
    });
  }, [issues, selectedDepartment, navView, priorityFilter, subFilter, searchQuery, currentUser, departments]);

  const counts = useMemo(() => {
    const userDeptId = getUserDepartmentId(currentUser, departments);

    // "Opened issues will show all the opened issues in the department I am assigned to."
    const openInUserDept = issues.filter(
      (i) =>
        (userDeptId ? i.departmentId === userDeptId : true) &&
        i.status !== 'FIXED' &&
        i.status !== 'CLOSED'
    ).length;

    // "and assigned to me will show all the tickets that are assigned to me even of the tickets are from other departments."
    const assignedToMe = issues.filter(
      (i) =>
        i.assignee?.id === currentUser.id &&
        i.status !== 'FIXED' &&
        i.status !== 'CLOSED'
    ).length;

    const reportedByMe = issues.filter((i) => i.reporter.id === currentUser.id).length;
    const starred = issues.filter((i) => i.starred).length;

    const closedInUserDept = issues.filter(
      (i) =>
        (userDeptId ? i.departmentId === userDeptId : true) &&
        (i.status === 'FIXED' || i.status === 'CLOSED')
    ).length;

    return {
      open: openInUserDept,
      assignedToMe,
      reportedByMe,
      starred,
      closed: closedInUserDept,
    };
  }, [issues, departments, currentUser]);

  return (
    <IssueContext.Provider
      value={{
        issues,
        departments,
        users,
        currentUser,
        setCurrentUser,
        updateUserProfile,
        isProfileModalOpen,
        setIsProfileModalOpen,
        isDepartmentModalOpen,
        setIsDepartmentModalOpen,
        editingDepartmentId,
        openDepartmentModal,
        closeDepartmentModal,
        selectedDepartment,
        setSelectedDepartment,
        navView,
        setNavView,
        selectedIssue,
        setSelectedIssue,
        searchQuery,
        setSearchQuery,
        priorityFilter,
        setPriorityFilter,
        envFilter: subFilter,
        setEnvFilter: setSubFilter,
        subFilter,
        setSubFilter,
        isCreateModalOpen,
        setIsCreateModalOpen,
        createIssue,
        updateIssue,
        addComment,
        toggleStar,
        deleteIssue,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        filteredIssues,
        counts,
      }}
    >
      {children}
    </IssueContext.Provider>
  );
};

export const useIssues = () => {
  const context = useContext(IssueContext);
  if (!context) throw new Error('useIssues must be used within an IssueProvider');
  return context;
};
