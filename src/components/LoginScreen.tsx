import React, { useState } from 'react';
import { UserProfile } from '../types';
import { loginWithEmail, registerUser } from '../lib/neonService';
import { isNeonConfigured } from '../lib/neon';
import { Database, Lock, Mail, User, Building2, KeyRound, ArrowRight, AlertCircle, Sparkles, ChevronRight } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: UserProfile) => void;
  onEnterDemoMode: () => void;
  onOpenNeonModal: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  onEnterDemoMode,
  onOpenNeonModal,
}) => {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup mode: Create company vs Join company
  const [orgMode, setOrgMode] = useState<'create' | 'join'>('create');
  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');

  // Personal info
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('Engineer');
  const [department, setDepartment] = useState('Engineering');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const neonReady = isNeonConfigured();

  // Auto-generate suggested org code when company name changes
  const handleOrgNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOrgName(val);
    if (!orgCode || orgCode.startsWith('ORG-') || orgCode.includes('-')) {
      const slug = val
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 4) || 'ORG';
      const rand = Math.floor(1000 + Math.random() * 9000);
      setOrgCode(`${slug}-${rand}`);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your work email.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (neonReady) {
        const user = await loginWithEmail(email, password);
        onLogin(user);
      } else {
        // In offline mode
        setError('Please connect your Neon Postgres database first using the button at the top right.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Please enter your full name and work email.');
      return;
    }

    if (orgMode === 'create' && !orgName.trim()) {
      setError('Please enter your company or organization name.');
      return;
    }

    if (orgMode === 'join' && !orgCode.trim()) {
      setError('Please enter your company organization invite code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (neonReady) {
        const newUser = await registerUser({
          name: name.trim(),
          email: email.trim(),
          nickname: nickname.trim() || name.toLowerCase().replace(/\s+/g, '_'),
          password,
          department: department.trim() || 'Engineering',
          role: role.trim() || (orgMode === 'create' ? 'Founder / Admin' : 'Engineer'),
          avatarUrl: avatarUrl.trim() || undefined,
          orgMode,
          orgName: orgMode === 'create' ? orgName.trim() : undefined,
          orgCode: orgCode.trim().toUpperCase(),
        });
        onLogin(newUser);
      } else {
        setError('Please connect your Neon Postgres database first using the button at the top right.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 selection:bg-black selection:text-white">
      {/* Top Banner / Neon Status */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={onOpenNeonModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-200 hover:border-gray-400 rounded-md text-gray-700 shadow-sm transition-colors"
          title="Neon Serverless Postgres Status"
        >
          <Database className="w-3.5 h-3.5 text-gray-500" />
          <span className="font-mono text-[11px]">
            {neonReady ? (
              <span className="text-emerald-700 font-medium">● Neon Connected</span>
            ) : (
              <span className="text-amber-700 font-medium">○ Setup Neon Database</span>
            )}
          </span>
        </button>
      </div>

      <div className="w-full max-w-md bg-white border border-gray-300 rounded-xl shadow-lg p-7">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-11 h-11 rounded-xl bg-black text-white flex items-center justify-center font-bold text-lg mx-auto mb-3 shadow-sm">
            N
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">NUTS Issue Tracker</h1>
          <p className="text-xs text-gray-500 mt-1">
            Universal team workspace powered by Neon Serverless Postgres
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200 mb-6 text-xs font-medium">
          <button
            onClick={() => {
              setTab('signin');
              setError(null);
            }}
            className={`flex-1 py-2 text-center border-b-2 transition-colors ${
              tab === 'signin'
                ? 'border-black text-black font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setTab('signup');
              setError(null);
            }}
            className={`flex-1 py-2 text-center border-b-2 transition-colors ${
              tab === 'signup'
                ? 'border-black text-black font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Create Company Account
          </button>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="leading-snug">{error}</div>
          </div>
        )}

        {/* Form: Sign In */}
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
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-black"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>{loading ? 'Signing in...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Form: Sign Up (Multi-Tenant Org Creation or Join) */}
        {tab === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3.5">
            {/* Organization Option Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setOrgMode('create')}
                className={`py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  orgMode === 'create'
                    ? 'bg-white text-black shadow-xs font-semibold'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>New Company</span>
              </button>
              <button
                type="button"
                onClick={() => setOrgMode('join')}
                className={`py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  orgMode === 'join'
                    ? 'bg-white text-black shadow-xs font-semibold'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Join with Code</span>
              </button>
            </div>

            {/* Org Mode: Create New Company */}
            {orgMode === 'create' && (
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
                    Unique Invite Code <span className="text-gray-400 font-normal">(share with team)</span>
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
            )}

            {/* Org Mode: Join Existing Company */}
            {orgMode === 'join' && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md space-y-1">
                <label className="block text-[11px] font-semibold text-gray-800 mb-1">
                  Organization Invite Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ACME-9021"
                  value={orgCode}
                  onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 font-mono text-xs bg-white border border-gray-300 rounded focus:outline-none focus:border-black"
                />
                <p className="text-[10px] text-gray-500 pt-0.5">
                  Ask your company admin or founder for their company invite code.
                </p>
              </div>
            )}

            {/* User Profile Details */}
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

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role / Title</label>
                <input
                  type="text"
                  placeholder={orgMode === 'create' ? 'Founder / CTO' : 'Senior Engineer'}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded focus:outline-none focus:bg-white focus:border-black"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  placeholder="Engineering"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded focus:outline-none focus:bg-white focus:border-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded focus:outline-none focus:bg-white focus:border-black"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 rounded-md text-xs font-medium transition-colors shadow-sm"
            >
              {loading
                ? 'Processing...'
                : orgMode === 'create'
                ? 'Create Company Workspace & Sign In'
                : 'Join Organization & Sign In'}
            </button>
          </form>
        )}

        {/* Subtle Sandbox Demo Link (Collapsed / Not in the face) */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <button
            type="button"
            onClick={onEnterDemoMode}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-black transition-colors group"
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
    </div>
  );
};
