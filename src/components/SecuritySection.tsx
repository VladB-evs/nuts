import React, { useState } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { changePassword, signOutOtherSessions } from '../lib/neonService';
import { validatePasswordStrength } from '../lib/passwordStrength';

/** Change your password and sign out other devices. Only shown when Neon Auth is on. */
export const SecuritySection: React.FC = () => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const strength = validatePasswordStrength(next);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strength.isValid) {
      setMessage({ ok: false, text: 'Choose a stronger password: 8+ characters with upper and lower case, a number and a symbol.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setMessage({ ok: true, text: 'Password changed. Your other devices were signed out.' });
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'Could not change the password.' });
    } finally {
      setBusy(false);
    }
  };

  const signOutOthers = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await signOutOtherSessions();
      setMessage({ ok: true, text: 'Signed out of every other device.' });
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'Could not sign out other devices.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="border-t border-gray-200 px-4 sm:px-5 py-3 text-xs">
      <summary className="cursor-pointer select-none font-semibold text-gray-900 flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-gray-500" /> Security
      </summary>
      <form onSubmit={submit} className="mt-3 space-y-2">
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Current password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black"
        />
        <input
          type="password"
          required
          autoComplete="new-password"
          placeholder="New password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black"
        />
        {next && (
          <p className={`text-[10px] font-mono ${strength.isValid ? 'text-emerald-700' : 'text-amber-700'}`}>
            Strength: {strength.strengthLabel}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={busy}
            className="px-3 py-1.5 bg-black text-white font-medium rounded hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
          >
            Change password
          </button>
          <button
            type="button"
            onClick={signOutOthers}
            disabled={busy}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
          >
            Sign out other devices
          </button>
        </div>
        {message && (
          <p className={`flex items-center gap-1 text-[11px] ${message.ok ? 'text-emerald-600' : 'text-red-600'}`} role="status">
            {message.ok && <Check className="w-3 h-3" />}
            {message.text}
          </p>
        )}
      </form>
    </details>
  );
};
