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
} from '../types';
import { INITIAL_DEPARTMENTS, INITIAL_ISSUES, USERS } from '../data/mockData';

interface IssueContextType {
  issues: Issue[];
  departments: Department[];
  users: UserProfile[];
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  updateUserProfile: (userId: string, updates: Partial<UserProfile>) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
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
  addDepartment: (name: string, code: string) => Department;
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

const STORAGE_KEY = 'nuts_issues_v6';
const STORAGE_DEPTS = 'nuts_depts_v6';
const STORAGE_USERS = 'nuts_users_v6';
const STORAGE_CURRENT_USER = 'nuts_current_user_v6';

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

    const isEng = dept.id === 'engineering' || dept.id === 'product';
    const now = new Date().toISOString();

    const newIssue: Issue = {
      id: `iss-${Date.now()}`,
      number: newNum,
      code: `${dept.code}-${newNum}`,
      title: data.title,
      description: data.description,
      departmentId: dept.id,
      priority: data.priority,
      status: assignee ? 'ASSIGNED' : 'NEW',
      environment: isEng ? (data.environment || 'LOCAL') : undefined,
      devScope: isEng ? data.devScope : undefined,
      marketingChannel: dept.id === 'marketing' ? data.marketingChannel : undefined,
      deliverableType: dept.id === 'marketing' ? data.deliverableType : undefined,
      dealSegment: dept.id === 'sales' ? data.dealSegment : undefined,
      dealStage: dept.id === 'sales' ? data.dealStage : undefined,
      opsCategory: dept.id === 'operations' ? data.opsCategory : undefined,
      impactLevel: dept.id === 'operations' ? data.impactLevel : undefined,
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
              key === 'starred'
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

          const updated: Issue = {
            ...iss,
            ...updates,
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

  const addDepartment = (name: string, code: string): Department => {
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newDept: Department = { id, name, code: code.toUpperCase() };
    setDepartments((prev) => [...prev, newDept]);
    return newDept;
  };

  // Filtered Issues computation
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // Department
      if (selectedDepartment !== 'all' && issue.departmentId !== selectedDepartment) {
        return false;
      }

      // Nav View
      if (navView === 'open') {
        if (issue.status === 'FIXED' || issue.status === 'CLOSED') return false;
      } else if (navView === 'assigned_to_me') {
        if (issue.assignee?.id !== currentUser.id) return false;
        if (issue.status === 'FIXED' || issue.status === 'CLOSED') return false;
      } else if (navView === 'reported_by_me') {
        if (issue.reporter.id !== currentUser.id) return false;
      } else if (navView === 'starred') {
        if (!issue.starred) return false;
      } else if (navView === 'closed') {
        if (issue.status !== 'FIXED' && issue.status !== 'CLOSED') return false;
      }

      // Priority Filter
      if (priorityFilter !== 'ALL' && issue.priority !== priorityFilter) {
        return false;
      }

      // Department-specific SubFilter
      if (subFilter !== 'ALL') {
        const matches =
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

        if (
          !matchesCode &&
          !matchesNum &&
          !matchesTitle &&
          !matchesDesc &&
          !matchesAssignee &&
          !matchesReporter &&
          !matchesDeptTag
        ) {
          return false;
        }
      }

      return true;
    });
  }, [issues, selectedDepartment, navView, priorityFilter, subFilter, searchQuery, currentUser]);

  const counts = useMemo(() => {
    const deptIssues = selectedDepartment === 'all'
      ? issues
      : issues.filter((i) => i.departmentId === selectedDepartment);

    return {
      open: deptIssues.filter((i) => i.status !== 'FIXED' && i.status !== 'CLOSED').length,
      assignedToMe: deptIssues.filter(
        (i) => i.assignee?.id === currentUser.id && i.status !== 'FIXED' && i.status !== 'CLOSED'
      ).length,
      reportedByMe: deptIssues.filter((i) => i.reporter.id === currentUser.id).length,
      starred: deptIssues.filter((i) => i.starred).length,
      closed: deptIssues.filter((i) => i.status === 'FIXED' || i.status === 'CLOSED').length,
    };
  }, [issues, selectedDepartment, currentUser]);

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
