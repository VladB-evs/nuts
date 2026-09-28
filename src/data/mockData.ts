import { Department, Ticket, UserProfile } from '../types';

export const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'engineering',
    name: 'Engineering',
    code: 'DEV',
    color: '#3b82f6', // Electric Blue
    icon: 'Code2',
    description: 'Bugs, backend architecture, frontend apps and infrastructure',
  },
  {
    id: 'marketing',
    name: 'Marketing',
    code: 'MKT',
    color: '#a855f7', // Violet
    icon: 'Megaphone',
    description: 'Growth, product launches, content, social campaigns and PR',
  },
  {
    id: 'sales',
    name: 'Sales & CS',
    code: 'SLS',
    color: '#06b6d4', // Cyan
    icon: 'TrendingUp',
    description: 'Enterprise deals, client onboarding, SLAs and customer escalation',
  },
  {
    id: 'product',
    name: 'Product & Design',
    code: 'PRD',
    color: '#10b981', // Emerald
    icon: 'Sparkles',
    description: 'Specs, UI/UX prototypes, research interviews and design system',
  },
  {
    id: 'operations',
    name: 'Operations & HR',
    code: 'OPS',
    color: '#f43f5e', // Rose
    icon: 'ShieldAlert',
    description: 'Finances, security audits, team hardware and legal compliance',
  },
];

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'u1',
    name: 'Liam Vance',
    email: 'liam@nuts.internal',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    role: 'Founder & CTO',
    departmentId: 'engineering',
  },
  {
    id: 'u2',
    name: 'Alex Rivera',
    email: 'alex@nuts.internal',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    role: 'Senior Fullstack Dev',
    departmentId: 'engineering',
  },
  {
    id: 'u3',
    name: 'Maya Chen',
    email: 'maya@nuts.internal',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    role: 'Growth Marketing Lead',
    departmentId: 'marketing',
  },
  {
    id: 'u4',
    name: 'David Miller',
    email: 'david@nuts.internal',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    role: 'Enterprise AE',
    departmentId: 'sales',
  },
  {
    id: 'u5',
    name: 'Sophia Patel',
    email: 'sophia@nuts.internal',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
    role: 'Lead UI/UX Designer',
    departmentId: 'product',
  },
  {
    id: 'u6',
    name: 'Elena Rostova',
    email: 'elena@nuts.internal',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    role: 'Head of People & Ops',
    departmentId: 'operations',
  },
];

