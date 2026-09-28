import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  Database,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  FileCode,
  Terminal,
  Globe,
} from 'lucide-react';

interface SupabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseGuideModal: React.FC<SupabaseGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const isConfigured = isSupabaseConfigured();

  const migrationFilePath = 'supabase/migrations/20260928000000_init_nuts_schema.sql';

  const copyMigrationPath = () => {
    navigator.clipboard.writeText(migrationFilePath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-white" />
          <span className="font-mono text-base font-bold text-white">
            Backend & Supabase Architecture
          </span>
        </div>
      }
      description="Production roadmap, SQL migrations, and Netlify deployment instructions"
      maxWidth="3xl"
    >
      <div className="space-y-6 text-xs text-zinc-300">
        {/* Status Banner */}
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            isConfigured
              ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
              : 'bg-zinc-900/60 border-zinc-800 text-zinc-200'
          }`}
        >
          {isConfigured ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-mono text-zinc-400 flex-shrink-0 mt-0.5">
              ⚡
            </div>
          )}
          <div>
            <p className="font-mono font-semibold text-sm text-white">
              {isConfigured
                ? 'Supabase Backend Connected'
                : 'Current Phase: Interactive UI Prototyping Mode'}
            </p>
            <p className="text-zinc-400 mt-1 leading-relaxed">
              {isConfigured
                ? 'Live data synchronization with your Supabase PostgreSQL instance and Auth is enabled.'
                : 'All features, drag-and-drop, department filtering, comments, and task checklists are fully reactive and automatically persisted to LocalStorage. When you are ready to switch to live Supabase backend, follow the steps below.'}
            </p>
          </div>
        </div>

        {/* Migration File Reference */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono">
              <FileCode className="w-4 h-4 text-purple-400" />
              <span className="font-semibold text-white">Migration File Created</span>
            </div>
            <button
              onClick={copyMigrationPath}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[11px] transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Path Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy File Path</span>
                </>
              )}
            </button>
          </div>

          <code className="block p-2.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-zinc-300 overflow-x-auto">
            {migrationFilePath}
          </code>

          <p className="text-zinc-400 text-[11px] leading-relaxed">
            Contains tables for <span className="text-zinc-200 font-mono">departments</span>,{' '}
            <span className="text-zinc-200 font-mono">profiles</span>,{' '}
            <span className="text-zinc-200 font-mono">tickets</span>,{' '}
            <span className="text-zinc-200 font-mono">ticket_comments</span>,{' '}
            <span className="text-zinc-200 font-mono">ticket_checklists</span>, and{' '}
            <span className="text-zinc-200 font-mono">ticket_activities</span> with Row Level
            Security (RLS) policies and auto-generated ticket codes (<code className="text-zinc-300">DEV-1</code>, <code className="text-zinc-300">MKT-1</code>).
          </p>
        </div>

        {/* Step by Step Setup Instructions */}
        <div className="space-y-3">
          <h4 className="font-mono text-xs uppercase tracking-wider text-zinc-400 font-semibold">
            How to Connect Your Supabase Project (When Ready)
          </h4>

          <div className="space-y-2.5 font-mono text-xs">
            <div className="p-3 rounded-lg border border-zinc-850 bg-zinc-900/30 flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-300 flex-shrink-0">
                1
              </span>
              <div>
                <p className="text-white font-medium">Run Migration in Supabase</p>
                <p className="text-zinc-400 text-[11px] mt-0.5">
                  Open your Supabase project dashboard → go to <strong>SQL Editor</strong> → copy contents of{' '}
                  <code className="text-zinc-300">{migrationFilePath}</code> and execute.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-zinc-850 bg-zinc-900/30 flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-300 flex-shrink-0">
                2
              </span>
              <div>
                <p className="text-white font-medium">Configure Environment Variables</p>
                <p className="text-zinc-400 text-[11px] mt-0.5">
                  Create a <code className="text-zinc-300">.env</code> file based on <code className="text-zinc-300">.env.example</code> with:
                </p>
                <div className="mt-1.5 p-2 bg-zinc-950 rounded border border-zinc-800 text-[10px] text-zinc-300">
                  VITE_SUPABASE_URL=https://your-project.supabase.co<br />
                  VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-zinc-850 bg-zinc-900/30 flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-300 flex-shrink-0">
                3
              </span>
              <div>
                <p className="text-white font-medium">Deploy to Netlify</p>
                <p className="text-zinc-400 text-[11px] mt-0.5">
                  The project includes a pre-configured <code className="text-zinc-300">netlify.toml</code> with SPA redirect rules. Simply connect your Git repository in Netlify or run:
                </p>
                <div className="mt-1.5 p-2 bg-zinc-950 rounded border border-zinc-800 text-[10px] text-zinc-300 flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-zinc-500" />
                  <span>netlify deploy --prod --dir=dist</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-850 flex items-center justify-between">
          <span className="font-mono text-[11px] text-zinc-500">
            NUTS Architecture Blueprint v0.1
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono bg-white text-black hover:bg-zinc-200 rounded-lg transition-colors font-medium"
          >
            Got it
          </button>
        </div>
      </div>
    </Modal>
  );
};
