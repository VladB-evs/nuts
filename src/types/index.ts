export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

export type Status = 'NEW' | 'ASSIGNED' | 'ACCEPTED' | 'FIXED' | 'VERIFIED' | 'CLOSED';

export type Environment = 'LOCAL' | 'STAGING' | 'PROD';

export type DevScope = 'frontend' | 'backend' | 'both';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  department: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  color?: string;
  description?: string;
}

export interface Comment {
  id: string;
  author: UserProfile;
  text: string;
  createdAt: string;
  statusChange?: string;
}

export interface Issue {
  id: string;
  number: number;
  code: string; // e.g. "DEV-101"
  title: string;
  description: string;
  departmentId: string;
  priority: Priority;
  status: Status;
  environment: Environment; // 'LOCAL' | 'STAGING' | 'PROD'
  devScope?: DevScope; // 'frontend' | 'backend' | 'both'
  assignee: UserProfile | null;
  reporter: UserProfile;
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
  starred?: boolean;
}

export type NavView = 'open' | 'assigned_to_me' | 'reported_by_me' | 'starred' | 'closed';
