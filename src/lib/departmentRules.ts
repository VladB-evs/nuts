import {
  Issue,
  Environment,
  DevScope,
  MarketingChannel,
  DeliverableType,
  DealSegment,
  DealStage,
  OpsCategory,
  ImpactLevel,
} from '../types';

export type DepartmentRuleKind = 'engineering' | 'marketing' | 'sales' | 'operations' | 'general';

export const getDepartmentRuleKind = (departmentId: string): DepartmentRuleKind => {
  if (departmentId === 'engineering' || departmentId === 'product') {
    return 'engineering';
  }
  if (departmentId === 'marketing') {
    return 'marketing';
  }
  if (departmentId === 'sales') {
    return 'sales';
  }
  if (departmentId === 'operations') {
    return 'operations';
  }
  return 'general';
};

// Engineering Options
export const ENVIRONMENTS: Environment[] = ['LOCAL', 'STAGING', 'PROD'];

// Marketing Options
export const MARKETING_CHANNELS: MarketingChannel[] = [
  'Product Launch',
  'Social Media',
  'Content & SEO',
  'Email & Newsletter',
  'Paid Ads',
  'Brand & Design',
];

export const DELIVERABLE_TYPES: DeliverableType[] = [
  'Copy & Blog',
  'Graphics & Assets',
  'Video & Motion',
  'Landing Page',
  'Campaign Plan',
];

// Sales Options
export const DEAL_SEGMENTS: DealSegment[] = [
  'Enterprise',
  'Mid-Market',
  'SMB / Startup',
  'Strategic Partner',
];

export const DEAL_STAGES: DealStage[] = [
  'Lead / Prospect',
  'Discovery & Demo',
  'Proposal & Pricing',
  'Contract Negotiation',
  'Closed-Won Review',
];

// Operations Options
export const OPS_CATEGORIES: OpsCategory[] = [
  'IT & Access',
  'Finance & Billing',
  'Legal & Contracts',
  'People & HR',
  'Office & Facilities',
  'Security & Compliance',
];

export const IMPACT_LEVELS: ImpactLevel[] = [
  'Company-wide',
  'Team-specific',
  'Individual',
];

export interface BadgeInfo {
  label: string;
  badgeClass: string;
  tooltip?: string;
  type: string;
}

export const getDepartmentBadges = (issue: Issue): BadgeInfo[] => {
  const kind = getDepartmentRuleKind(issue.departmentId);
  const badges: BadgeInfo[] = [];

  if (kind === 'engineering') {
    if (issue.environment) {
      const colorClass =
        issue.environment === 'PROD'
          ? 'text-purple-800 bg-purple-50 border-purple-200'
          : issue.environment === 'STAGING'
          ? 'text-amber-800 bg-amber-50 border-amber-200'
          : 'text-gray-700 bg-gray-100 border-gray-200';
      badges.push({
        label: issue.environment,
        badgeClass: colorClass,
        tooltip: `Environment: ${issue.environment}`,
        type: 'env',
      });
    }
    if (issue.devScope) {
      const scopeLabel =
        issue.devScope === 'both' ? 'FE+BE' : issue.devScope === 'frontend' ? 'FE' : 'BE';
      const colorClass =
        issue.devScope === 'frontend'
          ? 'text-blue-700 bg-blue-50 border-blue-200'
          : issue.devScope === 'backend'
          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
          : 'text-gray-700 bg-gray-100 border-gray-200';
      badges.push({
        label: scopeLabel,
        badgeClass: colorClass,
        tooltip: `Layer: ${issue.devScope === 'both' ? 'Frontend + Backend' : issue.devScope}`,
        type: 'scope',
      });
    }
  } else if (kind === 'marketing') {
    if (issue.marketingChannel) {
      badges.push({
        label: issue.marketingChannel,
        badgeClass: 'text-rose-700 bg-rose-50 border-rose-200 font-medium',
        tooltip: `Channel: ${issue.marketingChannel}`,
        type: 'channel',
      });
    }
    if (issue.deliverableType) {
      badges.push({
        label: issue.deliverableType,
        badgeClass: 'text-amber-800 bg-amber-50 border-amber-200 font-medium',
        tooltip: `Deliverable: ${issue.deliverableType}`,
        type: 'deliverable',
      });
    }
  } else if (kind === 'sales') {
    if (issue.dealSegment) {
      badges.push({
        label: issue.dealSegment,
        badgeClass: 'text-indigo-800 bg-indigo-50 border-indigo-200 font-medium',
        tooltip: `Segment: ${issue.dealSegment}`,
        type: 'segment',
      });
    }
    if (issue.dealStage) {
      badges.push({
        label: issue.dealStage,
        badgeClass: 'text-cyan-800 bg-cyan-50 border-cyan-200 font-medium',
        tooltip: `Stage: ${issue.dealStage}`,
        type: 'stage',
      });
    }
  } else if (kind === 'operations') {
    if (issue.opsCategory) {
      badges.push({
        label: issue.opsCategory,
        badgeClass: 'text-teal-800 bg-teal-50 border-teal-200 font-medium',
        tooltip: `Category: ${issue.opsCategory}`,
        type: 'opsCategory',
      });
    }
    if (issue.impactLevel) {
      badges.push({
        label: issue.impactLevel,
        badgeClass: 'text-stone-700 bg-stone-100 border-stone-200 font-medium',
        tooltip: `Impact: ${issue.impactLevel}`,
        type: 'impact',
      });
    }
  }

  return badges;
};
