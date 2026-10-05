import React, { useMemo } from 'react';
import { splitMentions } from '../lib/mentions';
import type { UserProfile } from '../types';

/** Plain comment text with @mentions of known teammates highlighted. Renders text nodes only, never HTML. */
export const MentionText: React.FC<{ text: string; users: UserProfile[]; className?: string }> = ({
  text,
  users,
  className = '',
}) => {
  const parts = useMemo(() => splitMentions(text, users), [text, users]);
  return (
    <p className={className}>
      {parts.map((part, i) =>
        part.mention ? (
          <span key={i} className="font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded px-0.5">
            {part.text}
          </span>
        ) : (
          <React.Fragment key={i}>{part.text}</React.Fragment>
        )
      )}
    </p>
  );
};
