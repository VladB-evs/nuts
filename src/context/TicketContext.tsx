import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Issue,
  Department,
  UserProfile,
  Priority,
  Status,
  NavView,
  IssueType,
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
import { isNeonConfigured } from '../lib/neon';
import {
  fetchAllDataFromNeon,
  createIssueInNeon,
  updateIssueInNeon,
  addCommentInNeon,
  deleteIssueInNeon,
  saveDepartmentInNeon,
  deleteDepartmentInNeon,
  updateProfileInNeon,
  validateSessionToken,
} from '../lib/neonService';

interface IssueContextType {
  issues: Issue[];
  departments: Department[];
  users: UserProfile[];
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  logout: () => void;
  isDemoMode: boolean;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  isNeonConnected: boolean;
  isLoadingDatabase: boolean;
  reloadFromDatabase: (orgId?: string) => Promise<void>;
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
    issueType?: IssueType;
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

const STORAGE_KEY = 'nuts_issues_v10';
const STORAGE_DEPTS = 'nuts_depts_v10';
const STORAGE_USERS = 'nuts_users_v10';
const STORAGE_CURRENT_USER = 'nuts_current_user_v10';

const getFieldLabel = (key: string): string => {
  const labels: Record<string, string> = {
    title: 'Title',
    description: 'Description',
    departmentId: 'Department',
    priority: 'Priority',
    status: 'Status',
    assignee: 'Assignee',
    issueType: 'Issue Type',
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
  const STORAGE_DEMO_KEY = 'nuts_is_demo_mode_v10';

  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_DEMO_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CURRENT_USER);
      if (saved) {
        return JSON.parse(saved);
      }
      return null;
    } catch {
      return null;
    }
  });

  const [departments, setDepartments] = useState<Department[]>(() => {
    if (localStorage.getItem(STORAGE_DEMO_KEY) === 'true') {
      return INITIAL_DEPARTMENTS;
    }
    return [
      {
        id: 'engineering',
        name: 'Engineering',
        code: 'DEV',
        description: 'Core product engineering and bug triage',
        customFields: [
          { id: 'issueType', name: 'Issue Type', type: 'select', options: ['Bug', 'Feature'], defaultValue: 'Bug', required: true },
          { id: 'environment', name: 'Environment Stage', type: 'select', options: ['LOCAL', 'STAGING', 'PROD'], defaultValue: 'STAGING' },
          { id: 'devScope', name: 'Development Layer', type: 'select', options: ['Frontend only', 'Backend only', 'Both (Frontend + Backend)'], defaultValue: 'Both (Frontend + Backend)' },
        ],
      },
    ];
  });

  const [users, setUsers] = useState<UserProfile[]>(() => {
    if (localStorage.getItem(STORAGE_DEMO_KEY) === 'true') {
      return USERS;
    }
    try {
      const saved = localStorage.getItem(STORAGE_CURRENT_USER);
      if (saved) return [JSON.parse(saved)];
    } catch {}
    return [];
  });

  const [issues, setIssues] = useState<Issue[]>(() => {
    if (localStorage.getItem(STORAGE_DEMO_KEY) === 'true') {
      return INITIAL_ISSUES;
    }
    return [];
  });

  const setCurrentUser = (user: UserProfile | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem(STORAGE_CURRENT_USER, JSON.stringify(user));
      if (user.orgId) {
        reloadFromDatabase(user.orgId);
      }
    } else {
      localStorage.removeItem(STORAGE_CURRENT_USER);
      localStorage.removeItem('nuts_session_token');
    }
  };

  const enterDemoMode = () => {
    setIsDemoMode(true);
    localStorage.setItem(STORAGE_DEMO_KEY, 'true');
    setCurrentUserState(USERS[1]); // Alex Rivera
    setDepartments(INITIAL_DEPARTMENTS);
    setUsers(USERS);
    setIssues(INITIAL_ISSUES);
  };

  const exitDemoMode = () => {
    setIsDemoMode(false);
    localStorage.removeItem(STORAGE_DEMO_KEY);
    setCurrentUserState(null);
    setDepartments([
      {
        id: 'engineering',
        name: 'Engineering',
        code: 'DEV',
        description: 'Core product engineering and bug triage',
        customFields: [
          { id: 'issueType', name: 'Issue Type', type: 'select', options: ['Bug', 'Feature'], defaultValue: 'Bug', required: true },
          { id: 'environment', name: 'Environment Stage', type: 'select', options: ['LOCAL', 'STAGING', 'PROD'], defaultValue: 'STAGING' },
          { id: 'devScope', name: 'Development Layer', type: 'select', options: ['Frontend only', 'Backend only', 'Both (Frontend + Backend)'], defaultValue: 'Both (Frontend + Backend)' },
        ],
      },
    ]);
    setUsers([]);
    setIssues([]);
  };

  const logout = () => {
    setIsDemoMode(false);
    localStorage.removeItem(STORAGE_DEMO_KEY);
    localStorage.removeItem(STORAGE_CURRENT_USER);
    localStorage.removeItem('nuts_session_token');
    setCurrentUserState(null);
    setIssues([]);
  };

  const [isNeonConnected, setIsNeonConnected] = useState<boolean>(isNeonConfigured());
  const [isLoadingDatabase, setIsLoadingDatabase] = useState<boolean>(false);

  const reloadFromDatabase = async (targetOrgId?: string) => {
    if (isDemoMode) return;
    if (!isNeonConfigured()) {
      setIsNeonConnected(false);
      return;
    }
    const orgId = targetOrgId || currentUser?.orgId;
    setIsLoadingDatabase(true);
    try {
      const data = await fetchAllDataFromNeon(orgId);
      if (data) {
        if (data.departments && data.departments.length > 0) {
          setDepartments(data.departments);
        }
        if (data.users) {
          setUsers(data.users.length > 0 ? data.users : (currentUser ? [currentUser] : []));
          if (currentUser) {
            const updated = data.users.find(
              (u) => u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase()
            );
            if (updated) {
              setCurrentUserState((prev) => (prev ? { ...prev, ...updated, organization: prev.organization } : null));
            }
          }
        }
        if (data.issues) {
          setIssues(data.issues);
        }
        setIsNeonConnected(true);
      }
    } catch (err) {
      console.warn('Failed to fetch from Neon database:', err);
      setIsNeonConnected(false);
    } finally {
      setIsLoadingDatabase(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('nuts_session_token');
    if (token && !currentUser && !isDemoMode && isNeonConfigured()) {
      validateSessionToken(token)
        .then((user) => {
          if (user) {
            setCurrentUserState(user);
            localStorage.setItem(STORAGE_CURRENT_USER, JSON.stringify(user));
            if (user.orgId) {
              reloadFromDatabase(user.orgId);
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!isDemoMode && currentUser?.orgId) {
      reloadFromDatabase(currentUser.orgId);
    }
  }, [isDemoMode, currentUser?.orgId]);

  const [selectedDepartment, setSelectedDepartmentState] = useState<string>('all');
  const [navView, setNavView] = useState<NavView>('assigned_to_me');
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
      if (prev && prev.id === userId) {
        const next: UserProfile = { ...prev, ...updates };
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

    if (isNeonConfigured()) {
      updateProfileInNeon(userId, updates);
    }
  };

  const createIssue = (data: {
    title: string;
    description: string;
    departmentId: string;
    priority: Priority;
    customAttributes?: Record<string, any>;
    issueType?: IssueType;
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
    if (data.issueType && !customAttrs.issueType) customAttrs.issueType = data.issueType;
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

    const reporterUser: UserProfile = currentUser || users[0] || {
      id: 'default-user',
      name: 'Team Member',
      nickname: 'member',
      email: 'member@nuts.internal',
      role: 'Member',
      department: 'Engineering',
    };

    const newIssue: Issue = {
      id: `iss-${Date.now()}`,
      orgId: currentUser?.orgId,
      number: newNum,
      code: `${dept.code}-${newNum}`,
      title: data.title,
      description: data.description,
      departmentId: dept.id,
      priority: data.priority,
      status: assignee ? 'ASSIGNED' : 'NEW',
      customAttributes: customAttrs,
      issueType: (customAttrs.issueType as IssueType) || data.issueType || 'Bug',
      environment: (customAttrs.environment as Environment) || data.environment,
      devScope: data.devScope,
      marketingChannel: (customAttrs.marketingChannel as MarketingChannel) || data.marketingChannel,
      deliverableType: (customAttrs.deliverableType as DeliverableType) || data.deliverableType,
      dealSegment: (customAttrs.dealSegment as DealSegment) || data.dealSegment,
      dealStage: (customAttrs.dealStage as DealStage) || data.dealStage,
      opsCategory: (customAttrs.opsCategory as OpsCategory) || data.opsCategory,
      impactLevel: (customAttrs.impactLevel as ImpactLevel) || data.impactLevel,
      assignee,
      reporter: reporterUser,
      createdAt: now,
      updatedAt: now,
      comments: [],
      history: [
        {
          id: `h-${Date.now()}-created`,
          actor: reporterUser,
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

    if (!isDemoMode && isNeonConfigured()) {
      createIssueInNeon(
        {
          title: data.title,
          description: data.description,
          departmentId: dept.id,
          priority: data.priority,
          customAttributes: customAttrs,
          issueType: (customAttrs.issueType as IssueType) || data.issueType,
          environment: (customAttrs.environment as Environment) || data.environment,
          devScope: data.devScope,
          assigneeId: data.assigneeId,
        },
        reporterUser,
        currentUser?.orgId
      ).then((neonIssue) => {
        if (neonIssue) {
          setIssues((prev) =>
            prev.map((i) =>
              i.id === newIssue.id
                ? {
                    ...i,
                    id: neonIssue.id,
                    code: neonIssue.code,
                    number: neonIssue.number,
                  }
                : i
            )
          );
          setSelectedIssue((curr) =>
            curr && curr.id === newIssue.id
              ? {
                  ...curr,
                  id: neonIssue.id,
                  code: neonIssue.code,
                  number: neonIssue.number,
                }
              : curr
          );
        }
      });
    }

    return newIssue;
  };

  const updateIssue = (id: string, updates: Partial<Issue>) => {
    setIssues((prev) =>
      prev.map((iss) => {
        if (iss.id === id) {
          const now = new Date().toISOString();
          const actorUser: UserProfile = currentUser || users[0] || {
            id: 'default-user',
            name: 'Team Member',
            nickname: 'member',
            email: 'member@nuts.internal',
            role: 'Member',
            department: 'Engineering',
          };
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
                    actor: actorUser,
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
                actor: actorUser,
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

          if (!isDemoMode && isNeonConfigured()) {
            const actorUser = currentUser || users[0];
            if (actorUser) {
              updateIssueInNeon(id, updates, actorUser, currentUser?.orgId);
            }
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

    const actorUser = currentUser || users[0] || {
      id: 'default-user',
      name: 'Team Member',
      nickname: 'member',
      email: 'member@nuts.internal',
      role: 'Member',
      department: 'Engineering',
    };

    if (newStatus && newStatus !== current.status) {
      statusChangeText = `Status changed from ${current.status} to ${newStatus}`;
      newHistoryEntries.push({
        id: `h-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        actor: actorUser,
        field: 'Status',
        oldValue: current.status,
        newValue: newStatus,
        message: statusChangeText,
        createdAt: now,
      });
    }

    const newComment = {
      id: `c-${Date.now()}`,
      author: actorUser,
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

    if (!isDemoMode && isNeonConfigured()) {
      addCommentInNeon(issueId, text, actorUser, newStatus);
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

    if (!isDemoMode && isNeonConfigured()) {
      const target = issues.find((i) => i.id === issueId);
      if (target) {
        const actor = currentUser || users[0];
        if (actor) {
          updateIssueInNeon(issueId, { starred: !target.starred }, actor, currentUser?.orgId);
        }
      }
    }
  };

  const deleteIssue = (issueId: string) => {
    setIssues((prev) => prev.filter((i) => i.id !== issueId));
    if (selectedIssue?.id === issueId) {
      setSelectedIssue(null);
    }

    if (!isDemoMode && isNeonConfigured()) {
      deleteIssueInNeon(issueId);
    }
  };

  const addDepartment = (
    name: string,
    code: string,
    description?: string,
    customFields?: CustomFieldDefinition[]
  ): Department => {
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'dept';
    const id = currentUser?.orgId
      ? `${baseSlug}-${currentUser.orgId.substring(0, 8)}`
      : `${baseSlug}-${Date.now().toString(36)}`;

    const newDept: Department = {
      id,
      orgId: currentUser?.orgId,
      name,
      code: code.toUpperCase(),
      description: description || '',
      customFields: customFields || [],
    };
    setDepartments((prev) => [...prev, newDept]);

    if (!isDemoMode && isNeonConfigured()) {
      saveDepartmentInNeon(newDept, currentUser?.orgId);
    }

    return newDept;
  };

  const updateDepartment = (deptId: string, updates: Partial<Department>) => {
    let updatedTarget: Department | null = null;
    setDepartments((prev) =>
      prev.map((d) => {
        if (d.id === deptId) {
          updatedTarget = { ...d, ...updates };
          return updatedTarget;
        }
        return d;
      })
    );

    if (!isDemoMode && isNeonConfigured() && updatedTarget) {
      saveDepartmentInNeon(updatedTarget, currentUser?.orgId);
    }

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

    if (!isDemoMode && isNeonConfigured()) {
      deleteDepartmentInNeon(deptId);
    }
  };

  // Filtered Issues computation
  const filteredIssues = useMemo(() => {
    if (!currentUser) return [];
    const userDeptId = getUserDepartmentId(currentUser, departments);

    return issues.filter((issue) => {
      // Nav View Filter
      if (navView === 'assigned_to_me') {
        // "and the assigned to me shows all the opened issues in the department that the current uses is on and the tickets assigned to that specific user"
        const isAssigned =
          issue.assignee?.id === currentUser.id ||
          (!!currentUser.email && issue.assignee?.email?.toLowerCase() === currentUser.email.toLowerCase());
        if (!isAssigned) return false;
        if (issue.status === 'FIXED' || issue.status === 'CLOSED') return false;

        if (selectedDepartment === 'all') {
          if (userDeptId && issue.departmentId !== userDeptId) return false;
        } else {
          if (issue.departmentId !== selectedDepartment) return false;
        }
      } else if (navView === 'open') {
        // "Opened issues will show all the opened issues in the department I am assigned to."
        if (issue.status === 'FIXED' || issue.status === 'CLOSED') return false;

        if (selectedDepartment === 'all') {
          if (userDeptId && issue.departmentId !== userDeptId) return false;
        } else {
          if (issue.departmentId !== selectedDepartment) return false;
        }
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
    if (!currentUser) {
      return {
        open: 0,
        assignedToMe: 0,
        reportedByMe: 0,
        starred: 0,
        closed: 0,
      };
    }
    const userDeptId = getUserDepartmentId(currentUser, departments);

    // "Opened issues will show all the opened issues in the department I am assigned to."
    const openInUserDept = issues.filter(
      (i) =>
        (userDeptId ? i.departmentId === userDeptId : true) &&
        i.status !== 'FIXED' &&
        i.status !== 'CLOSED'
    ).length;

    // "and the assigned to me shows all the opened issues in the department that the current uses is on and the tickets assigned to that specific user"
    const assignedToMe = issues.filter(
      (i) =>
        (userDeptId ? i.departmentId === userDeptId : true) &&
        (i.assignee?.id === currentUser.id ||
          (!!currentUser.email && i.assignee?.email?.toLowerCase() === currentUser.email.toLowerCase())) &&
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
        logout,
        isDemoMode,
        enterDemoMode,
        exitDemoMode,
        isNeonConnected,
        isLoadingDatabase,
        reloadFromDatabase,
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
