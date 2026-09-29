import React, { useState } from 'react';
import { Database, Copy, Check, X, ShieldCheck, UserCheck } from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const migrationPath = 'supabase/migrations/20260928000000_init_nuts_schema.sql';

  if (!isOpen) return null;

  const copyPath = () => {
    navigator.clipboard.writeText(migrationPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-lg border border-gray-300 shadow-xl overflow-hidden z-10 text-xs">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-gray-700" />
            <span className="font-semibold text-gray-900 text-sm">Supabase Backend & Migrations</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-black p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-gray-700 leading-relaxed max-h-[80vh] overflow-y-auto">
          <p>
            When you're ready to deploy your Supabase database and enable email/password authentication, your production SQL migration is ready:
          </p>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded font-mono text-[11px] flex items-center justify-between">
            <span className="text-gray-900">{migrationPath}</span>
            <button
              onClick={copyPath}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-[10px]"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Path'}</span>
            </button>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded space-y-2 text-[11px]">
            <div className="flex items-center gap-1.5 font-semibold text-gray-900">
              <UserCheck className="w-3.5 h-3.5 text-black" />
              <span>Profiles & Roles Included</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-gray-600">
              <li><code className="bg-white px-1 border rounded text-gray-800">nickname</code> (unique team handle)</li>
              <li><code className="bg-white px-1 border rounded text-gray-800">role</code> (e.g. Lead Growth Marketer, Senior FE Engineer)</li>
              <li><code className="bg-white px-1 border rounded text-gray-800">avatar_url</code> (external image links — no upload/storage buckets)</li>
            </ul>

            <div className="flex items-center gap-1.5 font-semibold text-gray-900 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Row Level Security (RLS)</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-gray-600">
              <li>Team members can see all profiles and department roles.</li>
              <li>Users can edit their own profile (name, nickname, avatar link).</li>
              <li>Admins/Leads can manage roles and member privileges.</li>
            </ul>
          </div>

          <div className="space-y-2 text-xs">
            <p className="font-medium text-gray-900">How to deploy:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>Open your Supabase project dashboard → SQL Editor.</li>
              <li>Paste the contents of <code className="bg-gray-100 px-1 rounded text-black font-mono">20260928000000_init_nuts_schema.sql</code> and click Run.</li>
              <li>Add your <code className="bg-gray-100 px-1 rounded text-black font-mono">VITE_SUPABASE_URL</code> and <code className="bg-gray-100 px-1 rounded text-black font-mono">VITE_SUPABASE_ANON_KEY</code> to your <code className="bg-gray-100 px-1 rounded text-black font-mono">.env</code> file.</li>
            </ol>
          </div>

          <div className="flex justify-end pt-2 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-black text-white font-medium rounded hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
