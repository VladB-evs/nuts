import type { CustomFieldDefinition } from '../types';
import {
  MARKETING_CHANNELS,
  DELIVERABLE_TYPES,
  DEAL_SEGMENTS,
  DEAL_STAGES,
  OPS_CATEGORIES,
  IMPACT_LEVELS,
} from './departmentRules';

export interface DepartmentTemplate {
  name: string;
  code: string;
  description: string;
  customFields: CustomFieldDefinition[];
}

const select = (
  id: string,
  name: string,
  options: string[],
  showAsFilter = false
): CustomFieldDefinition => ({
  id,
  name,
  type: 'select',
  options: [...options],
  ...(showAsFilter ? { showAsFilter: true } : {}),
});

/**
 * Starting points for a new department. Each has a couple of properties (ticket creation
 * requires every property, so these stay short) and its main one is a list filter.
 */
export const DEPARTMENT_TEMPLATES: DepartmentTemplate[] = [
  {
    name: 'Engineering',
    code: 'DEV',
    description: 'Core product development, bug triage, and feature engineering',
    customFields: [
      select('issueType', 'Issue Type', ['Bug', 'Feature', 'Update', 'Adjustment'], true),
      select('environment', 'Environment Stage', ['LOCAL', 'STAGING', 'PROD']),
      select('devScope', 'Development Layer', ['Frontend only', 'Backend only', 'Both (Frontend + Backend)']),
    ],
  },
  {
    name: 'Product',
    code: 'PRD',
    description: 'Product management, user research, and roadmap planning',
    customFields: [
      select('requestType', 'Request Type', ['Feature request', 'Research', 'Roadmap item', 'Feedback'], true),
      select('stage', 'Stage', ['Discovery', 'Design', 'Build', 'Launch']),
    ],
  },
  {
    name: 'Marketing',
    code: 'MKT',
    description: 'Content, growth campaigns, SEO, and brand acquisition',
    customFields: [
      select('marketingChannel', 'Channel', MARKETING_CHANNELS, true),
      select('deliverableType', 'Deliverable', DELIVERABLE_TYPES),
    ],
  },
  {
    name: 'Sales',
    code: 'SLS',
    description: 'Pipelines, enterprise deals, partnerships, and account executive tasks',
    customFields: [
      select('dealSegment', 'Segment', DEAL_SEGMENTS, true),
      select('dealStage', 'Deal Stage', DEAL_STAGES),
    ],
  },
  {
    name: 'Operations',
    code: 'OPS',
    description: 'Finance, legal contracts, IT access, and office facilities',
    customFields: [
      select('opsCategory', 'Category', OPS_CATEGORIES, true),
      select('impactLevel', 'Impact', IMPACT_LEVELS),
    ],
  },
  {
    name: 'HR',
    code: 'HR',
    description: 'Hiring, onboarding, leave, payroll, and people policies',
    customFields: [
      select('requestType', 'Request Type', ['Hiring', 'Onboarding', 'Offboarding', 'Leave', 'Payroll', 'Policy'], true),
      select('impactLevel', 'Impact', IMPACT_LEVELS),
    ],
  },
  {
    name: 'Customer Support',
    code: 'CS',
    description: 'Customer tickets, troubleshooting, and issue escalation',
    customFields: [
      select('requestType', 'Request Type', ['Question', 'Bug report', 'Billing', 'Feature request'], true),
      select('customerTier', 'Customer Tier', ['Enterprise', 'Pro', 'Free']),
    ],
  },
  {
    name: 'Design',
    code: 'DSN',
    description: 'Product design, UI/UX systems, and visual design assets',
    customFields: [
      select('deliverable', 'Deliverable', ['UI design', 'UX research', 'Illustration', 'Brand asset', 'Design system'], true),
    ],
  },
];

/** "Customer Support" -> "CS", "Engineering" -> "ENG". At most 5 characters, upper case. */
export const suggestDepartmentCode = (name: string): string => {
  const words = name.trim().split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (words.length === 0) return '';
  const code = words.length > 1 ? words.map((w) => w[0]).join('') : words[0].slice(0, 3);
  return code.toUpperCase().slice(0, 5);
};

const slug = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/**
 * One-line property entry:
 *   "Channel: Social, Email, Paid"  -> dropdown with those options
 *   "Deal value"                    -> free-text field
 * Returns null for empty input. `takenIds` keeps field ids unique within the department.
 */
export const parseQuickProperty = (
  input: string,
  takenIds: string[]
): CustomFieldDefinition | null => {
  const [rawName, ...rest] = input.split(':');
  const name = rawName.trim();
  if (!name) return null;

  const options = Array.from(
    new Set(
      rest
        .join(':')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    )
  );

  const base = slug(name) || 'field';
  let id = base;
  for (let n = 2; takenIds.includes(id); n++) id = `${base}_${n}`;

  return options.length > 0
    ? { id, name, type: 'select', options }
    : { id, name, type: 'text' };
};
