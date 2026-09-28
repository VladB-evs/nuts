import React, { useState } from 'react';
import { useTickets } from '../../context/TicketContext';
import { Priority, TicketType } from '../../types';
import { getDepartmentIcon } from '../common/DepartmentBadge';
import { StatusBadge } from '../common/StatusBadge';
import { SlaBadge } from '../common/SlaBadge';
import { formatDateTime } from '../../lib/utils';
import {
  Send,
  HelpCircle,
  Code2,
  Megaphone,
  TrendingUp,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const ServicePortalView: React.FC = () => {
  const {
    departments,
    currentUser,
    tickets,
    createTicket,
    setSelectedTicket,
    setActiveView,
  } = useTickets();

  const [selectedTargetDept, setSelectedTargetDept] = useState('engineering');
  const [ticketType, setTicketType] = useState<TicketType>('incident');
  const [priority, setPriority] = useState<Priority>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Tickets submitted by the current user
  const mySubmittedTickets = tickets.filter(
    (t) => t.reporter.id === currentUser.id
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createTicket({
      title: title.trim(),
      description: description.trim(),
      departmentId: selectedTargetDept,
      requesterDepartmentId: currentUser.departmentId,
      type: ticketType,
      priority,
      status: 'new', // Enters the target department's triage queue!
    });

    setTitle('');
    setDescription('');
    setSubmittedSuccess(true);
    setTimeout(() => setSubmittedSuccess(false), 4000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 space-y-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-white" />
          <h1 className="font-mono text-lg font-bold text-white tracking-wide">
            NUTS Employee Service Desk Portal
          </h1>
        </div>
        <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
          Need assistance or work completed by another department? Submit an internal service
          ticket below. It will be routed directly to the target team's triage queue with SLA
          tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Submit Form */}
        <div className="lg:col-span-2 space-y-5">
          <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950 space-y-5">
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-white">
              Submit a New Request
            </h2>

            {submittedSuccess && (
              <div className="p-4 rounded-xl border border-emerald-800/60 bg-emerald-950/30 text-emerald-300 text-xs font-mono flex items-center gap-2.5 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  Ticket submitted successfully! Routed to the destination team's triage queue.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Target Department Selection Cards */}
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-2">
                  Which department do you need help from? *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {departments.map((dept) => {
                    const isSelected = selectedTargetDept === dept.id;
                    return (
                      <button
                        type="button"
                        key={dept.id}
                        onClick={() => setSelectedTargetDept(dept.id)}
                        className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                          isSelected
                            ? 'bg-zinc-900 border-white text-white shadow-md'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: dept.color }}
                          />
                          <span className="font-mono text-xs font-semibold text-zinc-200">
                            {dept.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">
                          Prefix: {dept.code}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Request Type & Urgency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                    Request Category *
                  </label>
                  <select
                    value={ticketType}
                    onChange={(e) => setTicketType(e.target.value as TicketType)}
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-750 rounded-lg text-white font-mono focus:outline-none cursor-pointer"
                  >
                    <option value="incident">Incident / Urgent Bug</option>
                    <option value="service_request">Standard Service Request</option>
                    <option value="feature">Feature Proposal</option>
                    <option value="question">Question / Guidance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                    Urgency / Impact *
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-750 rounded-lg text-white font-mono focus:outline-none cursor-pointer"
                  >
                    <option value="low">Low (Standard backlog queue)</option>
                    <option value="medium">Medium (Regular turnaround ~48h)</option>
                    <option value="high">High (High priority ~24h SLA)</option>
                    <option value="critical">Critical (Blocker ~4h SLA)</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                  Subject / Summary *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Clear, specific title of what you need..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-750 rounded-lg text-white font-sans focus:outline-none focus:border-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                  Detailed Explanation & Context *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide any links, error messages, account names, or deadlines..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-750 rounded-lg text-white font-mono focus:outline-none focus:border-white leading-relaxed"
                />
              </div>

              {/* Submitter info notice */}
              <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <span>
                  Filing as: <strong className="text-zinc-300">{currentUser.name}</strong> (
                  {currentUser.role})
                </span>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-mono font-medium bg-white text-black hover:bg-zinc-200 rounded-lg transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 1 Col: Track My Submitted Requests */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950 space-y-3">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
              My Submitted Requests ({mySubmittedTickets.length})
            </h3>
            <p className="text-[11px] text-zinc-400">
              Tickets you've filed across engineering, marketing, sales, and operations.
            </p>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto no-scrollbar pt-2">
              {mySubmittedTickets.length > 0 ? (
                mySubmittedTickets.map((t) => {
                  const targetDept = departments.find((d) => d.id === t.departmentId);

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTicket(t);
                        setActiveView('console');
                      }}
                      className="p-3 rounded-xl border border-zinc-800 hover:border-zinc-650 bg-zinc-900/40 hover:bg-zinc-900 cursor-pointer transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-white">{t.code}</span>
                        <StatusBadge status={t.status} size="sm" />
                      </div>
                      <p className="text-xs font-medium text-zinc-200 line-clamp-1">{t.title}</p>
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1">
                        <span>Assigned to: {targetDept?.name}</span>
                        <span>{formatDateTime(t.createdAt)}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs font-mono text-zinc-500">
                  You haven't submitted any tickets yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
