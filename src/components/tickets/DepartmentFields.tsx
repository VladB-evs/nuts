import React from 'react';
import { TicketCustomFields } from '../../types';
import {
  GitBranch,
  GitPullRequest,
  Server,
  Share2,
  DollarSign,
  Palette,
  Briefcase,
  ExternalLink,
} from 'lucide-react';

interface DepartmentFieldsProps {
  departmentId: string;
  customFields?: TicketCustomFields;
  isEditing?: boolean;
  onChange?: (fields: TicketCustomFields) => void;
}

export const DepartmentFields: React.FC<DepartmentFieldsProps> = ({
  departmentId,
  customFields = {},
  isEditing = false,
  onChange,
}) => {
  // 1. Engineering Fields
  if (departmentId === 'engineering') {
    const eng = customFields.engineering || {};

    if (!isEditing) {
      if (!eng.issueType && !eng.gitBranch && !eng.prUrl && !eng.targetEnv) {
        return null;
      }

      return (
        <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 space-y-2">
          <p className="text-[11px] font-mono uppercase tracking-wider text-blue-400 flex items-center gap-1.5 font-medium">
            <Server className="w-3.5 h-3.5" />
            Engineering Details
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            {eng.issueType && (
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="text-zinc-500">Type:</span>
                <span className="capitalize px-1.5 py-0.5 rounded bg-blue-950/40 text-blue-400 border border-blue-800/40">
                  {eng.issueType.replace('_', ' ')}
                </span>
              </div>
            )}
            {eng.targetEnv && (
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="text-zinc-500">Env:</span>
                <span className="uppercase text-zinc-200">{eng.targetEnv}</span>
              </div>
            )}
            {eng.gitBranch && (
              <div className="flex items-center gap-2 text-zinc-300 col-span-2">
                <GitBranch className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                <code className="text-zinc-200 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 text-[11px]">
                  {eng.gitBranch}
                </code>
              </div>
            )}
            {eng.prUrl && (
              <div className="flex items-center gap-2 text-zinc-300 col-span-2">
                <GitPullRequest className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                <a
                  href={eng.prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-400 hover:underline inline-flex items-center gap-1 text-[11px] truncate"
                >
                  {eng.prUrl}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/30 space-y-3">
        <p className="text-[11px] font-mono uppercase tracking-wider text-blue-400 flex items-center gap-1.5 font-medium">
          <Server className="w-3.5 h-3.5" />
          Engineering Fields
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">Issue Type</label>
            <select
              value={eng.issueType || 'feature'}
              onChange={(e) =>
                onChange?.({
                  ...customFields,
                  engineering: { ...eng, issueType: e.target.value as any },
                })
              }
              className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200 font-mono"
            >
              <option value="feature">Feature</option>
              <option value="bug">Bug</option>
              <option value="refactor">Refactor</option>
              <option value="tech_debt">Tech Debt</option>
              <option value="security">Security</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">Target Environment</label>
            <select
              value={eng.targetEnv || 'production'}
              onChange={(e) =>
                onChange?.({
                  ...customFields,
                  engineering: { ...eng, targetEnv: e.target.value as any },
                })
              }
              className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200 font-mono"
            >
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1">Git Branch</label>
          <input
            type="text"
            placeholder="e.g. feat/unified-tickets"
            value={eng.gitBranch || ''}
            onChange={(e) =>
              onChange?.({
                ...customFields,
                engineering: { ...eng, gitBranch: e.target.value },
              })
            }
            className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200 font-mono"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1">Pull Request URL</label>
          <input
            type="url"
            placeholder="https://github.com/org/repo/pull/123"
            value={eng.prUrl || ''}
            onChange={(e) =>
              onChange?.({
                ...customFields,
                engineering: { ...eng, prUrl: e.target.value },
              })
            }
            className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200 font-mono"
          />
        </div>
      </div>
    );
  }

  // 2. Marketing Fields
  if (departmentId === 'marketing') {
    const mkt = customFields.marketing || {};

    if (!isEditing) {
      if (!mkt.campaign && !mkt.channel && !mkt.targetAudience && !mkt.deliverableUrl) {
        return null;
      }

      return (
        <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 space-y-2">
          <p className="text-[11px] font-mono uppercase tracking-wider text-purple-400 flex items-center gap-1.5 font-medium">
            <Share2 className="w-3.5 h-3.5" />
            Marketing & Growth Details
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            {mkt.campaign && (
              <div className="text-zinc-300">
                <span className="text-zinc-500">Campaign: </span>
                <span className="text-white font-medium">{mkt.campaign}</span>
              </div>
            )}
            {mkt.channel && (
              <div className="text-zinc-300">
                <span className="text-zinc-500">Channel: </span>
                <span className="uppercase text-purple-400">{mkt.channel}</span>
              </div>
            )}
            {mkt.targetAudience && (
              <div className="text-zinc-300 col-span-2">
                <span className="text-zinc-500">Audience: </span>
                <span>{mkt.targetAudience}</span>
              </div>
            )}
            {mkt.deliverableUrl && (
              <div className="col-span-2">
                <a
                  href={mkt.deliverableUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-400 hover:underline inline-flex items-center gap-1 text-[11px] truncate"
                >
                  Deliverable Assets Link
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/30 space-y-3">
        <p className="text-[11px] font-mono uppercase tracking-wider text-purple-400 flex items-center gap-1.5 font-medium">
          <Share2 className="w-3.5 h-3.5" />
          Marketing Fields
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">Campaign Name</label>
            <input
              type="text"
              placeholder="e.g. Q4 Launch"
              value={mkt.campaign || ''}
              onChange={(e) =>
                onChange?.({
                  ...customFields,
                  marketing: { ...mkt, campaign: e.target.value },
                })
              }
              className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">Channel</label>
            <select
              value={mkt.channel || 'social'}
              onChange={(e) =>
                onChange?.({
                  ...customFields,
                  marketing: { ...mkt, channel: e.target.value as any },
                })
              }
              className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200 font-mono"
            >
              <option value="social">Social Media</option>
              <option value="email">Email / Newsletter</option>
              <option value="content">Blog / Content</option>
              <option value="ads">Paid Ads</option>
              <option value="seo">SEO</option>
              <option value="event">Event / Webinar</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1">Target Audience</label>
          <input
            type="text"
            placeholder="e.g. Early-stage Founders, CTOs"
            value={mkt.targetAudience || ''}
            onChange={(e) =>
              onChange?.({
                ...customFields,
                marketing: { ...mkt, targetAudience: e.target.value },
              })
            }
            className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1">Asset Deliverable URL</label>
          <input
            type="url"
            placeholder="https://drive.google.com/... or Figma link"
            value={mkt.deliverableUrl || ''}
            onChange={(e) =>
              onChange?.({
                ...customFields,
                marketing: { ...mkt, deliverableUrl: e.target.value },
              })
            }
            className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200 font-mono"
          />
        </div>
      </div>
    );
  }

  // 3. Sales Fields
  if (departmentId === 'sales') {
    const sls = customFields.sales || {};

    if (!isEditing) {
      if (!sls.clientName && !sls.dealValue && !sls.dealStage && !sls.slaHours) {
        return null;
      }

      return (
        <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 space-y-2">
          <p className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 font-medium">
            <DollarSign className="w-3.5 h-3.5" />
            Deal & Customer Success Details
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            {sls.clientName && (
              <div className="text-zinc-300">
                <span className="text-zinc-500">Account: </span>
                <span className="text-white font-medium">{sls.clientName}</span>
              </div>
            )}
            {sls.dealValue !== undefined && (
              <div className="text-zinc-300">
                <span className="text-zinc-500">Value: </span>
                <span className="text-emerald-400 font-bold">
                  ${sls.dealValue.toLocaleString()}
                </span>
              </div>
            )}
            {sls.dealStage && (
              <div className="text-zinc-300">
                <span className="text-zinc-500">Stage: </span>
                <span className="uppercase text-cyan-400">{sls.dealStage}</span>
              </div>
            )}
            {sls.slaHours && (
              <div className="text-zinc-300">
                <span className="text-zinc-500">SLA: </span>
                <span className="text-amber-400 font-bold">{sls.slaHours}h target</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/30 space-y-3">
        <p className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 font-medium">
          <DollarSign className="w-3.5 h-3.5" />
          Sales & Client Fields
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">Client / Account</label>
            <input
              type="text"
              placeholder="e.g. Acme Inc."
              value={sls.clientName || ''}
              onChange={(e) =>
                onChange?.({
                  ...customFields,
                  sales: { ...sls, clientName: e.target.value },
                })
              }
              className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">Deal Value ($)</label>
            <input
              type="number"
              placeholder="e.g. 50000"
              value={sls.dealValue || ''}
              onChange={(e) =>
                onChange?.({
                  ...customFields,
                  sales: { ...sls, dealValue: Number(e.target.value) },
                })
              }
              className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">Deal Stage</label>
            <select
              value={sls.dealStage || 'lead'}
              onChange={(e) =>
                onChange?.({
                  ...customFields,
                  sales: { ...sls, dealStage: e.target.value as any },
                })
              }
              className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200 font-mono"
            >
              <option value="lead">Lead</option>
              <option value="discovery">Discovery</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
              <option value="closing">Closing</option>
              <option value="retention">Retention</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">SLA Target (Hours)</label>
            <input
              type="number"
              placeholder="e.g. 24"
              value={sls.slaHours || ''}
              onChange={(e) =>
                onChange?.({
                  ...customFields,
                  sales: { ...sls, slaHours: Number(e.target.value) },
                })
              }
              className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200 font-mono"
            />
          </div>
        </div>
      </div>
    );
  }

  // 4. Product Fields
  if (departmentId === 'product') {
    const prd = customFields.product || {};

    if (!isEditing) {
      if (!prd.figmaUrl && !prd.userStory && !prd.milestone) return null;

      return (
        <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 space-y-2">
          <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-medium">
            <Palette className="w-3.5 h-3.5" />
            Product & Design Specs
          </p>
          <div className="space-y-1.5 text-xs font-mono">
            {prd.milestone && (
              <div className="text-zinc-300">
                <span className="text-zinc-500">Milestone: </span>
                <span className="text-white font-medium">{prd.milestone}</span>
              </div>
            )}
            {prd.userStory && (
              <div className="text-zinc-300">
                <span className="text-zinc-500">User Story: </span>
                <span className="italic text-zinc-200">"{prd.userStory}"</span>
              </div>
            )}
            {prd.figmaUrl && (
              <div>
                <a
                  href={prd.figmaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline inline-flex items-center gap-1 text-[11px]"
                >
                  Figma File Spec
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/30 space-y-3">
        <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-medium">
          <Palette className="w-3.5 h-3.5" />
          Product Specs
        </p>

        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1">Milestone</label>
          <input
            type="text"
            placeholder="e.g. Q4 MVP Release"
            value={prd.milestone || ''}
            onChange={(e) =>
              onChange?.({
                ...customFields,
                product: { ...prd, milestone: e.target.value },
              })
            }
            className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1">User Story</label>
          <input
            type="text"
            placeholder="As a [role], I want [feature], so that [benefit]"
            value={prd.userStory || ''}
            onChange={(e) =>
              onChange?.({
                ...customFields,
                product: { ...prd, userStory: e.target.value },
              })
            }
            className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1">Figma Design URL</label>
          <input
            type="url"
            placeholder="https://figma.com/file/..."
            value={prd.figmaUrl || ''}
            onChange={(e) =>
              onChange?.({
                ...customFields,
                product: { ...prd, figmaUrl: e.target.value },
              })
            }
            className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200 font-mono"
          />
        </div>
      </div>
    );
  }

  // 5. Operations Fields
  if (departmentId === 'operations') {
    const ops = customFields.ops || {};

    if (!isEditing) {
      if (!ops.category && !ops.budget) return null;

      return (
        <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 space-y-2">
          <p className="text-[11px] font-mono uppercase tracking-wider text-rose-400 flex items-center gap-1.5 font-medium">
            <Briefcase className="w-3.5 h-3.5" />
            Operations & Admin Details
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {ops.category && (
              <div className="text-zinc-300">
                <span className="text-zinc-500">Category: </span>
                <span className="capitalize text-white">{ops.category}</span>
              </div>
            )}
            {ops.budget !== undefined && (
              <div className="text-zinc-300">
                <span className="text-zinc-500">Budget: </span>
                <span className="text-rose-400 font-bold">${ops.budget.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/30 space-y-3">
        <p className="text-[11px] font-mono uppercase tracking-wider text-rose-400 flex items-center gap-1.5 font-medium">
          <Briefcase className="w-3.5 h-3.5" />
          Operations Fields
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">Category</label>
            <select
              value={ops.category || 'hardware'}
              onChange={(e) =>
                onChange?.({
                  ...customFields,
                  ops: { ...ops, category: e.target.value as any },
                })
              }
              className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200 font-mono"
            >
              <option value="hardware">Hardware</option>
              <option value="finance">Finance</option>
              <option value="legal">Legal</option>
              <option value="facilities">Facilities</option>
              <option value="onboarding">Onboarding</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">Budget Allocation ($)</label>
            <input
              type="number"
              placeholder="e.g. 2500"
              value={ops.budget || ''}
              onChange={(e) =>
                onChange?.({
                  ...customFields,
                  ops: { ...ops, budget: Number(e.target.value) },
                })
              }
              className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200 font-mono"
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
};
