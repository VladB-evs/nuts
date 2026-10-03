import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
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
  Comment,
  CustomFieldDefinition,
  LinkRelationType,
  IssueLink,
  INVERSE_RELATIONS,
  RELATION_CONFIG,
  ToastNotification,
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
  activeTab: 'table' | 'timeline' | 'admin';
  setActiveTab: (tab: 'table' | 'timeline' | 'admin') => void;
  setUserEmploymentStatus: (
    userId: string,
    status: 'active' | 'departed',
    departureReason?: string
  ) => void;
  setUserAdminRole: (userId: string, isAdmin: boolean) => boolean;
  addTeamMember: (data: {
    name: string;
    email: string;
    department: string;
    role?: string;
    nickname?: string;
    isAdmin?: boolean;
  }) => UserProfile;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Toast notifications
  toasts: ToastNotification[];
  showToast: (toast: Omit<ToastNotification, 'id'>) => void;
  dismissToast: (id: string) => void;

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
    linkedIssues?: IssueLink[];
  }) => Issue;
  updateIssue: (id: string, updates: Partial<Issue>) => void;
  linkIssues: (sourceIssueId: string, targetIssueId: string, relation?: LinkRelationType) => void;
  unlinkIssues: (sourceIssueId: string, targetIssueId: string) => void;
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
    linkedIssues: 'Linked Tickets',
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
        const u = JSON.parse(saved);
        if (u.id === 'u1' && !u.isAdmin) {
          u.isAdmin = true;
        }
        return u;
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
      try {
        const saved = localStorage.getItem(STORAGE_USERS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const hasAdmin = parsed.some((u: UserProfile) => u.isAdmin);
            if (!hasAdmin) {
              parsed[0].isAdmin = true;
            }
            return parsed;
          }
        }
      } catch {}
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

  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const showToast = useCallback((toast: Omit<ToastNotification, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

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
    setCurrentUserState(USERS[0]); // Liam Vance (Workspace Admin)
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
  const [activeTab, setActiveTab] = useState<'table' | 'timeline' | 'admin'>('table');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    linkedIssues?: IssueLink[];
  }): Issue => {
    const dept =
      departments.find((d) => d.id === data.departmentId) ||
      departments[0] ||
      { id: 'engineering', name: 'Engineering', code: 'DEV' };
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

    const initialLinkedIssues: IssueLink[] = data.linkedIssues || [];
    if (initialLinkedIssues.length > 0) {
      customAttrs.linkedIssues = initialLinkedIssues;
    }

    const isDuplicate = initialLinkedIssues.some((l) => l.relation === 'duplicate');
    const initialStatus: Status = isDuplicate ? 'CLOSED' : assignee ? 'ASSIGNED' : 'NEW';
    const initialComments: Comment[] = [];

    const newIssue: Issue = {
      id: `iss-${Date.now()}`,
      orgId: currentUser?.orgId,
      number: newNum,
      code: `${dept.code}-${newNum}`,
      title: data.title,
      description: data.description,
      departmentId: dept.id,
      priority: data.priority,
      status: initialStatus,
      customAttributes: customAttrs,
      linkedIssues: initialLinkedIssues,
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
      comments: initialComments,
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
        ...(isDuplicate
          ? [
              {
                id: `h-${Date.now()}-dup-stat`,
                actor: reporterUser,
                field: 'Status',
                oldValue: assignee ? 'ASSIGNED' : 'NEW',
                newValue: 'CLOSED',
                message: 'Closed as duplicate ticket',
                createdAt: now,
              },
            ]
          : []),
      ],
    };

    setIssues((prev) => {
      if (initialLinkedIssues.length === 0) {
        return [newIssue, ...prev];
      }

      const targetLinkMap = new Map<string, LinkRelationType>();
      initialLinkedIssues.forEach((l) => {
        targetLinkMap.set(l.issueId, INVERSE_RELATIONS[l.relation] || 'relates_to');
      });

      const updatedPrev = prev.map((item) => {
        if (targetLinkMap.has(item.id)) {
          const inverseRel = targetLinkMap.get(item.id)!;
          const nextTargetLinks: IssueLink[] = [
            ...(item.linkedIssues || []).filter((l) => l.issueId !== newIssue.id),
            { issueId: newIssue.id, relation: inverseRel, createdAt: now },
          ];
          const histEntry: HistoryEntry = {
            id: `h-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            actor: reporterUser,
            field: 'Linked Issue',
            oldValue: '',
            newValue: `${newIssue.code} (${RELATION_CONFIG[inverseRel]?.label || inverseRel})`,
            message: `Linked from new issue ${newIssue.code} (${RELATION_CONFIG[inverseRel]?.label || inverseRel})`,
            createdAt: now,
          };

          const updatedItem: Issue = {
            ...item,
            linkedIssues: nextTargetLinks,
            customAttributes: {
              ...(item.customAttributes || {}),
              linkedIssues: nextTargetLinks,
            },
            history: [...(item.history || []), histEntry],
            updatedAt: now,
          };

          if (!isDemoMode && isNeonConfigured()) {
            updateIssueInNeon(
              item.id,
              { customAttributes: updatedItem.customAttributes },
              reporterUser,
              currentUser?.orgId
            );
          }

          return updatedItem;
        }
        return item;
      });

      return [newIssue, ...updatedPrev];
    });
    setSelectedIssue(newIssue);

    showToast({
      type: 'success',
      title: 'Issue Created',
      message: `Created issue ${newIssue.code} in ${dept.name}.`,
    });

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
            prev.map((i) => {
              if (i.id === newIssue.id) {
                return {
                  ...i,
                  id: neonIssue.id,
                  code: neonIssue.code,
                  number: neonIssue.number,
                };
              }
              // If target had link to temporary id, update it to neonIssue.id
              if (i.linkedIssues && i.linkedIssues.some((l) => l.issueId === newIssue.id)) {
                const fixedLinks = i.linkedIssues.map((l) =>
                  l.issueId === newIssue.id ? { ...l, issueId: neonIssue.id } : l
                );
                return {
                  ...i,
                  linkedIssues: fixedLinks,
                  customAttributes: {
                    ...(i.customAttributes || {}),
                    linkedIssues: fixedLinks,
                  },
                };
              }
              return i;
            })
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
      }).catch((err) => {
        console.error('Failed to create issue in Neon:', err);
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
              if (attrKey === 'linkedIssues') return;
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
              key === 'customAttributes' ||
              key === 'linkedIssues'
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

  const linkIssues = (
    sourceIssueId: string,
    targetIssueId: string,
    relation: LinkRelationType = 'relates_to'
  ) => {
    if (!sourceIssueId || !targetIssueId || sourceIssueId === targetIssueId) return;

    const now = new Date().toISOString();
    const actorUser: UserProfile = currentUser || users[0] || {
      id: 'default-user',
      name: 'Team Member',
      nickname: 'member',
      email: 'member@nuts.internal',
      role: 'Member',
      department: 'Engineering',
    };

    const inverseRelation = INVERSE_RELATIONS[relation] || 'relates_to';

    const sourceIssueObj = issues.find((i) => i.id === sourceIssueId);
    const targetIssueObj = issues.find((i) => i.id === targetIssueId);
    if (!sourceIssueObj || !targetIssueObj) return;

    const isDuplicate = relation === 'duplicate';
    const sourceShouldClose = isDuplicate && sourceIssueObj.status !== 'CLOSED';

    const sourceAutoCloseComment: Comment | null = sourceShouldClose
      ? {
          id: `c-${Date.now()}-dup-${sourceIssueId}`,
          author: actorUser,
          text: `Closed as duplicate of #${targetIssueObj.code} (${targetIssueObj.title}).`,
          createdAt: now,
          statusChange: `Status changed from ${sourceIssueObj.status} to CLOSED`,
        }
      : null;

    const sourceStatusHistory: HistoryEntry | null = sourceShouldClose
      ? {
          id: `h-${Date.now()}-dup-stat-${sourceIssueId}`,
          actor: actorUser,
          field: 'Status',
          oldValue: sourceIssueObj.status,
          newValue: 'CLOSED',
          message: `Closed as duplicate of ${targetIssueObj.code}`,
          createdAt: now,
        }
      : null;

    setIssues((prev) => {
      const sourceIssue = prev.find((i) => i.id === sourceIssueId);
      const targetIssue = prev.find((i) => i.id === targetIssueId);
      if (!sourceIssue || !targetIssue) return prev;

      // Check if already linked with the exact same relation
      const existingSourceLink = sourceIssue.linkedIssues?.find((l) => l.issueId === targetIssueId);
      if (existingSourceLink && existingSourceLink.relation === relation) {
        return prev;
      }

      const sourceLinks: IssueLink[] = [
        ...(sourceIssue.linkedIssues || []).filter((l) => l.issueId !== targetIssueId),
        { issueId: targetIssueId, relation, createdAt: now },
      ];

      const targetLinks: IssueLink[] = [
        ...(targetIssue.linkedIssues || []).filter((l) => l.issueId !== sourceIssueId),
        { issueId: sourceIssueId, relation: inverseRelation, createdAt: now },
      ];

      const sourceHistory: HistoryEntry = {
        id: `h-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        actor: actorUser,
        field: 'Linked Issue',
        oldValue: existingSourceLink
          ? `${targetIssue.code} (${RELATION_CONFIG[existingSourceLink.relation]?.label || existingSourceLink.relation})`
          : '',
        newValue: `${targetIssue.code} (${RELATION_CONFIG[relation]?.label || relation})`,
        message: existingSourceLink
          ? `Changed relationship with ${targetIssue.code} to "${RELATION_CONFIG[relation]?.label || relation}"`
          : `Linked ticket ${targetIssue.code} (${RELATION_CONFIG[relation]?.label || relation})`,
        createdAt: now,
      };

      const targetHistory: HistoryEntry = {
        id: `h-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        actor: actorUser,
        field: 'Linked Issue',
        oldValue: '',
        newValue: `${sourceIssue.code} (${RELATION_CONFIG[inverseRelation]?.label || inverseRelation})`,
        message: `Linked from ${sourceIssue.code} (${RELATION_CONFIG[inverseRelation]?.label || inverseRelation})`,
        createdAt: now,
      };

      const updatedIssues = prev.map((iss) => {
        if (iss.id === sourceIssueId) {
          return {
            ...iss,
            status: sourceShouldClose ? 'CLOSED' : iss.status,
            linkedIssues: sourceLinks,
            customAttributes: {
              ...(iss.customAttributes || {}),
              linkedIssues: sourceLinks,
            },
            comments: sourceAutoCloseComment
              ? [...(iss.comments || []), sourceAutoCloseComment]
              : iss.comments,
            history: [
              ...(iss.history || []),
              sourceHistory,
              ...(sourceStatusHistory ? [sourceStatusHistory] : []),
            ],
            updatedAt: now,
          };
        }
        if (iss.id === targetIssueId) {
          return {
            ...iss,
            linkedIssues: targetLinks,
            customAttributes: {
              ...(iss.customAttributes || {}),
              linkedIssues: targetLinks,
            },
            history: [...(iss.history || []), targetHistory],
            updatedAt: now,
          };
        }
        return iss;
      });

      // Synchronize selectedIssue if it is source or target
      if (selectedIssue?.id === sourceIssueId) {
        const updatedSource = updatedIssues.find((i) => i.id === sourceIssueId);
        if (updatedSource) setSelectedIssue(updatedSource);
      } else if (selectedIssue?.id === targetIssueId) {
        const updatedTarget = updatedIssues.find((i) => i.id === targetIssueId);
        if (updatedTarget) setSelectedIssue(updatedTarget);
      }

      if (!isDemoMode && isNeonConfigured()) {
        const s = updatedIssues.find((i) => i.id === sourceIssueId);
        const t = updatedIssues.find((i) => i.id === targetIssueId);
        if (s) {
          updateIssueInNeon(
            sourceIssueId,
            { status: s.status, customAttributes: s.customAttributes },
            actorUser,
            currentUser?.orgId
          );
          if (sourceAutoCloseComment) {
            addCommentInNeon(sourceIssueId, sourceAutoCloseComment.text, actorUser, 'CLOSED');
          }
        }
        if (t) {
          updateIssueInNeon(
            targetIssueId,
            { customAttributes: t.customAttributes },
            actorUser,
            currentUser?.orgId
          );
        }
      }

      return updatedIssues;
    });

    if (sourceShouldClose) {
      showToast({
        type: 'info',
        title: 'Ticket Closed as Duplicate',
        message: `${sourceIssueObj.code} was closed as duplicate of ${targetIssueObj.code}.`,
        action: {
          label: 'Reopen Ticket',
          onClick: () => updateIssue(sourceIssueId, { status: 'ASSIGNED' }),
        },
      });
    } else {
      showToast({
        type: 'info',
        title: 'Tickets Linked',
        message: `Linked ${sourceIssueObj.code} to ${targetIssueObj.code} (${RELATION_CONFIG[relation]?.label || relation}).`,
      });
    }
  };

  const unlinkIssues = (sourceIssueId: string, targetIssueId: string) => {
    if (!sourceIssueId || !targetIssueId) return;

    const now = new Date().toISOString();
    const actorUser: UserProfile = currentUser || users[0] || {
      id: 'default-user',
      name: 'Team Member',
      nickname: 'member',
      email: 'member@nuts.internal',
      role: 'Member',
      department: 'Engineering',
    };

    const sourceIssueObj = issues.find((i) => i.id === sourceIssueId);
    const targetIssueObj = issues.find((i) => i.id === targetIssueId);

    const wasDuplicate = (sourceIssueObj?.linkedIssues || []).some(
      (l) => l.issueId === targetIssueId && l.relation === 'duplicate'
    );

    setIssues((prev) => {
      const sourceIssue = prev.find((i) => i.id === sourceIssueId);
      const targetIssue = prev.find((i) => i.id === targetIssueId);
      if (!sourceIssue) return prev;

      const sourceLinks = (sourceIssue.linkedIssues || []).filter((l) => l.issueId !== targetIssueId);
      const targetLinks = targetIssue
        ? (targetIssue.linkedIssues || []).filter((l) => l.issueId !== sourceIssueId)
        : [];

      const sourceHistory: HistoryEntry = {
        id: `h-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        actor: actorUser,
        field: 'Linked Issue',
        oldValue: targetIssue ? targetIssue.code : targetIssueId,
        newValue: 'Unlinked',
        message: `Removed link to ticket ${targetIssue ? targetIssue.code : targetIssueId}`,
        createdAt: now,
      };

      const targetHistory: HistoryEntry | null = targetIssue
        ? {
            id: `h-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            actor: actorUser,
            field: 'Linked Issue',
            oldValue: sourceIssue.code,
            newValue: 'Unlinked',
            message: `Removed link from ticket ${sourceIssue.code}`,
            createdAt: now,
          }
        : null;

      const updatedIssues = prev.map((iss) => {
        if (iss.id === sourceIssueId) {
          return {
            ...iss,
            linkedIssues: sourceLinks,
            customAttributes: {
              ...(iss.customAttributes || {}),
              linkedIssues: sourceLinks,
            },
            history: [...(iss.history || []), sourceHistory],
            updatedAt: now,
          };
        }
        if (iss.id === targetIssueId && targetIssue && targetHistory) {
          return {
            ...iss,
            linkedIssues: targetLinks,
            customAttributes: {
              ...(iss.customAttributes || {}),
              linkedIssues: targetLinks,
            },
            history: [...(iss.history || []), targetHistory],
            updatedAt: now,
          };
        }
        return iss;
      });

      if (selectedIssue?.id === sourceIssueId) {
        const updatedSource = updatedIssues.find((i) => i.id === sourceIssueId);
        if (updatedSource) setSelectedIssue(updatedSource);
      } else if (selectedIssue?.id === targetIssueId) {
        const updatedTarget = updatedIssues.find((i) => i.id === targetIssueId);
        if (updatedTarget) setSelectedIssue(updatedTarget);
      }

      if (!isDemoMode && isNeonConfigured()) {
        const s = updatedIssues.find((i) => i.id === sourceIssueId);
        const t = updatedIssues.find((i) => i.id === targetIssueId);
        if (s) {
          updateIssueInNeon(sourceIssueId, { customAttributes: s.customAttributes }, actorUser, currentUser?.orgId);
        }
        if (t) {
          updateIssueInNeon(targetIssueId, { customAttributes: t.customAttributes }, actorUser, currentUser?.orgId);
        }
      }

      return updatedIssues;
    });

    showToast({
      type: 'info',
      title: 'Ticket Unlinked',
      message: `Removed link between ${sourceIssueObj ? sourceIssueObj.code : 'ticket'} and ${targetIssueObj ? targetIssueObj.code : targetIssueId}.`,
      action:
        wasDuplicate && sourceIssueObj && sourceIssueObj.status === 'CLOSED'
          ? {
              label: 'Reopen Ticket',
              onClick: () => updateIssue(sourceIssueId, { status: 'ASSIGNED' }),
            }
          : undefined,
    });
  };

  const deleteIssue = (issueId: string) => {
    setIssues((prev) =>
      prev
        .filter((i) => i.id !== issueId)
        .map((iss) => {
          if (iss.linkedIssues && iss.linkedIssues.some((l) => l.issueId === issueId)) {
            const nextLinks = iss.linkedIssues.filter((l) => l.issueId !== issueId);
            return {
              ...iss,
              linkedIssues: nextLinks,
              customAttributes: {
                ...(iss.customAttributes || {}),
                linkedIssues: nextLinks,
              },
            };
          }
          return iss;
        })
    );
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
    if (!currentUser?.isAdmin) {
      showToast({
        type: 'error',
        title: 'Action Restricted',
        message: 'Only workspace administrators have permission to create departments.',
      });
      throw new Error('Only workspace administrators have permission to create departments.');
    }

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
    if (!currentUser?.isAdmin) {
      showToast({
        type: 'error',
        title: 'Action Restricted',
        message: 'Only workspace administrators have permission to delete departments.',
      });
      return;
    }

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

  const setUserEmploymentStatus = (
    userId: string,
    status: 'active' | 'departed',
    departureReason?: string
  ) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    // Safety: Cannot offboard the last active admin
    if (status === 'departed' && targetUser.isAdmin) {
      const remainingActiveAdmins = users.filter(
        (u) => u.id !== userId && u.isAdmin && u.status !== 'departed'
      );
      if (remainingActiveAdmins.length === 0) {
        showToast({
          type: 'error',
          title: 'Action Restricted',
          message: 'Cannot offboard the only remaining active administrator. Please assign another admin first.',
        });
        return;
      }
    }

    const now = new Date().toISOString();
    const updates: Partial<UserProfile> = {
      status,
      departureReason: status === 'departed' ? departureReason || 'Transitioned' : undefined,
      departedAt: status === 'departed' ? now : undefined,
    };

    updateUserProfile(userId, updates);

    showToast({
      type: status === 'departed' ? 'info' : 'success',
      title: status === 'departed' ? 'Team Member Offboarded' : 'Account Reactivated',
      message:
        status === 'departed'
          ? `${targetUser.name}'s account has been deactivated respectfully. Historical ticket contributions remain intact.`
          : `${targetUser.name}'s account has been reactivated successfully.`,
    });
  };

  const setUserAdminRole = (userId: string, isAdmin: boolean): boolean => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return false;

    // Safety check: Cannot revoke admin from the last active admin
    if (!isAdmin && targetUser.isAdmin) {
      const otherActiveAdmins = users.filter(
        (u) => u.id !== userId && u.isAdmin && u.status !== 'departed'
      );
      if (otherActiveAdmins.length === 0) {
        showToast({
          type: 'error',
          title: 'Action Restricted',
          message: 'At least one active administrator is required in the workspace.',
        });
        return false;
      }
    }

    updateUserProfile(userId, { isAdmin });

    showToast({
      type: 'success',
      title: isAdmin ? 'Admin Privileges Granted' : 'Admin Privileges Revoked',
      message: isAdmin
        ? `${targetUser.name} is now a Workspace Administrator.`
        : `${targetUser.name} is now a standard Team Member.`,
    });
    return true;
  };

  const addTeamMember = (data: {
    name: string;
    email: string;
    department: string;
    role?: string;
    nickname?: string;
    isAdmin?: boolean;
  }): UserProfile => {
    const newId = `u_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const avatarList = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
    ];
    const randomAvatar = avatarList[Math.floor(Math.random() * avatarList.length)];

    const newMember: UserProfile = {
      id: newId,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      nickname: data.nickname?.trim() || data.name.trim().toLowerCase().replace(/\s+/g, '_'),
      department: data.department || 'Engineering',
      role: data.role?.trim() || 'Team Member',
      isAdmin: Boolean(data.isAdmin),
      status: 'active',
      avatarUrl: randomAvatar,
      orgId: currentUser?.orgId,
      organization: currentUser?.organization,
    };

    setUsers((prev) => {
      const next = [...prev, newMember];
      localStorage.setItem(STORAGE_USERS, JSON.stringify(next));
      return next;
    });

    showToast({
      type: 'success',
      title: 'Team Member Added',
      message: `${newMember.name} has been added to ${newMember.department}.`,
    });

    return newMember;
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
        const matchesCode = String(issue.code || '').toLowerCase().includes(q);
        const matchesNum = String(issue.number ?? '').includes(q);
        const matchesTitle = String(issue.title || '').toLowerCase().includes(q);
        const matchesDesc = String(issue.description || '').toLowerCase().includes(q);
        const matchesAssignee =
          issue.assignee?.name?.toLowerCase().includes(q) ||
          issue.assignee?.nickname?.toLowerCase().includes(q) ||
          issue.assignee?.role?.toLowerCase().includes(q);
        const matchesReporter =
          issue.reporter?.name?.toLowerCase().includes(q) ||
          issue.reporter?.nickname?.toLowerCase().includes(q) ||
          issue.reporter?.role?.toLowerCase().includes(q);
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
        activeTab,
        setActiveTab,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        isCreateModalOpen,
        setIsCreateModalOpen,
        toasts,
        showToast,
        dismissToast,
        createIssue,
        updateIssue,
        linkIssues,
        unlinkIssues,
        addComment,
        toggleStar,
        deleteIssue,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        setUserEmploymentStatus,
        setUserAdminRole,
        addTeamMember,
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
