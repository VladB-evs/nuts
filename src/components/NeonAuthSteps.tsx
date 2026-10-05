import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, KeyRound, Lock, Mail, MailCheck } from 'lucide-react';
import type { UserProfile } from '../types';
import {
  SignUpParams,
  completeSignup,
  logoutFromServer,
  requestPasswordResetCode,
  resendVerificationCode,
  resetPasswordWithCode,
  verifyEmailCode,
  loginWithEmail,
  startLoginForExistingAccount,
} from '../lib/neonService';
import { ProfileRequiredError, VerificationRequiredError } from '../lib/neonAuth';
import { validatePasswordStrength } from '../lib/passwordStrength';

/** The extra screens Neon Auth needs: confirm your email, finish workspace setup, reset a password. */

const inputClass =
  'w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-black';
const primaryButton =
  'w-full py-2 px-4 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:cursor-not-allowed';

const ErrorNotice: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div role="alert" className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-red-700 text-xs">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="leading-snug">{message}</div>
    </div>
  ) : null;

const Heading: React.FC<{ icon: React.ReactNode; title: string; subtitle: React.ReactNode }> = ({ icon, title, subtitle }) => (
  <div className="text-center mb-5">
    <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-3 text-gray-700">{icon}</div>
    <h1 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h1>
    <p className="text-xs text-gray-500 mt-1 leading-snug">{subtitle}</p>
  </div>
);

const BackLink: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="mt-4 mx-auto flex items-center gap-1 text-[11px] text-gray-500 hover:text-black cursor-pointer">
    <ArrowLeft className="w-3 h-3" /> {children}
  </button>
);

// ---------------------------------------------------------------------------
// 1. Confirm the email address with the emailed code
// ---------------------------------------------------------------------------

