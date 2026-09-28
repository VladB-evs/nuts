import React from 'react';
import { useTickets } from '../../context/TicketContext';
import { getDepartmentIcon } from '../common/DepartmentBadge';
import { Avatar } from '../common/Avatar';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Layers,
  Users,
  Target,
  BarChart,
} from 'lucide-react';

export const MetricsView: React.FC = () => {
  const { tickets, departments, users, selectedDepartment } = useTickets();

  const deptTickets =
    selectedDepartment === 'all'
      ? tickets
      : tickets.filter((t) => t.departmentId === selectedDepartment);

  const total = deptTickets.length;
  const doneCount = deptTickets.filter((t) => t.status === 'done').length;
  const inProgressCount = deptTickets.filter((t) => t.status === 'in_progress').length;
  const inReviewCount = deptTickets.filter((t) => t.status === 'in_review').length;
  const criticalCount = deptTickets.filter((t) => t.priority === 'critical').length;
  const highCount = deptTickets.filter((t) => t.priority === 'high').length;

  const completionRate = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tickets */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider">Total Volume</span>
            <Layers className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white">{total}</span>
            <span className="text-xs text-zinc-400 font-mono">tickets</span>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider">Resolution Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-emerald-400">
              {completionRate}%
            </span>
            <span className="text-xs text-zinc-400 font-mono">({doneCount} resolved)</span>
          </div>
        </div>

        {/* Active Work In Flight */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider">In Flight</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-amber-400">
              {inProgressCount + inReviewCount}
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              ({inProgressCount} active / {inReviewCount} review)
            </span>
          </div>
        </div>

        {/* Critical Blockers */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase tracking-wider">Critical P0</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-rose-400">
              {criticalCount}
            </span>
            <span className="text-xs text-zinc-400 font-mono">blockers</span>
          </div>
        </div>
      </div>

      {/* Department Breakdown & Priority Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Workload Breakdown */}
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
              <BarChart className="w-4 h-4 text-zinc-400" />
              Department Workload Distribution
            </h3>
            <span className="text-xs font-mono text-zinc-400">{tickets.length} total</span>
          </div>

          <div className="space-y-3">
            {departments.map((dept) => {
              const count = tickets.filter((t) => t.departmentId === dept.id).length;
              const percent = tickets.length > 0 ? Math.round((count / tickets.length) * 100) : 0;

              return (
                <div key={dept.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: dept.color }}
                      />
                      <span className="text-zinc-200">{dept.name}</span>
                      <span className="text-zinc-400">[{dept.code}]</span>
                    </div>
                    <span className="text-zinc-400">
                      {count} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-850">
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

        {/* Priority Matrix */}
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
              <Target className="w-4 h-4 text-zinc-400" />
              Priority Severity Matrix
            </h3>
            <span className="text-xs font-mono text-zinc-400">SLA Readiness</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-lg border border-rose-950/60 bg-rose-950/20">
              <span className="text-[11px] font-mono text-rose-400 uppercase tracking-wider font-semibold">
                Critical (P0)
              </span>
              <p className="text-2xl font-bold font-mono text-white mt-1">{criticalCount}</p>
              <p className="text-[10px] text-zinc-400 mt-1 font-mono">Immediate blocker resolution</p>
            </div>

            <div className="p-3.5 rounded-lg border border-amber-950/60 bg-amber-950/20">
              <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider font-semibold">
                High (P1)
              </span>
              <p className="text-2xl font-bold font-mono text-white mt-1">{highCount}</p>
              <p className="text-[10px] text-zinc-400 mt-1 font-mono">Current sprint priority</p>
            </div>

            <div className="p-3.5 rounded-lg border border-sky-950/60 bg-sky-950/20">
              <span className="text-[11px] font-mono text-sky-400 uppercase tracking-wider font-semibold">
                Medium (P2)
              </span>
              <p className="text-2xl font-bold font-mono text-white mt-1">
                {deptTickets.filter((t) => t.priority === 'medium').length}
              </p>
              <p className="text-[10px] text-zinc-400 mt-1 font-mono">Standard roadmap queue</p>
            </div>

            <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/40">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                Low (P3)
              </span>
              <p className="text-2xl font-bold font-mono text-white mt-1">
                {deptTickets.filter((t) => t.priority === 'low').length}
              </p>
              <p className="text-[10px] text-zinc-400 mt-1 font-mono">Backlog / opportunistic</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Member Workload */}
      <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-4">
        <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
          <Users className="w-4 h-4 text-zinc-400" />
          Team Allocation & Active Tickets
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {users.map((user) => {
            const userTickets = tickets.filter((t) => t.assignee?.id === user.id);
            const userDone = userTickets.filter((t) => t.status === 'done').length;
            const userActive = userTickets.filter((t) => t.status !== 'done').length;
            const dept = departments.find((d) => d.id === user.departmentId);

            return (
              <div
                key={user.id}
                className="p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar user={user} size="sm" />
                  <div className="truncate">
                    <p className="text-xs font-medium text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-zinc-400 font-mono truncate">{user.role}</p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 font-mono text-xs">
                  <span className="font-semibold text-white">{userActive}</span>
                  <span className="text-zinc-400 text-[10px]"> active</span>
                  {userDone > 0 && (
                    <span className="block text-[10px] text-emerald-400">
                      {userDone} done
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
