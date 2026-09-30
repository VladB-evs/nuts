import React, { useState } from 'react';
import { UserProfile } from '../types';
import { loginWithEmail, registerProfile } from '../lib/neonService';
import { isNeonConfigured } from '../lib/neon';
import { UserAvatar } from './UserAvatar';
import { Database, Lock, Mail, User, ShieldCheck, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  availableUsers: UserProfile[];
  onLogin: (user: UserProfile) => void;
  onOpenNeonModal: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  availableUsers,
  onLogin,
  onOpenNeonModal,
}) => {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup fields
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [role, setRole] = useState('Senior Engineer');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const neonReady = isNeonConfigured();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (neonReady) {
        const user = await loginWithEmail(email, password);
        onLogin(user);
      } else {
        // Fallback: match from available offline users
        const matched = availableUsers.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase()
        );
        if (matched) {
          onLogin(matched);
        } else {
          // Allow login by creating temporary profile
          const tempUser: UserProfile = {
            id: `usr-${Date.now()}`,
            name: email.split('@')[0],
            nickname: email.split('@')[0],
            email: email.trim(),
            role: 'Member',
            department: 'Engineering',
          };
          onLogin(tempUser);
        }
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
      setError('Please enter your name and email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (neonReady) {
        const newUser = await registerProfile({
          name,
          email,
          nickname: nickname || name.toLowerCase().replace(/\s+/g, '_'),
          password,
          department,
          role,
          avatarUrl: avatarUrl || undefined,
        });
        onLogin(newUser);
      } else {
        const newUser: UserProfile = {
          id: `usr-${Date.now()}`,
          name: name.trim(),
          nickname: nickname.trim().replace(/^@/, '') || name.toLowerCase().replace(/\s+/g, '_'),
          email: email.trim(),
          role: role.trim() || 'Member',
          department: department.trim() || 'Engineering',
          avatarUrl: avatarUrl.trim() || undefined,
          avatar: avatarUrl.trim() || undefined,
        };
        onLogin(newUser);
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
            Create Account
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
                  placeholder="name@company.internal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-black"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-gray-700">Password</label>
                <span className="text-[10px] text-gray-400">Optional for demo accounts</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
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
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Form: Sign Up */}
        {tab === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:bg-white focus:border-black"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nickname</label>
                <input
                  type="text"
                  placeholder="alex_m"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:bg-white focus:border-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Work Email</label>
              <input
                type="email"
                required
                placeholder="alex.m@company.internal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:bg-white focus:border-black"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  placeholder="Engineering"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:bg-white focus:border-black"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role / Title</label>
                <input
                  type="text"
                  placeholder="Senior Engineer"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:bg-white focus:border-black"
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
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:bg-white focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Avatar Image URL <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:bg-white focus:border-black"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 rounded-md text-xs font-medium transition-colors shadow-sm"
            >
              {loading ? 'Creating account...' : 'Create Account & Sign In'}
            </button>
          </form>
        )}

        {/* Quick Team Member Sign-in */}
        <div className="mt-6 pt-5 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
              Quick Sign-in as Team Member
            </span>
            <span className="text-[10px] text-gray-400 font-mono">1-click demo</span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {availableUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => onLogin(u)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors text-left group"
              >
                <div className="flex items-center gap-2">
                  <UserAvatar user={u} size="sm" />
                  <div>
                    <div className="font-medium text-xs text-gray-900 group-hover:text-black">
                      {u.name}
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">
                      {u.nickname ? `@${u.nickname}` : u.email} • {u.role || u.department}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 group-hover:text-black font-medium">
                  Enter →
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