export const VerifyEmailStep: React.FC<{
  email: string;
  password?: string;
  profile?: SignUpParams;
  onDone: (user: UserProfile) => void;
  onNeedProfile: (identity: { email: string; name: string }) => void;
  onBack: () => void;
}> = ({ email, password, profile, onDone, onNeedProfile, onBack }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) return setError('Enter the code from the email.');
    setLoading(true);
    setError(null);
    try {
      onDone(await verifyEmailCode(email, code, password, profile));
    } catch (err: any) {
      if (err instanceof ProfileRequiredError) onNeedProfile(err.identity);
      else if (err instanceof VerificationRequiredError) setError('That did not confirm your email yet. Check the code and try again.');
      else setError(err?.message || 'Could not confirm your email.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError(null);
    setNotice(null);
    try {
      await resendVerificationCode(email);
      setNotice('A new code is on its way.');
      setCooldown(30);
    } catch (err: any) {
      setError(err?.message || 'Could not send a new code.');
    }
  };

  return (
    <div>
      <Heading
        icon={<MailCheck className="w-5 h-5" />}
        title="Check your email"
        subtitle={<>We sent a confirmation code to <strong className="text-gray-800">{email}</strong>. Enter it to finish.</>}
      />
      <ErrorNotice message={error} />
      {notice && <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs">{notice}</div>}
      <form onSubmit={submit} className="space-y-3.5">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={12}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\s+/g, ''))}
          aria-label="Confirmation code"
          className={`${inputClass} text-center font-mono text-base tracking-[0.4em]`}
        />
        <button type="submit" disabled={loading} className={primaryButton}>
          <span>{loading ? 'Confirming...' : 'Confirm email'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>
      <button
        type="button"
        onClick={resend}
        disabled={cooldown > 0}
        className="mt-3 w-full text-center text-[11px] text-blue-600 hover:text-blue-800 disabled:text-gray-400 cursor-pointer disabled:cursor-not-allowed"
      >
        {cooldown > 0 ? `Send a new code in ${cooldown}s` : "Didn't get it? Send a new code"}
      </button>
      <BackLink onClick={onBack}>Back to sign in</BackLink>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 2. Signed in and verified, but not in a workspace yet
// ---------------------------------------------------------------------------

export const FinishSetupStep: React.FC<{
  identity: { email: string; name: string };
  onDone: (user: UserProfile) => void;
  onSignOut: () => void;
}> = ({ identity, onDone, onSignOut }) => {
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [orgCode, setOrgCode] = useState('');
  const [orgName, setOrgName] = useState('');
  const [name, setName] = useState(identity.name);
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Please enter your full name.');
    if (mode === 'join' && !orgCode.trim()) return setError('Please enter your company invite code.');
    if (mode === 'create' && !orgName.trim()) return setError('Please enter your company name.');
    setLoading(true);
    setError(null);
    try {
      onDone(
        await completeSignup({
          name: name.trim(),
          email: identity.email,
          nickname: nickname.trim() || name.toLowerCase().trim().replace(/\s+/g, '_'),
          role: role.trim() || (mode === 'create' ? 'Workspace Admin / Founder' : 'Member'),
          orgMode: mode,
          orgName: mode === 'create' ? orgName.trim() : undefined,
          orgCode: mode === 'join' ? orgCode.trim().toUpperCase() : undefined,
        })
      );
    } catch (err: any) {
      setError(err?.message || 'Could not finish setting up your workspace.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Heading
        icon={<KeyRound className="w-5 h-5" />}
        title="Finish setting up"
        subtitle={<>You are signed in as <strong className="text-gray-800">{identity.email}</strong>. Join your team's workspace or create a new one.</>}
      />
      <ErrorNotice message={error} />
      <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 border border-gray-200 rounded-md mb-3 text-xs font-medium">
        {(['join', 'create'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`py-1.5 rounded cursor-pointer ${mode === m ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'}`}
          >
            {m === 'join' ? 'Join with a code' : 'Create a workspace'}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-3">
        {mode === 'join' ? (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Organization invite code</label>
            <input type="text" required placeholder="e.g. ACME-9021" value={orgCode} onChange={(e) => setOrgCode(e.target.value.toUpperCase())} className={`${inputClass} font-mono uppercase tracking-wider`} />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Company / organization name</label>
            <input type="text" required placeholder="Acme Technologies" value={orgName} onChange={(e) => setOrgName(e.target.value)} className={inputClass} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nickname</label>
            <input type="text" placeholder="jdoe" value={nickname} onChange={(e) => setNickname(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Role / job title</label>
          <input type="text" placeholder="e.g. Senior Engineer" value={role} onChange={(e) => setRole(e.target.value)} className={inputClass} />
        </div>
        <button type="submit" disabled={loading} className={primaryButton}>
          <span>{loading ? 'Setting up...' : mode === 'join' ? 'Join workspace' : 'Create workspace'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>
      <BackLink onClick={async () => { await logoutFromServer(); onSignOut(); }}>Sign out and use a different account</BackLink>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 3. Forgot password: email a code, then choose a new password
// ---------------------------------------------------------------------------

export const ForgotPasswordStep: React.FC<{
  initialEmail: string;
  onDone: (user: UserProfile) => void;
  onNeedVerification: (email: string, password: string) => void;
  onBack: () => void;
}> = ({ initialEmail, onDone, onNeedVerification, onBack }) => {
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const strength = validatePasswordStrength(password);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError('Enter the email you signed up with.');
    setLoading(true);
    setError(null);
    try {
      await requestPasswordResetCode(email);
      setStage('code');
    } catch (err: any) {
      setError(err?.message || 'Could not send a reset code.');
    } finally {
      setLoading(false);
    }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strength.isValid) return setError('Choose a stronger password: 8+ characters with upper and lower case, a number and a symbol.');
    setLoading(true);
    setError(null);
    try {
      await resetPasswordWithCode(email, code, password);
      try {
        onDone(await loginWithEmail(email, password));
      } catch (err: any) {
        if (err instanceof VerificationRequiredError) onNeedVerification(email, password);
        else throw err;
      }
    } catch (err: any) {
      setError(err?.message || 'Could not reset the password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Heading
        icon={<Lock className="w-5 h-5" />}
        title="Reset your password"
        subtitle={stage === 'email' ? "We'll email you a one-time code." : <>If <strong className="text-gray-800">{email}</strong> has an account, a code is on its way.</>}
      />
      <ErrorNotice message={error} />
      {stage === 'email' ? (
        <form onSubmit={sendCode} className="space-y-3.5">
          <div className="relative">
            <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="email" required autoFocus placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputClass} pl-9`} />
          </div>
          <button type="submit" disabled={loading} className={primaryButton}>
            <span>{loading ? 'Sending...' : 'Send reset code'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-3.5">
          <input type="text" inputMode="numeric" autoComplete="one-time-code" autoFocus required placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/\s+/g, ''))} aria-label="Reset code" className={`${inputClass} text-center font-mono text-base tracking-[0.4em]`} />
          <div>
            <input type="password" required autoComplete="new-password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            {password && (
              <p className={`mt-1 text-[10px] font-mono ${strength.isValid ? 'text-emerald-700' : 'text-amber-700'}`}>
                Strength: {strength.strengthLabel}
              </p>
            )}
          </div>
          <button type="submit" disabled={loading} className={primaryButton}>
            <span>{loading ? 'Resetting...' : 'Set new password & sign in'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
      <BackLink onClick={onBack}>Back to sign in</BackLink>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 4. People who already had an account before sign-in moved to Neon Auth
// ---------------------------------------------------------------------------

export const ExistingAccountStep: React.FC<{
  onDone: (user: UserProfile) => void;
  onNeedVerification: (email: string, password: string) => void;
  onNeedProfile: (identity: { email: string; name: string }) => void;
  onBack: () => void;
}> = ({ onDone, onNeedVerification, onNeedProfile, onBack }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const strength = validatePasswordStrength(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strength.isValid) return setError('Choose a stronger password: 8+ characters with upper and lower case, a number and a symbol.');
    setLoading(true);
    setError(null);
    try {
      onDone(await startLoginForExistingAccount(email, password, name));
    } catch (err: any) {
      if (err instanceof VerificationRequiredError) onNeedVerification(email.trim().toLowerCase(), password);
      else if (err instanceof ProfileRequiredError) onNeedProfile(err.identity);
      else setError(err?.message || 'Could not set up your new login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Heading
        icon={<KeyRound className="w-5 h-5" />}
        title="Set up your new login"
        subtitle="Sign-in has been upgraded. Use the same email as your existing account, choose a password, and confirm your email: you'll be reconnected to your workspace and tickets."
      />
      <ErrorNotice message={error} />
      <form onSubmit={submit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Your name</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email of your existing account</label>
          <input type="email" required placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">New password</label>
          <input type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          {password && <p className={`mt-1 text-[10px] font-mono ${strength.isValid ? 'text-emerald-700' : 'text-amber-700'}`}>Strength: {strength.strengthLabel}</p>}
        </div>
        <button type="submit" disabled={loading} className={primaryButton}>
          <span>{loading ? 'Setting up...' : 'Continue'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>
      <BackLink onClick={onBack}>Back to sign in</BackLink>
    </div>
  );
};
