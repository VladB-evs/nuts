/** @mentions in comments. Shared by the API (who was mentioned) and the UI (highlighting, suggestions). */

export interface Mentionable {
  id: string;
  nickname?: string;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A mention is "@nickname" not preceded by a word character, and not followed by one. */
const mentionRegex = (nickname: string) =>
  new RegExp(`(^|[^\\w@])@${escapeRegExp(nickname)}(?![\\w])`, 'i');

const withNickname = <T extends Mentionable>(users: T[]) =>
  users.filter((u): u is T & { nickname: string } => Boolean(u.nickname && u.nickname.trim()));

/** Ids of the users whose @nickname appears in the text. Longest nicknames are checked first. */
export function findMentionedIds(text: string, users: Mentionable[]): string[] {
  if (!text || !text.includes('@')) return [];
  const found = new Set<string>();
  let remaining = text;
  const sorted = [...withNickname(users)].sort((a, b) => b.nickname.length - a.nickname.length);
  for (const u of sorted) {
    const nick = u.nickname.replace(/^@/, '');
    if (!nick) continue;
    const re = mentionRegex(nick);
    if (re.test(remaining)) {
      found.add(u.id);
      // blank it out so a shorter nickname that is a prefix ("sam" in "@samantha") can't also match
      remaining = remaining.replace(new RegExp(mentionRegex(nick).source, 'gi'), (m, pre) => `${pre}`);
    }
  }
  return [...found];
}

export interface TextPart {
  text: string;
  mention: boolean;
}

/** Splits text into plain and @mention parts for rendering (never builds HTML). */
export function splitMentions(text: string, users: Mentionable[]): TextPart[] {
  const nicks = withNickname(users)
    .map((u) => u.nickname.replace(/^@/, ''))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  if (!text || nicks.length === 0 || !text.includes('@')) return [{ text, mention: false }];

  const re = new RegExp(`(^|[^\\w@])(@(?:${nicks.map(escapeRegExp).join('|')}))(?![\\w])`, 'gi');
  const parts: TextPart[] = [];
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const start = m.index + m[1].length;
    if (start > last) parts.push({ text: text.slice(last, start), mention: false });
    parts.push({ text: m[2], mention: true });
    last = start + m[2].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), mention: false });
  return parts.length ? parts : [{ text, mention: false }];
}

/** If the caret sits inside an "@partial" word, returns where it starts and what was typed after "@". */
export function activeMentionQuery(
  text: string,
  caret: number
): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const m = /(^|[^\w@])@([\w.-]{0,30})$/.exec(before);
  if (!m) return null;
  const start = before.length - m[2].length - 1; // index of "@"
  return { start, query: m[2] };
}
