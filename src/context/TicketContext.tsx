import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Ticket,
  Department,
  UserProfile,
  TicketStatus,
  ViewMode,
  FilterState,
  QueueId,
  ResolutionReason,
} from '../types';
import {
  INITIAL_DEPARTMENTS,
  INITIAL_TICKETS,
  INITIAL_USERS,
} from '../data/mockData';

interface TicketContextType {
  tickets: Ticket[];
  departments: Department[];
  users: UserProfile[];
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  selectedDepartment: string;
  setSelectedDepartment: (id: string) => void;
  activeQueue: QueueId;
  setActiveQueue: (queue: QueueId) => void;
  activeView: ViewMode;
  setActiveView: (view: ViewMode) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  selectedTicket: Ticket | null;
  setSelectedTicket: (ticket: Ticket | null) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;

  // Ticket Operations
  createTicket: (ticketData: Partial<Ticket>) => Ticket;
  updateTicket: (id: string, updates: Partial<Ticket>) => void;
  deleteTicket: (id: string) => void;
  changeStatus: (id: string, newStatus: TicketStatus) => void;
  assignTicketToMe: (id: string) => void;
  assignTicket: (id: string, user: UserProfile | null) => void;
  transferDepartment: (id: string, targetDeptId: string, transferNote?: string) => void;
  resolveTicket: (id: string, reason: ResolutionReason, notes?: string) => void;
  addComment: (ticketId: string, content: string, isInternal?: boolean) => void;
  toggleChecklistItem: (ticketId: string, itemId: string) => void;
  addChecklistItem: (ticketId: string, text: string) => void;
  deleteChecklistItem: (ticketId: string, itemId: string) => void;
  addDepartment: (department: Omit<Department, 'id'>) => Department;
  resetToDefaultData: () => void;