export const INITIAL_TICKETS: Ticket[] = [
  {
    id: 't-101',
    ticketNumber: 101,
    code: 'DEV-101',
    title: 'Customer Auth Failure: JWT token refresh race condition on mobile Safari',
    description: 'Sales and CS reported 3 enterprise prospects on iOS WebKit getting kicked out during live evaluations. High risk to deal pipeline.',
    departmentId: 'engineering',
    requesterDepartmentId: 'sales',
    status: 'in_progress',
    priority: 'critical',
    type: 'incident',
    assignee: INITIAL_USERS[1], // Alex Rivera
    reporter: INITIAL_USERS[3], // David Miller (Sales)
    tags: ['Auth', 'Bug', 'iOS', 'Customer-Escalation'],
    createdAt: '2026-09-28T09:15:00Z',
    updatedAt: '2026-09-28T11:30:00Z',
    dueDate: '2026-09-29T18:00:00Z',
    slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours remaining
    estimateHours: 6,
    checklist: [
      { id: 'c1', text: 'Reproduce locally with network throttling on Safari', completed: true },
      { id: 'c2', text: 'Add mutex lock to token refresh queue in auth client', completed: true },
      { id: 'c3', text: 'Unit test simultaneous 401 retry handling', completed: false },
      { id: 'c4', text: 'Deploy hotfix to staging and verify with Sales demo iPad', completed: false },
    ],
    comments: [
      {
        id: 'cm1',
        ticketId: 't-101',
        author: INITIAL_USERS[3], // David (Sales)
        content: 'Hey Alex, this just happened again during our Acme Corp call. The VP of Eng was testing the iPad app and got booted. Need an ETA so I can communicate with them.',
        createdAt: '2026-09-28T09:20:00Z',
        isInternal: false,
      },
      {
        id: 'cm2',
        ticketId: 't-101',
        author: INITIAL_USERS[1], // Alex
        content: 'Lock mutex is written in branch `fix/safari-jwt-race`. Validating regression suites now, expecting staging deploy by 2 PM.',
        createdAt: '2026-09-28T10:15:00Z',
        isInternal: false,
      },
      {
        id: 'cm3',
        ticketId: 't-101',
        author: INITIAL_USERS[0], // Liam
        content: 'Note for Eng team: once this hotfix lands, let us audit the Supabase auth listener to ensure session refresh broadcasts only once across tabs.',
        createdAt: '2026-09-28T11:00:00Z',
        isInternal: true,
      },
    ],
    activities: [
      {
        id: 'a1',
        ticketId: 't-101',
        actor: INITIAL_USERS[3],
        action: 'submitted ticket via Sales Portal',
        timestamp: '2026-09-28T09:15:00Z',
      },
      {
        id: 'a2',
        ticketId: 't-101',
        actor: INITIAL_USERS[1],
        action: 'triaged and accepted ticket',
        timestamp: '2026-09-28T09:30:00Z',
      },
    ],
    customFields: {
      engineering: {
        issueType: 'bug',
        gitBranch: 'fix/safari-jwt-race',
        prUrl: 'https://github.com/nuts-internal/nuts-core/pull/142',
        targetEnv: 'production',
      },
    },
  },
  {
    id: 't-102',
    ticketNumber: 102,
    code: 'MKT-45',
    title: 'Provide SVG brand assets and interactive calculator for Q4 Product Hunt launch',
    description: 'Engineering requested high-res illustrations, logo mark badges, and marketing hero copy for the public launch repository.',
    departmentId: 'marketing',
    requesterDepartmentId: 'engineering',
    status: 'in_progress',
    priority: 'high',
    type: 'service_request',
    assignee: INITIAL_USERS[2], // Maya Chen
    reporter: INITIAL_USERS[1], // Alex Rivera (Dev)
    tags: ['ProductHunt', 'Launch', 'Design', 'Branding'],
    createdAt: '2026-09-27T14:00:00Z',
    updatedAt: '2026-09-28T10:15:00Z',
    dueDate: '2026-10-05T00:00:00Z',
    slaDeadline: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(), // 18 hours left
    estimateHours: 12,
    checklist: [
      { id: 'mc1', text: 'Export dark-mode vector badge logos', completed: true },
      { id: 'mc2', text: 'Write maker comment & founding story draft', completed: true },
      { id: 'mc3', text: 'Review interactive demo preview on staging', completed: false },
    ],
    comments: [
      {
        id: 'mcm1',
        ticketId: 't-102',
        author: INITIAL_USERS[4], // Sophia
        content: 'Figma mockups and raw SVG exports are uploaded to Drive and linked in the deliverable field.',
        createdAt: '2026-09-27T16:40:00Z',
      },
    ],
    activities: [],
    customFields: {
      marketing: {
        campaign: 'V2 Launch Blitz',
        channel: 'social',
        targetAudience: 'Tech founders, Product Managers, Indie Hackers',
        deliverableUrl: 'https://figma.com/file/nuts-ph-launch-kit',
      },
    },
  },
  {
    id: 't-103',
    ticketNumber: 103,
    code: 'DEV-103',
    title: 'NEW INBOX: Webhook retry worker crashed in staging environment',
    description: 'Automated health check alert: worker process exited with OOM error during simulated webhook queue spike.',
    departmentId: 'engineering',
    requesterDepartmentId: 'operations',
    status: 'new', // Needs triage!
    priority: 'high',
    type: 'bug',
    assignee: null, // Unassigned!
    reporter: INITIAL_USERS[5], // Elena (Ops)
    tags: ['Triage', 'Staging', 'Infrastructure', 'Worker'],
    createdAt: '2026-09-28T12:10:00Z',
    updatedAt: '2026-09-28T12:10:00Z',
    slaDeadline: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour left!
    checklist: [],
    comments: [],
    activities: [
      {
        id: 'a103',
        ticketId: 't-103',
        actor: INITIAL_USERS[5],
        action: 'submitted ticket via Ops Monitoring',
        timestamp: '2026-09-28T12:10:00Z',
      },
    ],
    customFields: {
      engineering: {
        issueType: 'bug',
        targetEnv: 'staging',
      },
    },
  },
  {
    id: 't-104',
    ticketNumber: 104,
    code: 'SLS-88',
    title: 'Urgent SOC2 Type II report & penetration test packet for Acme Corp ($85k ARR)',
    description: 'Acme Corp procurement gave a strict 24-hour turnaround deadline before closing the commercial agreement.',
    departmentId: 'sales',
    requesterDepartmentId: 'sales',
    status: 'escalated',
    priority: 'critical',
    type: 'service_request',
    assignee: INITIAL_USERS[3], // David Miller
    reporter: INITIAL_USERS[3],
    tags: ['Enterprise', 'Security', 'Contract', 'SLA-Urgent'],
    createdAt: '2026-09-27T08:00:00Z',
    updatedAt: '2026-09-28T08:45:00Z',
    dueDate: '2026-09-29T17:00:00Z',
    slaDeadline: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // Breached 45 mins ago!
    slaBreached: true,
    estimateHours: 8,
    checklist: [
      { id: 'sc1', text: 'Attach latest penetration test executive summary', completed: true },
      { id: 'sc2', text: 'Legal team sign-off on DPA terms', completed: false },
    ],
    comments: [
      {
        id: 'scm1',
        ticketId: 't-104',
        author: INITIAL_USERS[0],
        content: 'Approved and sent to legal for final signature stamp.',
        createdAt: '2026-09-28T08:30:00Z',
        isInternal: true,
      },
    ],
    activities: [],
    customFields: {
      sales: {
        clientName: 'Acme Corporation',
        dealValue: 85000,
        dealStage: 'negotiation',
        slaHours: 24,
      },
    },
  },
  {
    id: 't-105',
    ticketNumber: 105,
    code: 'OPS-14',
    title: 'Provision developer hardware & access tokens for incoming Backend Engineer',
    description: 'Engineering Lead requested 16-inch M-series MacBook, YubiKey, and 1Password vault provisioning before Monday.',
    departmentId: 'operations',
    requesterDepartmentId: 'engineering',
    status: 'open',
    priority: 'medium',
    type: 'service_request',
    assignee: INITIAL_USERS[5], // Elena Rostova
    reporter: INITIAL_USERS[0], // Liam Vance
    tags: ['Onboarding', 'Hardware', 'IT'],
    createdAt: '2026-09-27T13:00:00Z',
    updatedAt: '2026-09-27T13:00:00Z',
    dueDate: '2026-10-02T12:00:00Z',
    slaDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    estimateHours: 4,
    checklist: [
      { id: 'oc1', text: 'Order hardware via Apple Business Manager', completed: true },
      { id: 'oc2', text: 'Configure Jamf profiles & zero-trust VPN', completed: false },
    ],
    comments: [],
    activities: [],
    customFields: {
      ops: {
        category: 'hardware',
        budget: 4200,
      },
    },
  },
  {
    id: 't-106',
    ticketNumber: 106,
    code: 'PRD-32',
    title: 'Specification for Dark/Light high-contrast ticketing theme tokens',
    description: 'Frontend requested formal design system specifications for border contrast ratios and accessibility compliance.',
    departmentId: 'product',
    requesterDepartmentId: 'engineering',
    status: 'resolved',
    priority: 'medium',
    type: 'feature',
    assignee: INITIAL_USERS[4], // Sophia Patel
    reporter: INITIAL_USERS[1], // Alex Rivera
    tags: ['Design System', 'UI/UX', 'Monochrome'],
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-27T15:00:00Z',
    resolvedAt: '2026-09-27T15:00:00Z',
    resolutionReason: 'resolved_fixed',
    resolutionNotes: 'Theme tokens established in Tailwind configuration and WCAG AAA verified.',
    slaDeadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    checklist: [
      { id: 'pc1', text: 'Audit existing color hex values across components', completed: true },
      { id: 'pc2', text: 'Define 60-30-10 monochrome ratio guidelines', completed: true },
    ],
    comments: [
      {
        id: 'pcm1',
        ticketId: 't-106',
        author: INITIAL_USERS[4],
        content: 'Resolved and deployed to production. Design token Figma spec linked.',
        createdAt: '2026-09-27T15:00:00Z',
        isResolution: true,
      },
    ],
    activities: [],
    customFields: {
      product: {
        figmaUrl: 'https://figma.com/file/nuts-design-tokens-mono',
        milestone: 'v1.0 Core System',
      },
    },
  },
  {
    id: 't-107',
    ticketNumber: 107,
    code: 'DEV-107',
    title: 'Customer Inquiry: Clarification on webhook HMAC signature verification',
    description: 'Inbound question from TechCorp developer trying to integrate our billing webhook endpoint.',
    departmentId: 'engineering',
    requesterDepartmentId: 'sales',
    status: 'pending', // Waiting on customer/requester
    priority: 'medium',
    type: 'question',
    assignee: INITIAL_USERS[1],
    reporter: INITIAL_USERS[3],
    tags: ['Webhooks', 'API', 'Customer-Support'],
    createdAt: '2026-09-26T16:00:00Z',
    updatedAt: '2026-09-28T07:30:00Z',
    slaDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    checklist: [],
    comments: [
      {
        id: 'cm107',
        ticketId: 't-107',
        author: INITIAL_USERS[1],
        content: 'Sent sample NodeJS code demonstrating crypto.createHmac verification. Waiting for customer confirmation on their end.',
        createdAt: '2026-09-28T07:30:00Z',
      },
    ],
    activities: [],
    customFields: {
      engineering: {
        issueType: 'tech_debt',
        targetEnv: 'production',
      },
    },
  },
];
