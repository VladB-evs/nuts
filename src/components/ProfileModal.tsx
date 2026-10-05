import React, { useState, useEffect, useMemo } from 'react';
import { useIssues } from '../context/TicketContext';
import { UserProfile } from '../types';
import { UserAvatar } from './UserAvatar';
import { CustomSelect, SelectOption } from './CustomSelect';
import { X, Check, Link2, AtSign, Briefcase, Building, Sparkles } from 'lucide-react';
import { SecuritySection } from './SecuritySection';
import { neonAuthEnabled } from '../lib/neonAuth';

export const ProfileModal: React.FC = () => {
  const {
    isProfileModalOpen,
    setIsProfileModalOpen,
    currentUser,
    updateUserProfile,
    departments,
  } = useIssues();

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isProfileModalOpen && currentUser) {
      setName(currentUser.name || '');
      setNickname(currentUser.nickname || '');
      setRole(currentUser.role || '');
      setDepartment(currentUser.department || (departments[0]?.name ?? 'Engineering'));
      setAvatarUrl(currentUser.avatarUrl || currentUser.avatar || '');
      setSavedSuccess(false);
    }
  }, [isProfileModalOpen, currentUser, departments]);

  const departmentOptions: SelectOption[] = useMemo(() => {
    const list: SelectOption[] = departments.map((d) => ({
      value: d.name,
      label: d.name,
      badge: d.code,
      badgeClass: 'bg-gray-100 text-gray-800 border-gray-300 font-mono',
      description: d.description,
    }));
    if (department && !departments.some((d) => d.name.toLowerCase() === department.toLowerCase())) {
      list.push({
        value: department,
        label: department,
      });
    }
    return list;
  }, [departments, department]);

  if (!isProfileModalOpen || !currentUser) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Clean nickname: remove leading @ if user typed it
    const cleanedNick = nickname.trim().replace(/^@+/, '');

    updateUserProfile(currentUser.id, {
      name: name.trim(),
      nickname: cleanedNick || undefined,
      role: role.trim() || undefined,
      department: department.trim(),
      avatarUrl: avatarUrl.trim() || undefined,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setIsProfileModalOpen(false);
    }, 600);
  };

  const previewUser: UserProfile = {
    id: currentUser.id,
    email: currentUser.email,
    name: name.trim() || currentUser.name,
    nickname: nickname.trim().replace(/^@+/, '') || currentUser.nickname,
    role: role.trim() || currentUser.role || 'Member',
    department: department || currentUser.department,
    avatarUrl: avatarUrl.trim() || currentUser.avatarUrl,
    avatar: avatarUrl.trim() || currentUser.avatar,
  };

  const sampleAvatars = [
    { label: 'Avatar 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
    { label: 'Avatar 2', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
    { label: 'Avatar 3', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
    { label: 'Avatar 4', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-scrim/40 backdrop-blur-xs"
        onClick={() => setIsProfileModalOpen(false)}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white rounded-lg border border-gray-300 shadow-xl overflow-hidden z-10 animate-fade-in text-xs max-h-[92vh] flex flex-col select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-200 bg-gray-50 shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Edit Profile & Role</h2>
            <p className="text-[11px] text-gray-500 font-mono">
              Visible to all team members across tickets, comments, and audit logs
            </p>
          </div>
          <button
            onClick={() => setIsProfileModalOpen(false)}
            className="text-gray-400 hover:text-black p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Top Live Preview Card */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold block">
              Live Profile Preview
            </span>
            <div className="flex items-center gap-3 bg-white p-2.5 rounded border border-gray-200 shadow-2xs">
              <UserAvatar user={previewUser} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-gray-900 text-xs">
                    {previewUser.name}
                  </span>
                  {previewUser.nickname && (
                    <span className="text-gray-500 font-mono text-[11px]">
                      @{previewUser.nickname}
                    </span>
                  )}
                  <span className="text-[10px] font-semibold bg-gray-100 border border-gray-300 text-gray-800 px-1.5 py-0.2 rounded font-mono">
                    {previewUser.department}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 font-mono mt-0.5 truncate">
                  {previewUser.role || 'Member'}
                </p>
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-gray-700 font-medium mb-1 text-[11px]">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              className="w-full px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black font-sans text-xs"
            />
          </div>

          {/* Nickname & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-medium mb-1 text-[11px]">
                Nickname / Handle
              </label>
              <div className="relative">
                <AtSign className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="handle"
                  className="w-full pl-8 pr-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1 text-[11px]">
                Department *
              </label>
              <CustomSelect
                value={department}
                onChange={(val) => setDepartment(val)}
                options={departmentOptions}
              />
            </div>
          </div>

          {/* Department Role / Job Title */}
          <div>
            <label className="block text-gray-700 font-medium mb-1 text-[11px]">
              Role / Job Title (e.g. within Marketing, Sales, Engineering)
            </label>
            <div className="relative">
              <Briefcase className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Lead Growth Marketer, Senior Frontend Engineer"
                className="w-full pl-8 pr-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black text-xs"
              />
            </div>
            <p className="text-[10px] text-gray-400 font-mono mt-1">
              Visible on tickets, comments, and assignee tooltips so teammates know your exact role.
            </p>
          </div>

          {/* Profile Picture URL */}
          <div className="space-y-1.5">
            <label className="block text-gray-700 font-medium text-[11px]">
              Profile Picture URL (External Link)
            </label>
            <div className="relative">
              <Link2 className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full pl-8 pr-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:border-black font-mono text-xs"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
              <span>External link only — no uploads stored on server.</span>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="text-gray-500 hover:text-red-600 underline"
                >
                  Clear link
                </button>
              )}
            </div>

            {/* Quick sample links for testing */}
            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
              <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Samples:
              </span>
              {sampleAvatars.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatarUrl(s.url)}
                  className="text-[10px] font-mono bg-gray-100 hover:bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200 transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="text-[11px] font-mono text-emerald-600 flex items-center gap-1">
              {savedSuccess && (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Profile updated!</span>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="px-3 py-1.5 text-gray-600 hover:text-black rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-black text-white font-medium rounded hover:bg-gray-800 transition-colors shadow-sm"
              >
                Save Profile
              </button>
            </div>
          </div>
        </form>

        {neonAuthEnabled && <SecuritySection />}
      </div>
    </div>
  );
};
