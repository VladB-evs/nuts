import React, { useMemo } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { useIssues } from '../context/TicketContext';
import { buildReport, issuesToCsv } from '../lib/reports';
import { formatDuration, STATUS_META } from '../lib/timelineUtils';
import { ALL_STATUSES } from '../lib/workflow';
import type { Priority } from '../types';

const Tile: React.FC<{ label: string; value: React.ReactNode; hint?: string; tone?: string }> = ({ label, value, hint, tone = '' }) => (
  <div className="p-3 rounded-lg border border-gray-200 bg-white shadow-2xs">
    <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">{label}</p>
    <p className={`mt-1 text-xl font-bold text-gray-900 ${tone}`}>{value}</p>
    {hint && <p className="text-[10px] text-gray-400 font-mono mt-0.5">{hint}</p>}
  </div>
);

const Bar: React.FC<{ label: string; value: number; max: number; className: string }> = ({ label, value, max, className }) => (
  <div className="flex items-center gap-2 text-[11px]">
    <span className="w-24 shrink-0 font-mono text-gray-600 truncate">{label}</span>
    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
    </div>
    <span className="w-7 text-right font-mono text-gray-700">{value}</span>
  </div>
);

const PRIORITY_BAR: Record<Priority, string> = {
  P0: 'bg-red-500', P1: 'bg-amber-500', P2: 'bg-blue-500', P3: 'bg-gray-400',
};

/** Workspace health at a glance, from the tickets already loaded. Admin-only (rendered inside the admin dashboard). */
export const AdminReports: React.FC = () => {
  const { issues, departments, showToast } = useIssues();
  const report = useMemo(() => buildReport(issues, departments), [issues, departments]);

  const maxStatus = Math.max(1, ...Object.values(report.byStatus));
  const maxPriority = Math.max(1, ...Object.values(report.openByPriority));
  const maxDaily = Math.max(1, ...report.daily.flatMap((d) => [d.created, d.resolved]));

  const exportCsv = () => {
    const blob = new Blob([issuesToCsv(issues, departments)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nuts-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast({ type: 'success', title: 'Export ready', message: `${issues.length} tickets exported.` });
  };

  return (
    <section className="bg-white border border-gray-200 rounded-lg shadow-2xs overflow-hidden" aria-label="Reports">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
        <span className="font-semibold text-gray-900 text-xs flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-gray-500" /> Reports
        </span>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 text-[11px] font-medium cursor-pointer"
        >
          <Download className="w-3 h-3" /> Export tickets (CSV)
        </button>
      </div>

      <div className="p-4 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
          <Tile label="Open tickets" value={report.open} hint={`${report.total} in total`} />
          <Tile label="Stalled" value={report.stalled} tone={report.stalled ? 'text-amber-600' : ''} hint="over their stage SLA" />
          <Tile label="SLA paused" value={report.paused} hint="waiting (pending)" />
          <Tile label="Resolved, 30 days" value={report.resolvedLast30Days} />
          <Tile label="Avg. resolution" value={report.avgLeadTimeMs ? formatDuration(report.avgLeadTimeMs) : '—'} hint="creation to done" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-gray-500 font-semibold">By status</h4>
            {ALL_STATUSES.map((st) => (
              <Bar key={st} label={st} value={report.byStatus[st]} max={maxStatus} className={STATUS_META[st].barColor} />
            ))}
          </div>
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-gray-500 font-semibold">Open tickets by priority</h4>
            {(['P0', 'P1', 'P2', 'P3'] as Priority[]).map((p) => (
              <Bar key={p} label={p} value={report.openByPriority[p]} max={maxPriority} className={PRIORITY_BAR[p]} />
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-3">
            Last {report.daily.length} days
            <span className="inline-flex items-center gap-1 normal-case tracking-normal text-gray-500"><i className="w-2 h-2 rounded-sm bg-blue-500 inline-block" /> created</span>
            <span className="inline-flex items-center gap-1 normal-case tracking-normal text-gray-500"><i className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" /> resolved</span>
          </h4>
          <div className="flex items-end gap-1 h-24" role="img" aria-label="Tickets created and resolved per day">
            {report.daily.map((d) => (
              <div key={d.date} className="flex-1 flex items-end justify-center gap-0.5 h-full" title={`${d.date}: ${d.created} created, ${d.resolved} resolved`}>
                <div className="w-1/2 bg-blue-500 rounded-t-sm" style={{ height: `${(d.created / maxDaily) * 100}%`, minHeight: d.created ? 2 : 0 }} />
                <div className="w-1/2 bg-emerald-500 rounded-t-sm" style={{ height: `${(d.resolved / maxDaily) * 100}%`, minHeight: d.resolved ? 2 : 0 }} />
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-mono text-[11px]">
                <th className="py-1.5 pr-3">DEPARTMENT</th>
                <th className="py-1.5 px-3 text-right">OPEN</th>
                <th className="py-1.5 px-3 text-right">CLOSED</th>
                <th className="py-1.5 px-3 text-right">STALLED</th>
                <th className="py-1.5 pl-3 text-right">AVG. RESOLUTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.perDepartment.map((r) => (
                <tr key={r.departmentId}>
                  <td className="py-1.5 pr-3 font-medium text-gray-900">
                    {r.name} <span className="font-mono text-[10px] text-gray-400">[{r.code}]</span>
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">{r.open}</td>
                  <td className="py-1.5 px-3 text-right font-mono">{r.closed}</td>
                  <td className={`py-1.5 px-3 text-right font-mono ${r.stalled ? 'text-amber-600 font-semibold' : ''}`}>{r.stalled}</td>
                  <td className="py-1.5 pl-3 text-right font-mono">{r.avgLeadTimeMs ? formatDuration(r.avgLeadTimeMs) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