  // Computed
  filteredTickets: Ticket[];
  queueCounts: Record<QueueId, number>;
  metrics: {
    total: number;
    open: number;
    inProgress: number;
    pending: number;
    resolved: number;
    slaBreached: number;
    slaComplianceRate: number;
    byDepartment: { [deptId: string]: number };
  };
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_TICKETS = 'nuts_tickets_store_v2';
const LOCAL_STORAGE_KEY_DEPTS = 'nuts_departments_store_v2';
const LOCAL_STORAGE_KEY_THEME = 'nuts_theme_preference_v2';

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_THEME);
    if (saved !== null) return saved === 'dark';
    return true; // Default to dark mode
  });

  const [departments, setDepartments] = useState<Department[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_DEPTS);
      return saved ? JSON.parse(saved) : INITIAL_DEPARTMENTS;
    } catch {
      return INITIAL_DEPARTMENTS;
    }
  });

  const [tickets, setTickets] = useState<Ticket[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_TICKETS);
      return saved ? JSON.parse(saved) : INITIAL_TICKETS;
    } catch {
      return INITIAL_TICKETS;
    }
  });

  const [users] = useState<UserProfile[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USERS[1]); // Alex Rivera
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [activeQueue, setActiveQueue] = useState<QueueId>('all_open');
  const [activeView, setActiveView] = useState<ViewMode>('console');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(() => INITIAL_TICKETS[0]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    departmentId: 'all',
    status: 'all',
    priority: 'all',
    assigneeId: 'all',
    type: 'all',
    queue: 'all',
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem(LOCAL_STORAGE_KEY_THEME, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(LOCAL_STORAGE_KEY_THEME, 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_TICKETS, JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_DEPTS, JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setIsCreateModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  const resetFilters = () => {
    setFilters({
      search: '',
      departmentId: 'all',
      status: 'all',
      priority: 'all',
      assigneeId: 'all',
      type: 'all',
      queue: 'all',
    });
  };

  const resetToDefaultData = () => {
    setTickets(INITIAL_TICKETS);
    setDepartments(INITIAL_DEPARTMENTS);
    setSelectedTicket(INITIAL_TICKETS[0]);
    localStorage.removeItem(LOCAL_STORAGE_KEY_TICKETS);
    localStorage.removeItem(LOCAL_STORAGE_KEY_DEPTS);
  };

  const createTicket = (ticketData: Partial<Ticket>): Ticket => {
    const deptId =
      ticketData.departmentId ||
      (selectedDepartment !== 'all' ? selectedDepartment : 'engineering');
    const dept = departments.find((d) => d.id === deptId) || departments[0];

    const departmentTickets = tickets.filter((t) => t.departmentId === dept.id);
    const maxNum = departmentTickets.reduce((max, t) => Math.max(max, t.ticketNumber || 0), 100);
    const newNum = maxNum + 1;
    const ticketCode = `${dept.code}-${newNum}`;

    // Default SLA: 24 hours from now for high, 4h for critical, 48h for medium/low
    const slaOffsetHours =
      ticketData.priority === 'critical'
        ? 4
        : ticketData.priority === 'high'
        ? 24
        : 48;
    const defaultSla = new Date(Date.now() + slaOffsetHours * 60 * 60 * 1000).toISOString();

    const newTicket: Ticket = {
      id: `t-${Date.now()}`,
      ticketNumber: newNum,
      code: ticketCode,
      title: ticketData.title || 'Untitled Ticket',
      description: ticketData.description || '',
      departmentId: dept.id,
      requesterDepartmentId: ticketData.requesterDepartmentId || currentUser.departmentId,
      status: ticketData.status || 'new',
      priority: ticketData.priority || 'medium',
      type: ticketData.type || 'service_request',
      assignee: ticketData.assignee || null,
      reporter: ticketData.reporter || currentUser,
      tags: ticketData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate: ticketData.dueDate,
      slaDeadline: ticketData.slaDeadline || defaultSla,
      estimateHours: ticketData.estimateHours,
      checklist: ticketData.checklist || [],
      comments: ticketData.comments || [],
      activities: [
        {
          id: `act-${Date.now()}`,
          ticketId: `t-${Date.now()}`,
          actor: currentUser,
          action: 'submitted ticket',
          timestamp: new Date().toISOString(),
        },
      ],
      customFields: ticketData.customFields || {},
    };

    setTickets((prev) => [newTicket, ...prev]);
    setSelectedTicket(newTicket);
    return newTicket;
  };

  const updateTicket = (id: string, updates: Partial<Ticket>) => {
    setTickets((prev) =>
      prev.map((ticket) => {
        if (ticket.id === id) {
          const updated = {
            ...ticket,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          if (selectedTicket && selectedTicket.id === id) {
            setSelectedTicket(updated);
          }
          return updated;
        }
        return ticket;
      })
    );
  };

  const deleteTicket = (id: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== id));
    if (selectedTicket?.id === id) {
      setSelectedTicket(null);
    }
  };

  const changeStatus = (id: string, newStatus: TicketStatus) => {
    setTickets((prev) =>
      prev.map((ticket) => {
        if (ticket.id === id) {
          if (newStatus === 'resolved' && ticket.status !== 'resolved') {
            try {
              confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.8 },
                colors: ['#ffffff', '#a1a1aa', '#38bdf8', '#34d399'],
              });
            } catch {
              // ignore
            }
          }

          const updated: Ticket = {
            ...ticket,
            status: newStatus,
            updatedAt: new Date().toISOString(),
            resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : ticket.resolvedAt,
            activities: [
              {
                id: `act-${Date.now()}`,
                ticketId: id,
                actor: currentUser,
                action: `changed status to ${newStatus.replace('_', ' ').toUpperCase()}`,
                timestamp: new Date().toISOString(),
              },
              ...ticket.activities,
            ],
          };

          if (selectedTicket?.id === id) {
            setSelectedTicket(updated);
          }
          return updated;
        }
        return ticket;
      })
    );
  };

  const assignTicketToMe = (id: string) => {
    assignTicket(id, currentUser);
  };

  const assignTicket = (id: string, user: UserProfile | null) => {
    setTickets((prev) =>
      prev.map((ticket) => {
        if (ticket.id === id) {
          const updated: Ticket = {
            ...ticket,
            assignee: user,
            status: ticket.status === 'new' && user ? 'open' : ticket.status,
            updatedAt: new Date().toISOString(),
            activities: [
              {
                id: `act-${Date.now()}`,
                ticketId: id,
                actor: currentUser,
                action: user ? `assigned ticket to ${user.name}` : 'unassigned ticket',
                timestamp: new Date().toISOString(),
              },
              ...ticket.activities,
            ],
          };
          if (selectedTicket?.id === id) {
            setSelectedTicket(updated);
          }
          return updated;
        }
        return ticket;
      })
    );
  };

  const transferDepartment = (id: string, targetDeptId: string, transferNote?: string) => {
    const targetDept = departments.find((d) => d.id === targetDeptId);
    if (!targetDept) return;

    setTickets((prev) =>
      prev.map((ticket) => {
        if (ticket.id === id) {
          const activities = [
            {
              id: `act-${Date.now()}`,
              ticketId: id,
              actor: currentUser,
              action: `transferred ticket to ${targetDept.name}`,
              details: transferNote,
              timestamp: new Date().toISOString(),
            },
            ...ticket.activities,
          ];

          const comments = transferNote
            ? [
                ...ticket.comments,
                {
                  id: `cm-${Date.now()}`,
                  ticketId: id,
                  author: currentUser,
                  content: `[Department Transfer to ${targetDept.name}]: ${transferNote}`,
                  createdAt: new Date().toISOString(),
                  isInternal: true,
                },
              ]
            : ticket.comments;

          const updated: Ticket = {
            ...ticket,
            departmentId: targetDeptId,
            assignee: null, // Reset assignee so target team can triage
            status: 'new', // Moves into target team's triage queue
            updatedAt: new Date().toISOString(),
            activities,
            comments,
          };

          if (selectedTicket?.id === id) {
            setSelectedTicket(updated);
          }
          return updated;
        }
        return ticket;
      })
    );
  };

  const resolveTicket = (id: string, reason: ResolutionReason, notes?: string) => {
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.75 },
        colors: ['#ffffff', '#38bdf8', '#34d399', '#f59e0b'],
      });
    } catch {
      // ignore
    }

    setTickets((prev) =>
      prev.map((ticket) => {
        if (ticket.id === id) {
          const comments = notes
            ? [
                ...ticket.comments,
                {
                  id: `cm-${Date.now()}`,
                  ticketId: id,
                  author: currentUser,
                  content: `[Resolution - ${reason.replace('_', ' ').toUpperCase()}]: ${notes}`,
                  createdAt: new Date().toISOString(),
                  isResolution: true,
                  isInternal: false,
                },
              ]
            : ticket.comments;

          const updated: Ticket = {
            ...ticket,
            status: 'resolved',
            resolutionReason: reason,
            resolutionNotes: notes,
            resolvedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            comments,
            activities: [
              {
                id: `act-${Date.now()}`,
                ticketId: id,
                actor: currentUser,
                action: `resolved ticket (${reason.replace('_', ' ')})`,
                timestamp: new Date().toISOString(),
              },
              ...ticket.activities,
            ],
          };

          if (selectedTicket?.id === id) {
            setSelectedTicket(updated);
          }
          return updated;
        }
        return ticket;
      })
    );
  };

  const addComment = (ticketId: string, content: string, isInternal = false) => {
    if (!content.trim()) return;

    const newComment = {
      id: `cm-${Date.now()}`,
      ticketId,
      author: currentUser,
      content,
      createdAt: new Date().toISOString(),
      isInternal,
    };

    setTickets((prev) =>
      prev.map((ticket) => {
        if (ticket.id === ticketId) {
          const updated = {
            ...ticket,
            comments: [...ticket.comments, newComment],
            updatedAt: new Date().toISOString(),
          };
          if (selectedTicket?.id === ticketId) {
            setSelectedTicket(updated);
          }
          return updated;
        }
        return ticket;
      })
    );
  };

  const toggleChecklistItem = (ticketId: string, itemId: string) => {
    setTickets((prev) =>
      prev.map((ticket) => {
        if (ticket.id === ticketId) {
          const updatedChecklist = ticket.checklist.map((item) =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
          );
          const updated = {
            ...ticket,
            checklist: updatedChecklist,
            updatedAt: new Date().toISOString(),
          };
          if (selectedTicket?.id === ticketId) {
            setSelectedTicket(updated);
          }
          return updated;
        }
        return ticket;
      })
    );
  };

  const addChecklistItem = (ticketId: string, text: string) => {
    if (!text.trim()) return;
    const newItem = {
      id: `chk-${Date.now()}`,
      text: text.trim(),
      completed: false,
    };

    setTickets((prev) =>
      prev.map((ticket) => {
        if (ticket.id === ticketId) {
          const updated = {
            ...ticket,
            checklist: [...ticket.checklist, newItem],
            updatedAt: new Date().toISOString(),
          };
          if (selectedTicket?.id === ticketId) {
            setSelectedTicket(updated);
          }
          return updated;
        }
        return ticket;
      })
    );
  };

  const deleteChecklistItem = (ticketId: string, itemId: string) => {
    setTickets((prev) =>
      prev.map((ticket) => {
        if (ticket.id === ticketId) {
          const updated = {
            ...ticket,
            checklist: ticket.checklist.filter((item) => item.id !== itemId),
            updatedAt: new Date().toISOString(),
          };
          if (selectedTicket?.id === ticketId) {
            setSelectedTicket(updated);
          }
          return updated;
        }
        return ticket;
      })
    );
  };

  const addDepartment = (dept: Omit<Department, 'id'>): Department => {
    const id = dept.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newDepartment: Department = {
      ...dept,
      id,
    };
    setDepartments((prev) => [...prev, newDepartment]);
    return newDepartment;
  };

  // Queue Counts calculation
  const now = Date.now();
  const queueCounts = useMemo<Record<QueueId, number>>(() => {
    const deptScoped =
      selectedDepartment === 'all'
        ? tickets
        : tickets.filter((t) => t.departmentId === selectedDepartment);

    return {
      triage: deptScoped.filter((t) => t.status === 'new' || !t.assignee).length,
      my_tickets: deptScoped.filter(
        (t) => t.assignee?.id === currentUser.id && t.status !== 'resolved' && t.status !== 'closed'
      ).length,
      all_open: deptScoped.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length,
      sla_risk: deptScoped.filter((t) => {
        if (t.status === 'resolved' || t.status === 'closed') return false;
        const deadline = new Date(t.slaDeadline).getTime();
        return deadline - now < 4 * 60 * 60 * 1000; // Under 4 hours or breached
      }).length,
      pending_requester: deptScoped.filter((t) => t.status === 'pending').length,
      resolved_closed: deptScoped.filter((t) => t.status === 'resolved' || t.status === 'closed')
        .length,
    };
  }, [tickets, selectedDepartment, currentUser, now]);

  // Filtered Tickets computation
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Department filter
      if (selectedDepartment !== 'all' && ticket.departmentId !== selectedDepartment) {
        return false;
      }

      // Queue filter
      if (activeQueue === 'triage') {
        if (ticket.status !== 'new' && ticket.assignee !== null) return false;
      } else if (activeQueue === 'my_tickets') {
        if (
          ticket.assignee?.id !== currentUser.id ||
          ticket.status === 'resolved' ||
          ticket.status === 'closed'
        )
          return false;
      } else if (activeQueue === 'all_open') {
        if (ticket.status === 'resolved' || ticket.status === 'closed') return false;
      } else if (activeQueue === 'sla_risk') {
        if (ticket.status === 'resolved' || ticket.status === 'closed') return false;
        const deadline = new Date(ticket.slaDeadline).getTime();
        if (deadline - now >= 4 * 60 * 60 * 1000) return false;
      } else if (activeQueue === 'pending_requester') {
        if (ticket.status !== 'pending') return false;
      } else if (activeQueue === 'resolved_closed') {
        if (ticket.status !== 'resolved' && ticket.status !== 'closed') return false;
      }

      // Explicit Filter dropdowns
      if (filters.status !== 'all' && ticket.status !== filters.status) return false;
      if (filters.priority !== 'all' && ticket.priority !== filters.priority) return false;
      if (filters.type !== 'all' && ticket.type !== filters.type) return false;
      if (filters.assigneeId !== 'all') {
        if (filters.assigneeId === 'unassigned' && ticket.assignee !== null) return false;
        if (filters.assigneeId !== 'unassigned' && ticket.assignee?.id !== filters.assigneeId)
          return false;
      }

      // Search keyword
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase();
        const matchesTitle = ticket.title.toLowerCase().includes(query);
        const matchesCode = ticket.code.toLowerCase().includes(query);
        const matchesDesc = ticket.description.toLowerCase().includes(query);
        const matchesReporter = ticket.reporter.name.toLowerCase().includes(query);
        const matchesAssignee = ticket.assignee?.name.toLowerCase().includes(query);
        const matchesTag = ticket.tags.some((t) => t.toLowerCase().includes(query));

        if (
          !matchesTitle &&
          !matchesCode &&
          !matchesDesc &&
          !matchesReporter &&
          !matchesAssignee &&
          !matchesTag
        ) {
          return false;
        }
      }

      return true;
    });
  }, [tickets, selectedDepartment, activeQueue, filters, currentUser, now]);

  // Make sure selectedTicket remains pointing to a valid ticket when filters change
  useEffect(() => {
    if (!selectedTicket && filteredTickets.length > 0) {
      setSelectedTicket(filteredTickets[0]);
    } else if (
      selectedTicket &&
      !tickets.find((t) => t.id === selectedTicket.id) &&
      filteredTickets.length > 0
    ) {
      setSelectedTicket(filteredTickets[0]);
    }
  }, [filteredTickets, selectedTicket, tickets]);

  // Overall Service Desk metrics
  const metrics = useMemo(() => {
    const deptTickets =
      selectedDepartment === 'all'
        ? tickets
        : tickets.filter((t) => t.departmentId === selectedDepartment);

    const total = deptTickets.length;
    const open = deptTickets.filter((t) => t.status === 'open' || t.status === 'new').length;
    const inProgress = deptTickets.filter((t) => t.status === 'in_progress').length;
    const pending = deptTickets.filter((t) => t.status === 'pending').length;
    const resolved = deptTickets.filter((t) => t.status === 'resolved' || t.status === 'closed')
      .length;

    const slaBreached = deptTickets.filter((t) => {
      if (t.status === 'resolved' || t.status === 'closed') return false;
      return new Date(t.slaDeadline).getTime() < now;
    }).length;

    const slaComplianceRate =
      total > 0 ? Math.round(((total - slaBreached) / total) * 100) : 100;

    const byDepartment: { [deptId: string]: number } = {};
    departments.forEach((d) => {
      byDepartment[d.id] = tickets.filter((t) => t.departmentId === d.id).length;
    });

    return {
      total,
      open,
      inProgress,
      pending,
      resolved,
      slaBreached,
      slaComplianceRate,
      byDepartment,
    };
  }, [tickets, departments, selectedDepartment, now]);

  return (
    <TicketContext.Provider
      value={{
        tickets,
        departments,
        users,
        currentUser,
        setCurrentUser,
        selectedDepartment,
        setSelectedDepartment,
        activeQueue,
        setActiveQueue,
        activeView,
        setActiveView,
        filters,
        setFilters,
        resetFilters,
        selectedTicket,
        setSelectedTicket,
        isCreateModalOpen,
        setIsCreateModalOpen,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isDarkMode,
        toggleDarkMode,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        createTicket,
        updateTicket,
        deleteTicket,
        changeStatus,
        assignTicketToMe,
        assignTicket,
        transferDepartment,
        resolveTicket,
        addComment,
        toggleChecklistItem,
        addChecklistItem,
        deleteChecklistItem,
        addDepartment,
        resetToDefaultData,
        filteredTickets,
        queueCounts,
        metrics,
      }}
    >
      {children}
    </TicketContext.Provider>
  );
};

export const useTickets = () => {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error('useTickets must be used within a TicketProvider');
  }
  return context;
};
