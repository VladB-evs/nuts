import { Department, Issue, UserProfile } from '../types';

export const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'engineering', name: 'Engineering', code: 'DEV' },
  { id: 'marketing', name: 'Marketing', code: 'MKT' },
  { id: 'sales', name: 'Sales & CS', code: 'SLS' },
  { id: 'product', name: 'Product', code: 'PRD' },
  { id: 'operations', name: 'Operations', code: 'OPS' },
];

export const USERS: UserProfile[] = [
  {
    id: 'u1',
    name: 'Liam Vance',
    email: 'liam@nuts.internal',
    department: 'Engineering',
  },
  {
    id: 'u2',
    name: 'Alex Rivera',
    email: 'alex@nuts.internal',
    department: 'Engineering',
  },
  {
    id: 'u3',
    name: 'Maya Chen',
    email: 'maya@nuts.internal',
    department: 'Marketing',
  },
  {
    id: 'u4',
    name: 'David Miller',
    email: 'david@nuts.internal',
    department: 'Sales & CS',
  },
  {
    id: 'u5',
    name: 'Elena Rostova',
    email: 'elena@nuts.internal',
    department: 'Operations',
  },
];

export const INITIAL_ISSUES: Issue[] = [
  {
    id: 'iss-101',
    number: 101,
    code: 'DEV-101',
    title: 'Safari iOS session drop during auth token rotation',
    description: 'When simultaneous API requests occur on mobile WebKit, the token refresh fails and redirects users to login. Needs a mutex queue around token refresh.',
    departmentId: 'engineering',
    priority: 'P0',
    status: 'ASSIGNED',
    assignee: USERS[1], // Alex Rivera
    reporter: USERS[3], // David Miller
    createdAt: '2026-09-28T09:15:00Z',
    updatedAt: '2026-09-28T10:30:00Z',
    starred: true,
    comments: [
      {
        id: 'c1',
        author: USERS[3],
        text: 'Reported by two prospects today during product trials. High priority for closing the demo cycle.',
        createdAt: '2026-09-28T09:20:00Z',
      },
      {
        id: 'c2',
        author: USERS[1],
        text: 'Reproduced locally. Adding request lock in auth client handler.',
        createdAt: '2026-09-28T10:30:00Z',
        statusChange: 'Status changed from NEW to ASSIGNED',
      },
    ],
  },
  {
    id: 'iss-102',
    number: 102,
    code: 'MKT-42',
    title: 'Q4 Product Hunt launch hero screenshots and copy',
    description: 'Prepare high-resolution 1270x760 product imagery, tagline copy, and hunter intro comments for the launch post.',
    departmentId: 'marketing',
    priority: 'P1',
    status: 'ACCEPTED',
    assignee: USERS[2], // Maya Chen
    reporter: USERS[0], // Liam Vance
    createdAt: '2026-09-27T14:00:00Z',
    updatedAt: '2026-09-28T08:00:00Z',
    comments: [
      {
        id: 'c3',
        author: USERS[2],
        text: 'Draft copy is ready in the shared drive. Generating the final screenshots today.',
        createdAt: '2026-09-28T08:00:00Z',
      },
    ],
  },
  {
    id: 'iss-103',
    number: 103,
    code: 'SLS-88',
    title: 'Acme Corp vendor security evaluation questionnaire review',
    description: 'Review SOC2 compliance questions and data retention clauses for $85k contract sign-off.',
    departmentId: 'sales',
    priority: 'P1',
    status: 'ASSIGNED',
    assignee: USERS[3], // David Miller
    reporter: USERS[3],
    createdAt: '2026-09-26T11:00:00Z',
    updatedAt: '2026-09-27T16:00:00Z',
    comments: [],
  },
  {
    id: 'iss-104',
    number: 104,
    code: 'OPS-14',
    title: 'Order replacement MacBook charger and USB-C docks for London office',
    description: 'Two 96W USB-C chargers and Anker multiport hubs needed for engineering visitors.',
    departmentId: 'operations',
    priority: 'P3',
    status: 'NEW',
    assignee: USERS[4], // Elena
    reporter: USERS[1], // Alex
    createdAt: '2026-09-28T07:30:00Z',
    updatedAt: '2026-09-28T07:30:00Z',
    comments: [],
  },
  {
    id: 'iss-105',
    number: 105,
    code: 'PRD-19',
    title: 'Clarify multi-tenant workspace switching UX requirements',
    description: 'Users with multiple organizations need a quick switcher in the top navigation. Write functional spec.',
    departmentId: 'product',
    priority: 'P2',
    status: 'FIXED',
    assignee: USERS[0],
    reporter: USERS[1],
    createdAt: '2026-09-25T13:00:00Z',
    updatedAt: '2026-09-27T18:00:00Z',
    comments: [
      {
        id: 'c4',
        author: USERS[0],
        text: 'Spec completed and attached to the design Figma. Marking FIXED.',
        createdAt: '2026-09-27T18:00:00Z',
        statusChange: 'Status changed from ACCEPTED to FIXED',
      },
    ],
  },
  {
    id: 'iss-106',
    number: 106,
    code: 'DEV-106',
    title: 'PostgreSQL connection pool exhaustion during peak export jobs',
    description: 'Connection pool size needs to be adjusted from 20 to 50 in Supabase pgbouncer pool settings.',
    departmentId: 'engineering',
    priority: 'P1',
    status: 'NEW',
    assignee: null,
    reporter: USERS[1],
    createdAt: '2026-09-28T11:00:00Z',
    updatedAt: '2026-09-28T11:00:00Z',
    comments: [],
  },
];
