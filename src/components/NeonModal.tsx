import React, { useState, useEffect } from 'react';
import { Database, Copy, Check, X, ShieldCheck, UserCheck, Zap, ExternalLink, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { getDatabaseUrl, setDatabaseUrl, isNeonConfigured } from '../lib/neon';
import { testConnection } from '../lib/neonService';

interface NeonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatabaseConnected?: () => void;
}

export const NeonModal: React.FC<NeonModalProps> = ({ isOpen, onClose, onDatabaseConnected }) => {
  const [copied, setCopied] = useState(false);
  const [dbUrl, setDbUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const migrationPath = 'neon/migrations/001_init_nuts_schema.sql';

  useEffect(() => {
    if (isOpen) {
      setDbUrl(getDatabaseUrl());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyPath = () => {
    navigator.clipboard.writeText(migrationPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAndConnect = async () => {
    setTesting(true);
    setTestResult(null);

    // Save connection URL
    setDatabaseUrl(dbUrl.trim());

    // Test connection
    const res = await testConnection();
    setTestResult(res);
    setTesting(false);

    if (res.success) {
      if (onDatabaseConnected) {
        onDatabaseConnected();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-lg border border-gray-300 shadow-xl overflow-hidden z-10 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-gray-900" />
            <span className="font-semibold text-gray-900 text-sm">Neon Postgres Setup & Connection</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-black p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-gray-700 leading-relaxed max-h-[80vh] overflow-y-auto">
          {/* Connection String Input Box */}
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-gray-900 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-black" />
                <span>Neon Connection String</span>
              </label>
              <span className="text-[10px] font-mono text-gray-500">
                {isNeonConfigured() ? (
                  <span className="text-emerald-700 font-medium">● Connected</span>
                ) : (
                  <span className="text-amber-700 font-medium">○ Not Configured</span>
                )}
              </span>
            </div>

            <p className="text-[11px] text-gray-600">
              Paste your Neon Postgres connection string here (from your Neon Dashboard):
            </p>

            <input
              type="password"
              placeholder="postgresql://user:password@ep-...neon.tech/neondb?sslmode=require"
              value={dbUrl}
              onChange={(e) => setDbUrl(e.target.value)}
              className="w-full px-3 py-1.5 font-mono text-xs bg-white border border-gray-300 rounded focus:outline-none focus:border-black"
            />

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleSaveAndConnect}
                disabled={testing || !dbUrl.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 rounded text-xs font-medium transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Testing Connection...' : 'Save & Connect'}</span>
              </button>

              {dbUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setDbUrl('');
                    setDatabaseUrl(null);
                    setTestResult({ success: true, message: 'Reset to local offline mode.' });
                    if (onDatabaseConnected) onDatabaseConnected();
                  }}
                  className="text-[11px] text-gray-500 hover:text-red-600 underline"
                >
                  Clear connection
                </button>
              )}
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded text-[11px] flex items-start gap-1.5 mt-2 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Migration Path Box */}
          <div className="space-y-1">
            <span className="font-semibold text-gray-900 text-xs">Database Schema Migration:</span>
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
          </div>

          {/* Architecture Highlights */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded space-y-2 text-[11px]">
            <div className="flex items-center gap-1.5 font-semibold text-gray-900">
              <Zap className="w-3.5 h-3.5 text-black" />
              <span>Features</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Direct serverless HTTP connection via <code className="bg-white px-1 border rounded text-gray-800">@neondatabase/serverless</code>.</li>
              <li>Dynamic JSONB custom fields with GIN indexing for department attributes.</li>
              <li>Auto-incrementing issue codes (<code className="bg-white px-1 border rounded text-gray-800">DEV-101</code>...) and audit logs.</li>
            </ul>
          </div>

          {/* Step-by-step deploy instructions */}
          <div className="space-y-2 text-xs">
            <p className="font-semibold text-gray-900">Quick Setup Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-600 text-[11px]">
              <li>
                Open the <a href="https://console.neon.tech" target="_blank" rel="noreferrer" className="text-black underline font-medium inline-flex items-center gap-0.5">Neon Console <ExternalLink className="w-2.5 h-2.5" /></a> → Go to <strong>SQL Editor</strong>.
              </li>
              <li>
                Paste the contents of <code className="bg-gray-100 px-1 rounded text-black font-mono">001_init_nuts_schema.sql</code> and click <strong>Run</strong>.
              </li>
              <li>
                Copy your Neon database connection string and paste it into the box above, or into Netlify Environment Variables (<code className="bg-gray-100 px-1 rounded text-black font-mono">VITE_NEON_DATABASE_URL</code>).
              </li>
            </ol>
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-3 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-black text-white font-medium rounded hover:bg-gray-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
