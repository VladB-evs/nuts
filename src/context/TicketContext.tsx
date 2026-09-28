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
} from '../types';
import { INITIAL_DEPARTMENTS, INITIAL_ISSUES, USERS } from '../data/mockData';

interface IssueContextType {
  issues: Issue[];
  departments: Department[];
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
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

const STORAGE_KEY = 'nuts_issues_v4';
const STORAGE_DEPTS = 'nuts_depts_v4';

export const IssueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [departments, setDepartments] = useState<Department[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DEPTS);
      return saved ? JSON.parse(saved) : INITIAL_DEPARTMENTS;
    } catch {
      return INITIAL_DEPARTMENTS;
    }
  });

  const [issues, setIssues] = useState<Issue[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_ISSUES;
    } catch {
      return INITIAL_ISSUES;
    }
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(USERS[1]); // Alex Rivera
  const [selectedDepartment, setSelectedDepartmentState] = useState<string>('all');
  const [navView, setNavView] = useState<NavView>('open');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [subFilter, setSubFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
    const assignee = USERS.find((u) => u.id === data.assigneeId) || null;

    const isEng = dept.id === 'engineering' || dept.id === 'product';

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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
    };

    setIssues((prev) => [newIssue, ...prev]);
    setSelectedIssue(newIssue);
    return newIssue;
  };

  const updateIssue = (id: string, updates: Partial<Issue>) => {
    setIssues((prev) =>
      prev.map((iss) => {
        if (iss.id === id) {
          const updated = {
            ...iss,
            ...updates,
            updatedAt: new Date().toISOString(),
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

    let statusChangeText: string | undefined = undefined;
    if (newStatus && newStatus !== current.status) {
      statusChangeText = `Status changed from ${current.status} to ${newStatus}`;
    }

    const newComment = {
      id: `c-${Date.now()}`,
      author: currentUser,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      statusChange: statusChangeText,
    };

    const updatedIssue: Issue = {
      ...current,
      status: newStatus || current.status,
      comments: text.trim() || statusChangeText ? [...current.comments, newComment] : current.comments,
      updatedAt: new Date().toISOString(),
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
        const matchesAssignee = issue.assignee?.name.toLowerCase().includes(q);
        const matchesReporter = issue.reporter.name.toLowerCase().includes(q);
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
        currentUser,
        setCurrentUser,
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
