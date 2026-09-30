import React, { useState } from 'react';
import { Database, Copy, Check, X, ShieldCheck, UserCheck, Zap, ExternalLink } from 'lucide-react';

interface NeonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NeonModal: React.FC<NeonModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const migrationPath = 'neon/migrations/001_init_nuts_schema.sql';

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
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-gray-900" />
            <span className="font-semibold text-gray-900 text-sm">Neon Postgres Setup & Migrations</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-black p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-gray-700 leading-relaxed max-h-[80vh] overflow-y-auto">
          <p>
            Connect NUTS to your <strong>Neon Serverless Postgres</strong> database. The production SQL migration script is ready:
          </p>

          {/* Migration Path Box */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded font-mono text-[11px] flex items-center justify-between">
            <span className="text-gray-900 font-medium truncate">{migrationPath}</span>
            <button
              onClick={copyPath}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-[11px] font-sans transition-colors shrink-0 ml-2"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Path'}</span>
            </button>
          </div>

          {/* Features / Architecture Highlights */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded space-y-2.5 text-[11px]">
            <div className="flex items-center gap-1.5 font-semibold text-gray-900">
              <Zap className="w-3.5 h-3.5 text-black" />
              <span>Neon Serverless Architecture</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Pure PostgreSQL with serverless HTTP driver (<code className="bg-white px-1 border rounded text-gray-800">@neondatabase/serverless</code>).</li>
              <li>Dynamic JSONB custom fields with GIN indexing for department-specific attributes.</li>
              <li>Auto-incrementing issue codes (<code className="bg-white px-1 border rounded text-gray-800">DEV-101</code>, <code className="bg-white px-1 border rounded text-gray-800">DEV-102</code>...) & change audit trigger.</li>
            </ul>

            <div className="flex items-center gap-1.5 font-semibold text-gray-900 pt-1">
              <UserCheck className="w-3.5 h-3.5 text-black" />
              <span>Profiles & Department Roles</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><code className="bg-white px-1 border rounded text-gray-800">nickname</code> (unique team handle, e.g. @sarah_c)</li>
              <li><code className="bg-white px-1 border rounded text-gray-800">role</code> (e.g. Lead Platform Engineer, Senior Frontend)</li>
              <li><code className="bg-white px-1 border rounded text-gray-800">avatar_url</code> (external image URL links — zero file uploads required)</li>
            </ul>
          </div>

          {/* Step-by-step deploy instructions */}
          <div className="space-y-2 text-xs">
            <p className="font-semibold text-gray-900">How to deploy to Neon & Netlify:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-gray-600">
              <li>
                Open the <a href="https://console.neon.tech" target="_blank" rel="noreferrer" className="text-black underline font-medium inline-flex items-center gap-0.5">Neon Console <ExternalLink className="w-2.5 h-2.5" /></a> → Go to <strong>SQL Editor</strong>.
              </li>
              <li>
                Paste the contents of <code className="bg-gray-100 px-1 rounded text-black font-mono">neon/migrations/001_init_nuts_schema.sql</code> and click <strong>Run</strong>.
              </li>
              <li>
                Copy your Neon database connection string (Pooled or Direct).
              </li>
              <li>
                Set <code className="bg-gray-100 px-1 rounded text-black font-mono">VITE_NEON_DATABASE_URL</code> in your local <code className="bg-gray-100 px-1 rounded text-black font-mono">.env</code> or in <strong>Netlify Site Configuration → Environment Variables</strong>.
              </li>
            </ol>
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-3 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-black text-white font-medium rounded hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
