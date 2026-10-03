export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

export type Status = 'NEW' | 'ASSIGNED' | 'ACCEPTED' | 'FIXED' | 'VERIFIED' | 'CLOSED';

// ====================================================================
// Department Specific Ticket Rules & Fields
// ====================================================================

// 1. Engineering / Tech
export type IssueType = 'Bug' | 'Feature';
export type Environment = 'LOCAL' | 'STAGING' | 'PROD';
export type DevScope = 'frontend' | 'backend' | 'both';

// 2. Marketing
export type MarketingChannel =
  | 'Social Media'
  | 'Content & SEO'
  | 'Email & Newsletter'
  | 'Paid Ads'
  | 'Brand & Design'
  | 'Product Launch';

export type DeliverableType =
  | 'Copy & Blog'
  | 'Graphics & Assets'
  | 'Video & Motion'
  | 'Landing Page'
  | 'Campaign Plan';

// 3. Sales & Customer Success
export type DealSegment =
  | 'Enterprise'
  | 'Mid-Market'
  | 'SMB / Startup'
  | 'Strategic Partner';

export type DealStage =
  | 'Lead / Prospect'
  | 'Discovery & Demo'
  | 'Proposal & Pricing'
  | 'Contract Negotiation'
  | 'Closed-Won Review';

// 4. Operations
export type OpsCategory =
  | 'IT & Access'
  | 'Finance & Billing'
  | 'Legal & Contracts'
  | 'People & HR'
  | 'Office & Facilities'
  | 'Security & Compliance';

export type ImpactLevel =
  | 'Company-wide'
  | 'Team-specific'
  | 'Individual';

// ====================================================================
// Core Models & Dynamic Custom Fields
// ====================================================================

export type CustomFieldType = 'select' | 'text';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  options?: string[]; // for 'select' type
  defaultValue?: string;
  required?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  createdByEmail?: string;
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  avatar?: string;
  avatarUrl?: string;
  department: string;
  role?: string;
  isAdmin?: boolean;
  orgId?: string;
  organization?: Organization;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  color?: string;
  description?: string;
  customFields?: CustomFieldDefinition[];
  orgId?: string;
}

export interface Comment {
  id: string;
  author: UserProfile;
  text: string;
  createdAt: string;
  statusChange?: string;
}

export interface HistoryEntry {
  id: string;
  actor: UserProfile;
  field: string;
  oldValue: string;
  newValue: string;
  message: string;
  createdAt: string;
}

// ====================================================================
// Ticket Linking Models
// ====================================================================

export type LinkRelationType =
  | 'relates_to'
  | 'blocks'
  | 'blocked_by'
  | 'duplicates'
  | 'duplicated_by';

export interface IssueLink {
  issueId: string;
  relation: LinkRelationType;
  createdAt?: string;
}

export const INVERSE_RELATIONS: Record<LinkRelationType, LinkRelationType> = {
  relates_to: 'relates_to',
  blocks: 'blocked_by',
  blocked_by: 'blocks',
  duplicates: 'duplicated_by',
  duplicated_by: 'duplicates',
};

export interface RelationConfig {
  label: string;
  inverseLabel: string;
  badgeClass: string;
  description: string;
}

export const RELATION_CONFIG: Record<LinkRelationType, RelationConfig> = {
  relates_to: {
    label: 'Relates to',
    inverseLabel: 'Relates to',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'General relationship between tickets',
  },
  blocks: {
    label: 'Blocks',
    inverseLabel: 'Blocked by',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Blocks target ticket from proceeding',
  },
  blocked_by: {
    label: 'Blocked by',
    inverseLabel: 'Blocks',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Blocked until target ticket is resolved',
  },
  duplicates: {
    label: 'Duplicates',
    inverseLabel: 'Duplicated by',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Identical scope or duplicate ticket',
  },
  duplicated_by: {
    label: 'Duplicated by',
    inverseLabel: 'Duplicates',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Duplicated by another ticket',
  },
};

export interface Issue {
  id: string;
  orgId?: string;
  number: number;
  code: string; // e.g. "DEV-101", "MKT-42", "SLS-88", "OPS-14"
  title: string;
  description: string;
  departmentId: string;
  priority: Priority;
  status: Status;

  // Dynamic custom attributes stored per department custom field ID
  customAttributes?: Record<string, any>;

  // Linked tickets across departments
  linkedIssues?: IssueLink[];

  // Engineering Specific Rules (backward compatible)
  issueType?: IssueType; // 'Bug' | 'Feature'
  environment?: Environment; // 'LOCAL' | 'STAGING' | 'PROD'
  devScope?: DevScope; // 'frontend' | 'backend' | 'both'

  // Marketing Specific Rules (backward compatible)
  marketingChannel?: MarketingChannel;
  deliverableType?: DeliverableType;

  // Sales Specific Rules (backward compatible)
  dealSegment?: DealSegment;
  dealStage?: DealStage;

  // Operations Specific Rules (backward compatible)
  opsCategory?: OpsCategory;
  impactLevel?: ImpactLevel;

  assignee: UserProfile | null;
  reporter: UserProfile;
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
  history: HistoryEntry[];
  starred?: boolean;
}

export type NavView = 'open' | 'assigned_to_me' | 'reported_by_me' | 'starred' | 'closed';

// ====================================================================
// Toast Notification Models
// ====================================================================

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning';
  title: string;
  message?: string;
  action?: ToastAction;
}

