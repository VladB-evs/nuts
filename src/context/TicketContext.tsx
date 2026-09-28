import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Ticket,
  Department,
  UserProfile,
  TicketStatus,
  ViewMode,
  FilterState,
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
  
  // Ticket Actions
  createTicket: (ticketData: Partial<Ticket>) => Ticket;
  updateTicket: (id: string, updates: Partial<Ticket>) => void;
  deleteTicket: (id: string) => void;
  moveTicketStatus: (id: string, newStatus: TicketStatus) => void;
  addComment: (ticketId: string, content: string, isInternal?: boolean) => void;
  toggleChecklistItem: (ticketId: string, itemId: string) => void;
  addChecklistItem: (ticketId: string, text: string) => void;
  deleteChecklistItem: (ticketId: string, itemId: string) => void;
  addDepartment: (department: Omit<Department, 'id'>) => Department;
  resetToDefaultData: () => void;

  // Computed
  filteredTickets: Ticket[];
  metrics: {
    total: number;
    completed: number;
    inProgress: number;
    critical: number;
    byDepartment: { [deptId: string]: number };
  };
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_TICKETS = 'nuts_tickets_store_v1';
const LOCAL_STORAGE_KEY_DEPTS = 'nuts_departments_store_v1';
const LOCAL_STORAGE_KEY_THEME = 'nuts_theme_preference_v1';

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_THEME);
    if (saved !== null) return saved === 'dark';
    return true; // Default to dark mode for sleek monochrome aesthetic
  });

  // Data states with LocalStorage persistence
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
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USERS[0]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [activeView, setActiveView] = useState<ViewMode>('kanban');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    departmentId: 'all',
    status: 'all',
    priority: 'all',
    assigneeId: 'all',
    tag: 'all',
  });

  // Apply dark mode class to <html>
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

  // Save tickets & depts to localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_TICKETS, JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_DEPTS, JSON.stringify(departments));
  }, [departments]);

  // Keyboard shortcut listener for Cmd+K / Ctrl+K and 'C' to create ticket
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
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
      tag: 'all',
    });
  };

  const resetToDefaultData = () => {
    setTickets(INITIAL_TICKETS);
    setDepartments(INITIAL_DEPARTMENTS);
    localStorage.removeItem(LOCAL_STORAGE_KEY_TICKETS);
    localStorage.removeItem(LOCAL_STORAGE_KEY_DEPTS);
  };

  const createTicket = (ticketData: Partial<Ticket>): Ticket => {
    const deptId = ticketData.departmentId || (selectedDepartment !== 'all' ? selectedDepartment : 'engineering');
    const dept = departments.find((d) => d.id === deptId) || departments[0];

    const departmentTickets = tickets.filter((t) => t.departmentId === dept.id);
    const maxNum = departmentTickets.reduce((max, t) => Math.max(max, t.ticketNumber || 0), 100);
    const newNum = maxNum + 1;
    const ticketCode = `${dept.code}-${newNum}`;

    const newTicket: Ticket = {
      id: `t-${Date.now()}`,
      ticketNumber: newNum,
      code: ticketCode,
      title: ticketData.title || 'Untitled Ticket',
      description: ticketData.description || '',
      departmentId: dept.id,
      status: ticketData.status || 'todo',
      priority: ticketData.priority || 'medium',
      assignee: ticketData.assignee || null,
      reporter: currentUser,
      tags: ticketData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate: ticketData.dueDate,
      estimateHours: ticketData.estimateHours,
      checklist: ticketData.checklist || [],
      comments: [],
      activities: [
        {
          id: `act-${Date.now()}`,
          ticketId: `t-${Date.now()}`,
          actor: currentUser,
          action: 'created ticket',
          timestamp: new Date().toISOString(),
        },
      ],
      customFields: ticketData.customFields || {},
    };

    setTickets((prev) => [newTicket, ...prev]);
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

  const moveTicketStatus = (id: string, newStatus: TicketStatus) => {
    setTickets((prev) =>
      prev.map((ticket) => {
        if (ticket.id === id) {
          if (newStatus === 'done' && ticket.status !== 'done') {
            // Trigger confetti delight
            try {
              confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.8 },
                colors: ['#ffffff', '#a1a1aa', '#38bdf8', '#34d399'],
              });
            } catch {
              // Ignore if canvas is not ready
            }
          }

          const updated: Ticket = {
            ...ticket,
            status: newStatus,
            updatedAt: new Date().toISOString(),
            activities: [
              {
                id: `act-${Date.now()}`,
                ticketId: id,
                actor: currentUser,
                action: `moved to ${newStatus.replace('_', ' ').toUpperCase()}`,
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

  // Filtered tickets computation
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Department filter (from top bar or global filter)
      const deptFilter = filters.departmentId !== 'all' ? filters.departmentId : selectedDepartment;
      if (deptFilter !== 'all' && ticket.departmentId !== deptFilter) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && ticket.status !== filters.status) {
        return false;
      }

      // Priority filter
      if (filters.priority !== 'all' && ticket.priority !== filters.priority) {
        return false;
      }

      // Assignee filter
      if (filters.assigneeId !== 'all') {
        if (filters.assigneeId === 'unassigned' && ticket.assignee !== null) {
          return false;
        }
        if (filters.assigneeId !== 'unassigned' && ticket.assignee?.id !== filters.assigneeId) {
          return false;
        }
      }

      // Tag filter
      if (filters.tag !== 'all' && !ticket.tags.includes(filters.tag)) {
        return false;
      }

      // Text search (in title, description, code, or tags)
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase();
        const matchesTitle = ticket.title.toLowerCase().includes(query);
        const matchesCode = ticket.code.toLowerCase().includes(query);
        const matchesDesc = ticket.description.toLowerCase().includes(query);
        const matchesTag = ticket.tags.some((t) => t.toLowerCase().includes(query));
        const matchesAssignee = ticket.assignee?.name.toLowerCase().includes(query);

        if (!matchesTitle && !matchesCode && !matchesDesc && !matchesTag && !matchesAssignee) {
          return false;
        }
      }

      return true;
    });
  }, [tickets, selectedDepartment, filters]);

  // Overall metrics calculation
  const metrics = useMemo(() => {
    const deptTickets = selectedDepartment === 'all' 
      ? tickets 
      : tickets.filter((t) => t.departmentId === selectedDepartment);

    const total = deptTickets.length;
    const completed = deptTickets.filter((t) => t.status === 'done').length;
    const inProgress = deptTickets.filter((t) => t.status === 'in_progress').length;
    const critical = deptTickets.filter((t) => t.priority === 'critical').length;

    const byDepartment: { [deptId: string]: number } = {};
    departments.forEach((d) => {
      byDepartment[d.id] = tickets.filter((t) => t.departmentId === d.id).length;
    });

    return {
      total,
      completed,
      inProgress,
      critical,
      byDepartment,
    };
  }, [tickets, departments, selectedDepartment]);

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
        moveTicketStatus,
        addComment,
        toggleChecklistItem,
        addChecklistItem,
        deleteChecklistItem,
        addDepartment,
        resetToDefaultData,
        filteredTickets,
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
