import React, { useState, useEffect, useMemo } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { UserProfile } from '../types';
import { loginWithEmail, registerUser, fetchPendingProfile, SignUpParams } from '../lib/neonService';
import { neonAuthEnabled, ProfileRequiredError, VerificationRequiredError } from '../lib/neonAuth';
import { VerifyEmailStep, FinishSetupStep, ForgotPasswordStep, ExistingAccountStep } from './NeonAuthSteps';
import { validatePasswordStrength } from '../lib/passwordStrength';
import {
  Lock,
  Mail,
  User,
  Building2,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Check,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: UserProfile) => void;
  onEnterDemoMode: () => void;
}

const isSpecialAdminOnboardingLink = (): boolean => {
  if (typeof window === 'undefined') return false;
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const path = window.location.pathname.toLowerCase();
  return (
    search.includes('create-org') ||
    search.includes('new-org') ||
    search.includes('setup-org') ||
    search.includes('admin=true') ||
    hash.includes('create-org') ||
    hash.includes('new-org') ||
    path.endsWith('/create-org')
  );
};

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  onEnterDemoMode,
}) => {
  const [isAdminOnboarding, setIsAdminOnboarding] = useState<boolean>(() =>
    isSpecialAdminOnboardingLink()
  );
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');

  // Shared credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile details
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Organization fields
  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Neon Auth only: extra screens (confirm email, finish workspace setup, reset password, upgrade an old account)
  type NeonStep =
    | { kind: 'verify'; email: string; password?: string; profile?: SignUpParams }
    | { kind: 'finish'; identity: { email: string; name: string } }
    | { kind: 'forgot' }
    | { kind: 'existing' };
  const [neonStep, setNeonStep] = useState<NeonStep | null>(null);

  // Signed in with Neon Auth earlier but never finished joining a workspace? Resume there.
  useEffect(() => {
    if (!neonAuthEnabled) return;
    let alive = true;
    fetchPendingProfile().then((identity) => {
      if (alive && identity) setNeonStep({ kind: 'finish', identity });
    });
    return () => {
      alive = false;
    };
  }, []);

  /** Sends the person to the right extra screen when Neon Auth says one is needed. True if it did. */
  const routeNeonStep = (err: unknown, ctx: { email: string; password?: string; profile?: SignUpParams }): boolean => {
    if (err instanceof VerificationRequiredError) {
      setNeonStep({ kind: 'verify', email: ctx.email, password: ctx.password, profile: ctx.profile });
      setError(null);
      return true;
    }
    if (err instanceof ProfileRequiredError) {
      setNeonStep({ kind: 'finish', identity: err.identity });
      setError(null);
      return true;
    }
    return false;
  };

  // Password evaluation for signup / admin setup
  const pwdStrength = useMemo(() => validatePasswordStrength(password), [password]);
  const passwordsMatch = useMemo(
    () => confirmPassword.length > 0 && password === confirmPassword,
    [password, confirmPassword]
  );

  // Reset password states when switching tabs or onboarding views
  const handleTabSwitch = (newTab: 'signin' | 'signup') => {
    setTab(newTab);
    setError(null);
    setPassword('');
    setConfirmPassword('');
  };

  // Listen to popstate / url changes if any
  useEffect(() => {
    const handleUrlChange = () => {
      setIsAdminOnboarding(isSpecialAdminOnboardingLink());
    };
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Auto-generate suggested org code when company name changes (for admin setup)
  const handleOrgNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOrgName(val);
    if (!orgCode || orgCode.startsWith('ORG-') || orgCode.includes('-')) {
      const slug =
        val
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .substring(0, 4) || 'ORG';
      const rand = Math.floor(1000 + Math.random() * 9000);
      setOrgCode(`${slug}-${rand}`);
    }
  };

  // Standard Login (single password field, no confirmation needed)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your work email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await loginWithEmail(email, password);
      onLogin(user);
    } catch (err: any) {
      if (!routeNeonStep(err, { email: email.trim().toLowerCase(), password })) {
        setError(err?.message || 'Failed to sign in. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Employee Join (Password confirmation and strength validation enforced)
  const handleEmployeeJoinSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgCode.trim()) {
      setError('Please enter your company organization invite code.');
      return;
    }
    if (!name.trim() || !email.trim()) {
      setError('Please enter your full name and work email.');
      return;
    }

    // Password strength check
    if (!pwdStrength.isValid) {
      setError(
        'Password does not meet security requirements. It must have at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character.'
      );
      return;
    }

    // Passwords match check
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both password fields are identical.');
      return;
    }

    const params: SignUpParams = {
      name: name.trim(),
      email: email.trim(),
      nickname: nickname.trim() || name.toLowerCase().replace(/\s+/g, '_'),
      password,
      role: role.trim() || 'Member',
      avatarUrl: avatarUrl.trim() || undefined,
      orgMode: 'join',
      orgCode: orgCode.trim().toUpperCase(),
    };

    setLoading(true);
    setError(null);

    try {
      const newUser = await registerUser(params);
      onLogin(newUser);
    } catch (err: any) {
      if (!routeNeonStep(err, { email: params.email.toLowerCase(), password, profile: params })) {
        setError(err?.message || 'Failed to join company workspace.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Admin Create Org (Password confirmation and strength validation enforced)
  const handleAdminCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      setError('Please enter your company or organization name.');
      return;
    }
    if (!name.trim() || !email.trim()) {
      setError('Please enter your full name and work email.');
      return;
    }

    // Password strength check
    if (!pwdStrength.isValid) {
      setError(
        'Password does not meet security requirements. It must have at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character.'
      );
      return;
    }

    // Passwords match check
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both password fields are identical.');
      return;
    }

    const params: SignUpParams = {
      name: name.trim(),
      email: email.trim(),
      nickname: nickname.trim() || name.toLowerCase().replace(/\s+/g, '_'),
      password,
      role: role.trim() || 'Workspace Admin / Founder',
      avatarUrl: avatarUrl.trim() || undefined,
      orgMode: 'create',
      orgName: orgName.trim(),
      orgCode: orgCode.trim().toUpperCase(),
    };

    setLoading(true);
    setError(null);

    try {
      const newAdmin = await registerUser(params);
      onLogin(newAdmin);
    } catch (err: any) {
      if (!routeNeonStep(err, { email: params.email.toLowerCase(), password, profile: params })) {
        setError(err?.message || 'Failed to create organization workspace.');
      }
    } finally {
      setLoading(false);
    }
  };

  const exitAdminOnboarding = () => {
    setIsAdminOnboarding(false);
    setError(null);
    setPassword('');
    setConfirmPassword('');
    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-3 sm:p-4 selection:bg-black selection:text-white">
      <ThemeToggle className="fixed top-3 right-3 z-10" />
      <div className="w-full max-w-md bg-white border border-gray-300 rounded-xl shadow-lg p-5 sm:p-7">
        {/* ================================================================ */}
        {/* GUARDED ADMIN ONBOARDING VIEW (Only accessible via special sales/onboarding link) */}
        {/* ================================================================ */}
        {neonStep ? (
          neonStep.kind === 'verify' ? (
            <VerifyEmailStep
              email={neonStep.email}
              password={neonStep.password}
              profile={neonStep.profile}
              onDone={onLogin}
              onNeedProfile={(identity) => setNeonStep({ kind: 'finish', identity })}
              onBack={() => setNeonStep(null)}
            />
          ) : neonStep.kind === 'finish' ? (
            <FinishSetupStep identity={neonStep.identity} onDone={onLogin} onSignOut={() => setNeonStep(null)} />
          ) : neonStep.kind === 'forgot' ? (
            <ForgotPasswordStep
              initialEmail={email}
              onDone={onLogin}
              onNeedVerification={(em, pw) => setNeonStep({ kind: 'verify', email: em, password: pw })}
              onBack={() => setNeonStep(null)}
            />
          ) : (
            <ExistingAccountStep
              onDone={onLogin}
              onNeedVerification={(em, pw) => setNeonStep({ kind: 'verify', email: em, password: pw })}
              onNeedProfile={(identity) => setNeonStep({ kind: 'finish', identity })}
              onBack={() => setNeonStep(null)}
            />
          )
        ) : isAdminOnboarding ? (
          <div>
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-black text-white text-[11px] font-semibold rounded-full mb-3 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Organization Admin Onboarding</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Create Company Workspace
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Authorized onboarding portal for new company administrators
              </p>
            </div>

            {/* Error Notice */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-snug">{error}</div>
              </div>
            )}

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-md mb-4 text-xs text-blue-900 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="leading-snug text-[11px]">
                As the organization creator, you will become the <strong>Workspace Admin</strong>. You will have exclusive access to the company invite code to onboard your employees.
              </p>
            </div>

            <form onSubmit={handleAdminCreateOrg} className="space-y-3.5">
              {/* Company Info */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-800 mb-1">
                    Company / Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Acme Technologies"
                    value={orgName}
                    onChange={handleOrgNameChange}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-gray-300 rounded focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-800 mb-1">
                    Unique Company Invite Code <span className="text-gray-400 font-normal">(for your employees)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ACME-9021"
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 font-mono text-xs bg-white border border-gray-300 rounded focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* Admin Profile Info */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Admin Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded focus:outline-none focus:bg-white focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nickname</label>
                  <input
                    type="text"
                    placeholder="jdoe"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded focus:outline-none focus:bg-white focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Admin Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="jane@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded focus:outline-none focus:bg-white focus:border-black"
                />
              </div>

              {/* Password Field 1: Admin Password with Strength Rules */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-700">Admin Password</label>
                  {password && (
                    <span
                      className={`text-[10px] font-semibold font-mono ${
                        pwdStrength.isValid ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      Strength: {pwdStrength.strengthLabel}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded focus:outline-none focus:bg-white focus:border-black"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black p-0.5 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Password Strength Meter & Interactive Checklist */}
                {password.length > 0 && (
                  <div className="mt-2 p-2.5 bg-gray-50 border border-gray-200 rounded-md space-y-1.5">
                    <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${pwdStrength.strengthColor} ${pwdStrength.strengthWidth}`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] pt-1">
                      {pwdStrength.criteria.map((c, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-1 ${
                            c.met ? 'text-emerald-700 font-semibold' : 'text-gray-400'
                          }`}
                        >
                          {c.met ? (
                            <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block" />
                          )}
                          <span>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Password Field 2: Confirm Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-700">Confirm Admin Password</label>
                  {confirmPassword.length > 0 && (
                    <span
                      className={`text-[10px] font-semibold font-mono flex items-center gap-1 ${
                        passwordsMatch ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {passwordsMatch ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Passwords match</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" />
                          <span>Passwords do not match</span>
                        </>
                      )}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-9 pr-10 py-1.5 text-xs bg-gray-50 border rounded focus:outline-none focus:bg-white ${
                      confirmPassword.length > 0
                        ? passwordsMatch
                          ? 'border-emerald-500 focus:border-emerald-600'
                          : 'border-red-400 focus:border-red-500'
                        : 'border-gray-300 focus:border-black'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black p-0.5 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Your Role / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Founder, VP of Engineering, Workspace Admin..."
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded focus:outline-none focus:bg-white focus:border-black"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 rounded-md text-xs font-semibold transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                <span>{loading ? 'Setting up workspace...' : 'Create Company Workspace & Register Admin'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-gray-200 text-center">
              <button
                type="button"
                onClick={exitAdminOnboarding}
                className="text-xs text-gray-500 hover:text-black underline cursor-pointer"
              >
                Return to standard employee login
              </button>
            </div>
          </div>
        ) : (
          /* ================================================================ */
          /* STANDARD PUBLIC VIEW (Sign In or Join with Code only) */
          /* ================================================================ */
          <div>
            {/* Brand Header */}
            <div className="text-center mb-6">
              <div className="w-11 h-11 rounded-xl bg-black text-white flex items-center justify-center font-bold text-lg mx-auto mb-3 shadow-sm">
                N
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">NUTS</h1>
              <p className="text-xs text-gray-500 mt-1">
                Internal team workspace powered by Neon Serverless Postgres
              </p>
            </div>

            {/* Tab Switcher (Only Sign In and Join with Code) */}
            <div className="flex border-b border-gray-200 mb-6 text-xs font-medium">
              <button
                onClick={() => handleTabSwitch('signin')}
                className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
                  tab === 'signin'
                    ? 'border-black text-black font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => handleTabSwitch('signup')}
                className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
                  tab === 'signup'
                    ? 'border-black text-black font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                Join with Code
              </button>
            </div>

            {/* Error Notice */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-snug">{error}</div>
              </div>
            )}

            {/* Form 1: Sign In (Single Password input, no confirmation needed) */}
            {tab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-black"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 text-xs bg-gray-50 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-black"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black p-0.5 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>{loading ? 'Signing in...' : 'Sign In to Workspace'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {neonAuthEnabled && (
                  <div className="flex flex-col items-center gap-1.5 pt-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setNeonStep({ kind: 'forgot' })}
                      className="text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      Forgot your password?
                    </button>
                    <button
                      type="button"
                      onClick={() => setNeonStep({ kind: 'existing' })}
                      className="text-gray-500 hover:text-black cursor-pointer"
                    >
                      Had an account before the sign-in upgrade? Set up your new login
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* Form 2: Sign Up (Requires Org Code, Two Password Fields, Strength Validation) */}
            {tab === 'signup' && (
              <form onSubmit={handleEmployeeJoinSignUp} className="space-y-3.5">
                {/* Organization Code Input Box */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-gray-800">
                      Organization Invite Code *
                    </label>
                    <span className="text-[10px] font-mono text-gray-500">From your Admin</span>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. ACME-9021"
                      value={orgCode}
                      onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                      className="w-full pl-9 pr-3 py-1.5 font-mono text-xs bg-white border border-gray-300 rounded focus:outline-none focus:border-black uppercase tracking-wider font-semibold"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 pt-0.5">
                    Enter the code given to you by your company administrator to join your team.
                  </p>
                </div>

                {/* User Details */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Sarah Jenkins"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded focus:outline-none focus:bg-white focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nickname</label>
                    <input
                      type="text"
                      placeholder="sarah_j"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded focus:outline-none focus:bg-white focus:border-black"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    placeholder="sarah@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded focus:outline-none focus:bg-white focus:border-black"
                  />
                </div>

                {/* Password Field 1: Strong Password with Interactive Strength Meter */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-700">Password</label>
                    {password && (
                      <span
                        className={`text-[10px] font-semibold font-mono ${
                          pwdStrength.isValid ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        Strength: {pwdStrength.strengthLabel}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded focus:outline-none focus:bg-white focus:border-black"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black p-0.5 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Password Strength Meter & Interactive Checklist */}
                  {password.length > 0 && (
                    <div className="mt-2 p-2.5 bg-gray-50 border border-gray-200 rounded-md space-y-1.5">
                      <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${pwdStrength.strengthColor} ${pwdStrength.strengthWidth}`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] pt-1">
                        {pwdStrength.criteria.map((c, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-1 ${
                              c.met ? 'text-emerald-700 font-semibold' : 'text-gray-400'
                            }`}
                          >
                            {c.met ? (
                              <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                            ) : (
                              <span className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block" />
                            )}
                            <span>{c.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Password Field 2: Confirm Password with Match Indicator */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-700">Confirm Password</label>
                    {confirmPassword.length > 0 && (
                      <span
                        className={`text-[10px] font-semibold font-mono flex items-center gap-1 ${
                          passwordsMatch ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {passwordsMatch ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Passwords match</span>
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3" />
                            <span>Passwords do not match</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full pl-9 pr-10 py-1.5 text-xs bg-gray-50 border rounded focus:outline-none focus:bg-white ${
                        confirmPassword.length > 0
                          ? passwordsMatch
                            ? 'border-emerald-500 focus:border-emerald-600'
                            : 'border-red-400 focus:border-red-500'
                          : 'border-gray-300 focus:border-black'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black p-0.5 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Role / Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Software Engineer, Product Designer, Account Exec..."
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded focus:outline-none focus:bg-white focus:border-black"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 rounded-md text-xs font-medium transition-colors shadow-sm cursor-pointer mt-1"
                >
                  {loading ? 'Joining workspace...' : 'Join Company Workspace'}
                </button>
              </form>
            )}

            {/* Subtle Sandbox Demo Link */}
            <div className="mt-6 pt-4 border-t border-gray-200 text-center">
              <button
                type="button"
                onClick={onEnterDemoMode}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-black transition-colors group cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-gray-400 group-hover:text-black" />
                <span>Evaluating NUTS?</span>
                <span className="font-medium underline group-hover:text-black">
                  Try Sandbox Demo Mode
                </span>
                <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-black ml-0.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
