export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

export type Status = 'NEW' | 'ASSIGNED' | 'ACCEPTED' | 'FIXED' | 'VERIFIED' | 'CLOSED';

// ====================================================================
// Department Specific Ticket Rules & Fields
// ====================================================================

// 1. Engineering / Tech
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

export interface UserProfile {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  avatar?: string;
  avatarUrl?: string;
  department: string;
  role?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  color?: string;
  description?: string;
  customFields?: CustomFieldDefinition[];
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

export interface Issue {
  id: string;
  number: number;
  code: string; // e.g. "DEV-101", "MKT-42", "SLS-88", "OPS-14"
  title: string;
  description: string;
  departmentId: string;
  priority: Priority;
  status: Status;

  // Dynamic custom attributes stored per department custom field ID
  customAttributes?: Record<string, any>;

  // Engineering Specific Rules (backward compatible)
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
