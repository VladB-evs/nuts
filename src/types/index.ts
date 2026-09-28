export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type TicketStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';

export type ViewMode = 'kanban' | 'list' | 'metrics';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  departmentId: string;
}

export interface Department {
  id: string;
  name: string;
  code: string; // e.g. "DEV", "MKT", "SLS", "PRD", "OPS"
  color: string; // Accent color hex or tailwind class
  icon: string; // Lucide icon identifier
  description: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  author: UserProfile;
  content: string;
  createdAt: string;
  isInternal?: boolean;
}

export interface TicketActivity {
  id: string;
  ticketId: string;
  actor: UserProfile;
  action: string;
  timestamp: string;
  details?: string;
}

export interface EngineeringFields {
  issueType?: 'bug' | 'feature' | 'refactor' | 'tech_debt' | 'security';
  gitBranch?: string;
  prUrl?: string;
  targetEnv?: 'production' | 'staging' | 'development';
}

export interface MarketingFields {
  campaign?: string;
  channel?: 'social' | 'email' | 'content' | 'ads' | 'seo' | 'event';
  targetAudience?: string;
  deliverableUrl?: string;
}

export interface SalesFields {
  clientName?: string;
  dealValue?: number;
  dealStage?: 'lead' | 'discovery' | 'proposal' | 'negotiation' | 'closing' | 'retention';
  slaHours?: number;
}

export interface ProductFields {
  figmaUrl?: string;
  userStory?: string;
  milestone?: string;
}

export interface OpsFields {
  category?: 'finance' | 'legal' | 'hardware' | 'facilities' | 'onboarding';
  budget?: number;
}

export interface TicketCustomFields {
  engineering?: EngineeringFields;
  marketing?: MarketingFields;
  sales?: SalesFields;
  product?: ProductFields;
  ops?: OpsFields;
  [key: string]: any;
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  code: string; // e.g. "DEV-101", "MKT-42"
  title: string;
  description: string;
  departmentId: string;
  status: TicketStatus;
  priority: Priority;
  assignee: UserProfile | null;
  reporter: UserProfile;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  estimateHours?: number;
  checklist: ChecklistItem[];
  comments: TicketComment[];
  activities: TicketActivity[];
  customFields?: TicketCustomFields;
}

export interface FilterState {
  search: string;
  departmentId: string; // 'all' or department.id
  status: TicketStatus | 'all';
  priority: Priority | 'all';
  assigneeId: string | 'all';
  tag: string | 'all';
}
