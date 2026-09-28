export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type TicketStatus =
  | 'new'
  | 'open'
  | 'in_progress'
  | 'pending'
  | 'escalated'
  | 'resolved'
  | 'closed';

export type TicketType = 'incident' | 'service_request' | 'bug' | 'feature' | 'question';

export type ResolutionReason =
  | 'resolved_fixed'
  | 'resolved_explained'
  | 'duplicate'
  | 'wont_fix'
  | 'cannot_reproduce';

export type QueueId =
  | 'triage'
  | 'my_tickets'
  | 'all_open'
  | 'sla_risk'
  | 'pending_requester'
  | 'resolved_closed';

export type ViewMode = 'console' | 'table' | 'portal' | 'sla_metrics';

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
  color: string; // Accent color hex
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
  isInternal?: boolean; // Internal note vs public response to requester
  isResolution?: boolean;
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
  departmentId: string; // Department the ticket is assigned to
  status: TicketStatus;
  priority: Priority;
  type: TicketType;
  assignee: UserProfile | null;
  reporter: UserProfile; // Submitter / Requester
  requesterDepartmentId: string; // Submitter's home department
  tags: string[];
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  slaDeadline: string; // Required for SLA calculation
  slaBreached?: boolean;
  estimateHours?: number;
  checklist: ChecklistItem[];
  comments: TicketComment[];
  activities: TicketActivity[];
  customFields?: TicketCustomFields;
  resolutionReason?: ResolutionReason;
  resolutionNotes?: string;
  resolvedAt?: string;
}

export interface FilterState {
  search: string;
  departmentId: string; // 'all' or department.id
  status: TicketStatus | 'all';
  priority: Priority | 'all';
  assigneeId: string | 'all';
  type: TicketType | 'all';
  queue: QueueId | 'all';
}
