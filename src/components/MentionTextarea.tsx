import React, { useMemo, useRef, useState } from 'react';
import { activeMentionQuery } from '../lib/mentions';
import { UserAvatar } from './UserAvatar';
import type { UserProfile } from '../types';

interface Props {
  value: string;
  onChange: (value: string) => void;
  users: UserProfile[]; // people who can be mentioned
  placeholder?: string;
  rows?: number;
  className?: string;
}

/** A textarea that suggests teammates while you type "@". Arrow keys + Enter/Tab pick one, Esc closes. */
export const MentionTextarea: React.FC<Props> = ({ value, onChange, users, placeholder, rows = 3, className = '' }) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState(0);
  const [highlight, setHighlight] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  const query = activeMentionQuery(value, caret);
  const suggestions = useMemo(() => {
    if (!query) return [];
    const q = query.query.toLowerCase();
    return users
      .filter((u) => u.nickname && (u.nickname.toLowerCase().startsWith(q) || u.name.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [query?.query, query?.start, users]);

  const open = Boolean(query) && suggestions.length > 0 && dismissedAt !== query?.start;

  const pick = (user: UserProfile) => {
    if (!query || !user.nickname) return;
    const nick = user.nickname.replace(/^@/, '');
    const next = `${value.slice(0, query.start)}@${nick} ${value.slice(caret)}`;
    onChange(next);
    const pos = query.start + nick.length + 2;
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(pos, pos);
      setCaret(pos);
    });
    setHighlight(0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      pick(suggestions[Math.min(highlight, suggestions.length - 1)]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDismissedAt(query!.start);
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={ref}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setCaret(e.target.selectionStart);
          setHighlight(0);
        }}
        onKeyDown={onKeyDown}
        onKeyUp={(e) => setCaret((e.target as HTMLTextAreaElement).selectionStart)}
        onClick={(e) => setCaret((e.target as HTMLTextAreaElement).selectionStart)}
        aria-autocomplete="list"
        aria-expanded={open}
        className={className}
      />
      {open && (
        <ul
          role="listbox"
          aria-label="Mention a teammate"
          className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-md shadow-xl overflow-hidden text-xs"
        >
          {suggestions.map((u, i) => (
            <li
              key={u.id}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus in the textarea
                pick(u);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`flex items-center gap-2 px-2.5 py-1.5 cursor-pointer ${i === highlight ? 'bg-gray-100' : ''}`}
            >
              <UserAvatar user={u} size="xs" />
              <span className="font-medium text-gray-900 truncate">{u.name}</span>
              <span className="font-mono text-[10px] text-gray-500">@{u.nickname}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
