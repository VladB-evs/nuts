import React from 'react';
import { useTickets } from '../../context/TicketContext';
import { Avatar } from '../common/Avatar';
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  Layers,
  Users,
  Timer,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

export const MetricsView: React.FC = () => {
  const { tickets, departments, users, selectedDepartment, metrics } = useTickets();

  const deptTickets =
    selectedDepartment === 'all'
      ? tickets
      : tickets.filter((t) => t.departmentId === selectedDepartment);

  const total = deptTickets.length;
  const resolvedCount = deptTickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
  const activeCount = total - resolvedCount;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div>
          <h2 className="text-base font-mono font-bold text-white uppercase tracking-wider">
            SLA & Service Desk Performance
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Operational turnaround times, queue volumes, and team SLA compliance metrics
          </p>
        </div>
      </div>

      {/* Top SLA KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* SLA Compliance */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">SLA Compliance</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-emerald-400">
              {metrics.slaComplianceRate}%
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">target: 95%</span>
          </div>
        </div>

        {/* SLA Breached Count */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">SLA Breached</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-3xl font-bold font-mono ${
                metrics.slaBreached > 0 ? 'text-rose-400' : 'text-zinc-200'
              }`}
            >
              {metrics.slaBreached}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">tickets</span>
          </div>
        </div>

        {/* Avg First Response Time */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Avg Response</span>
            <Timer className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white">28m</span>
            <span className="text-[11px] text-zinc-500 font-mono">to first reply</span>
          </div>
        </div>

        {/* Active Backlog */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Active Queue</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-amber-400">{activeCount}</span>
            <span className="text-[11px] text-zinc-500 font-mono">({resolvedCount} resolved)</span>
          </div>
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Volume by Department */}
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
              Service Queue Distribution
            </h3>
            <span className="text-xs font-mono text-zinc-500">{total} tickets</span>
          </div>

          <div className="space-y-3">
            {departments.map((dept) => {
              const count = tickets.filter((t) => t.departmentId === dept.id).length;
              const percent = total > 0 ? Math.round((count / total) * 100) : 0;

              return (
                <div key={dept.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: dept.color }}
                      />
                      <span className="text-zinc-200">{dept.name}</span>
                      <span className="text-zinc-500">[{dept.code}]</span>
                    </div>
                    <span className="text-zinc-400">{count} tickets</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: dept.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inbound Ticket Flow by Requester Department */}
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
              Inbound Requests by Submitter Team
            </h3>
            <span className="text-xs font-mono text-zinc-500">Cross-Team Flow</span>
          </div>

          <div className="space-y-3">
            {departments.map((dept) => {
              const submittedByDept = tickets.filter(
                (t) => t.requesterDepartmentId === dept.id
              ).length;
              const percent =
                tickets.length > 0
                  ? Math.round((submittedByDept / tickets.length) * 100)
                  : 0;

              return (
                <div key={dept.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: dept.color }}
                      />
                      <span className="text-zinc-200">{dept.name} Requesters</span>
                    </div>
                    <span className="text-zinc-400">
                      {submittedByDept} filed ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: dept.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team Member Load & Performance */}
      <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950 space-y-4">
        <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-zinc-400" />
          Agent Allocation & Resolution Velocity
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {users.map((user) => {
            const userTickets = tickets.filter((t) => t.assignee?.id === user.id);
            const userDone = userTickets.filter(
              (t) => t.status === 'resolved' || t.status === 'closed'
            ).length;
            const userActive = userTickets.filter(
              (t) => t.status !== 'resolved' && t.status !== 'closed'
            ).length;

            return (
              <div
                key={user.id}
                className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar user={user} size="sm" />
                  <div className="truncate">
                    <p className="text-xs font-medium text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-zinc-500 font-mono truncate">{user.role}</p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 font-mono text-xs">
                  <span className="font-bold text-white">{userActive}</span>
                  <span className="text-zinc-500 text-[10px]"> active</span>
                  {userDone > 0 && (
                    <span className="block text-[10px] text-emerald-400 font-semibold">
                      {userDone} resolved
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
