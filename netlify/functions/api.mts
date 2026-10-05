/**
 * NUTS API — the only code that talks to the database.
 *
 * The browser never sees DATABASE_URL. It calls `POST /api` with `{ action, args }`;
 * identity comes from an HttpOnly session cookie, and every action is scoped to the
 * caller's organization on the server. Nothing in `args` is trusted for identity.
 */
import { neon } from '@neondatabase/serverless';
import { randomBytes, randomInt, randomUUID, scrypt, createHash, timingSafeEqual } from 'node:crypto';
import type {
  Comment,
  Department,
  EmploymentStatus,
  Issue,
  Organization,
  UserProfile,
} from '../../src/types';
import { findMentionedIds } from '../../src/lib/mentions';
import { isStatusAllowed, sanitizeWorkflow } from '../../src/lib/workflow';
import { cleanViewName, sanitizeViewConfig } from '../../src/lib/savedViews';

// ============================================================================
// Setup
// ============================================================================

const SESSION_COOKIE = 'nuts_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 256 * 1024;

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let sqlClient: ReturnType<typeof neon> | null = null;
const getSql = () => {
  if (!sqlClient) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new HttpError(503, 'Database is not configured on the server.');
    sqlClient = neon(url);
  }
  return sqlClient;
};

/**
 * Runs queries in one transaction scoped to an organization.
 *
 * The API connects as the restricted `nuts_app` role, so Row Level Security (migration 004)
 * only lets these queries see and write rows of `orgId`; with no org set, nothing is visible.
 * `actorId` tells the issue-history trigger who made the change. Pass queries built with the
 * shared `sql` tag; results come back in order, without the scoping statement.
 */
type Scope = { orgId: string; actorId?: string };
const tx = async (scope: Scope, ...queries: any[]): Promise<any[][]> => {
  const sql = getSql();
  const results = await (sql as any).transaction([
    sql`SELECT set_config('app.org_id', ${scope.orgId}, true), set_config('nuts.actor_id', ${scope.actorId ?? ''}, true);`,
    ...queries,
  ]);
  return results.slice(1) as any[][];
};

/** Maps Postgres integrity/RLS errors to friendly responses. */
const friendlyDbError = (err: any): HttpError | null => {
  if (err?.code === '23505') {
    const c = String(err.constraint || '');
    if (c.includes('email')) return new HttpError(409, 'An account with this email already exists.');
    if (c.includes('nickname')) return new HttpError(409, 'That nickname is already in use.');
    if (c.includes('organizations')) return new HttpError(409, 'That organization code is already in use.');
    return new HttpError(409, 'That value is already in use.');
  }
  if (err?.code === '42501') return new HttpError(409, 'That item already exists.');
  return null;
};

// ============================================================================
// Passwords & session tokens
// ============================================================================

const scryptAsync = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)))
  );

const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
};

const safeEqualHex = (a: string, b: string): boolean => {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ab.length === bb.length && ab.length > 0 && timingSafeEqual(ab, bb);
};

// Pre-API accounts stored SHA-256(password + static salt). Accepted once, then upgraded to scrypt.
const LEGACY_SALT = ':nuts_multi_tenant_salt_2026';
const legacyHash = (password: string) =>
  createHash('sha256').update(password + LEGACY_SALT).digest('hex');

const DUMMY_HASH = `scrypt$${'00'.repeat(16)}$${'00'.repeat(64)}`;

/** Returns whether the password matches, and whether the stored hash should be upgraded. */
const verifyPassword = async (
  password: string,
  stored: string | null
): Promise<{ ok: boolean; upgrade: boolean }> => {
  const value = stored || DUMMY_HASH; // always do the work so timing doesn't reveal unknown emails
  if (value.startsWith('scrypt$')) {
    const [, saltHex, keyHex] = value.split('$');
    const key = await scryptAsync(password, Buffer.from(saltHex, 'hex'));
    return { ok: Boolean(stored) && safeEqualHex(key.toString('hex'), keyHex), upgrade: false };
  }
  return { ok: safeEqualHex(legacyHash(password), value), upgrade: true };
};

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

// ============================================================================
// Throttling (failed logins and failed invite-code guesses)
// ============================================================================

const THROTTLE_WINDOW_MIN = 15;
const THROTTLE_LIMITS = { email: 5, ip: 20 };

const clientIp = (req: Request): string =>
  req.headers.get('x-nf-client-connection-ip') ||
  req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
  'unknown';

type Throttle = { kind: 'login' | 'join'; email?: string; ip: string };

/** Stored as hashes so the table holds no readable emails or IPs. */
const throttleKeys = (t: Throttle): Array<['email' | 'ip', string]> => {
  const keys: Array<['email' | 'ip', string]> = [['ip', hashToken(`ip:${t.ip}`)]];
  if (t.email) keys.push(['email', hashToken(`email:${t.email}`)]);
  return keys;
};

const assertNotThrottled = async (t: Throttle) => {
  const sql = getSql();
  const keys = throttleKeys(t);
  const emailKey = keys.find(([k]) => k === 'email')?.[1] ?? '';
  const ipKey = keys.find(([k]) => k === 'ip')![1];
  const rows = (await sql`
    SELECT key_kind, COUNT(*)::int AS n
    FROM public.auth_attempts
    WHERE kind = ${t.kind}
      AND created_at > NOW() - make_interval(mins => ${THROTTLE_WINDOW_MIN})
      AND ((key_kind = 'ip' AND key = ${ipKey}) OR (key_kind = 'email' AND key = ${emailKey}))
    GROUP BY key_kind;
  `) as any[];
  for (const r of rows) {
    if (r.n >= THROTTLE_LIMITS[r.key_kind as 'email' | 'ip']) {
      throw new HttpError(
        429,
        `Too many failed attempts. Please wait ${THROTTLE_WINDOW_MIN} minutes and try again.`
      );
    }
  }
};

const recordFailure = async (t: Throttle) => {
  const sql = getSql();
  const keys = throttleKeys(t);
  await sql.transaction([
    ...keys.map(
      ([keyKind, key]) =>
        sql`INSERT INTO public.auth_attempts (kind, key_kind, key) VALUES (${t.kind}, ${keyKind}, ${key});`
    ),
    sql`DELETE FROM public.auth_attempts WHERE created_at < NOW() - INTERVAL '1 day';`,
  ]);
};

const clearEmailFailures = async (t: Throttle) => {
  const emailKey = throttleKeys(t).find(([k]) => k === 'email')?.[1];
  if (emailKey) {
    await getSql()`DELETE FROM public.auth_attempts WHERE kind = ${t.kind} AND key_kind = 'email' AND key = ${emailKey};`;
  }
};

const PASSWORD_RULES = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// ============================================================================
// Request context
// ============================================================================

interface Ctx {
  req: Request;
  user: AuthedUser | null;
  setCookie: (value: string) => void;
}

type AuthedUser = UserProfile & { orgId: string };

const parseCookies = (header: string | null): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const part of (header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
};

const sessionCookie = (req: Request, token: string, maxAgeSec: number) => {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSec}${secure}`;
};

const mapProfile = (r: any, org?: Organization): UserProfile => ({
  id: r.id,
  orgId: r.org_id || undefined,
  organization:
    org ||
    (r.organization_id
      ? { id: r.organization_id, name: r.organization_name, code: r.organization_code }
      : undefined),
  isAdmin: Boolean(r.is_admin),
  status: (r.status as EmploymentStatus) || 'active',
  departureReason: r.departure_reason || undefined,
  departedAt: r.departed_at ? new Date(r.departed_at).toISOString() : undefined,
  name: r.name,
  nickname: r.nickname || '',
  email: r.email,
  role: r.role || 'Member',
  department: r.department || '',
  avatarUrl: r.avatar_url || '',
  avatar: r.avatar_url || '',
});

const loadSessionUser = async (req: Request): Promise<AuthedUser | null> => {
  const token = parseCookies(req.headers.get('cookie'))[SESSION_COOKIE];
  if (!token) return null;
  const rows = (await getSql()`SELECT * FROM public.app_lookup_session(${hashToken(token)});`) as any[];
  if (!rows.length || !rows[0].org_id) return null;
  return mapProfile(rows[0]) as AuthedUser;
};

const requireUser = (ctx: Ctx): AuthedUser => {
  if (!ctx.user) throw new HttpError(401, 'Please sign in.');
  if (ctx.user.status === 'departed') throw new HttpError(403, 'This account has been deactivated.');
  return ctx.user;
};

const requireAdmin = (ctx: Ctx): AuthedUser => {
  const user = requireUser(ctx);
  if (!user.isAdmin) throw new HttpError(403, 'Only workspace administrators can do this.');
  return user;
};

const str = (v: unknown, max = 5000): string => (typeof v === 'string' ? v.slice(0, max) : '');

/** Avatars are external image links; only plain http(s) URLs are accepted. */
const httpUrl = (v: unknown): string | null => {
  const raw = str(v, 2000).trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
};

const startSession = async (ctx: Ctx, userId: string, orgId: string) => {
  const sql = getSql();
  const token = randomBytes(32).toString('hex');
  await tx(
    { orgId },
    sql`INSERT INTO public.sessions (user_id, org_id, token, expires_at)
        VALUES (${userId}, ${orgId}, ${hashToken(token)}, ${new Date(Date.now() + SESSION_TTL_MS).toISOString()});`
  );
  ctx.setCookie(sessionCookie(ctx.req, token, SESSION_TTL_MS / 1000));
};

// ============================================================================
// Actions
// ============================================================================

const DEFAULT_ENG_FIELDS = [
  { id: 'issueType', name: 'Issue Type', type: 'select', options: ['Bug', 'Feature', 'Update', 'Adjustment'], defaultValue: 'Bug', required: true, showAsFilter: true },
  { id: 'environment', name: 'Environment Stage', type: 'select', options: ['LOCAL', 'STAGING', 'PROD'], defaultValue: 'LOCAL' },
  { id: 'devScope', name: 'Development Layer', type: 'select', options: ['Frontend only', 'Backend only', 'Both (Frontend + Backend)'], defaultValue: 'Both (Frontend + Backend)' },
];

const ISSUE_PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
const ISSUE_STATUSES = ['NEW', 'ASSIGNED', 'ACCEPTED', 'PENDING', 'COMPLETED', 'VERIFIED', 'CLOSED'];

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode = (len: number) =>
  Array.from({ length: len }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');

// ============================================================================
// Validation and notification helpers
// ============================================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);
const MAX_BULK = 100;
const MAX_SAVED_VIEWS = 25;

const uuidList = (v: unknown, max: number): string[] => {
  if (!Array.isArray(v) || v.length === 0) throw new HttpError(400, 'Nothing selected.');
  if (v.length > max) throw new HttpError(400, `Select at most ${max} tickets at a time.`);
  const out = new Set<string>();
  for (const id of v) {
    if (!isUuid(id)) throw new HttpError(400, 'Invalid id.');
    out.add(id.toLowerCase());
  }
  return [...out];
};

const snippet = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, 140);

type NotifyKind = 'assigned' | 'mentioned' | 'commented' | 'status_changed' | 'priority_changed';

/**
 * Notification statements. They are built here and run inside the same transaction as the change
 * that caused them, so a ticket never changes without its notifications (or the other way round).
 * Ids go in as one JSON array parameter and are cast to uuid, so nothing is concatenated into SQL.
 * Recipients must belong to the org and be active; the person who acted is never notified.
 */
const notifyFollowers = (
  orgId: string,
  actorId: string,
  issueIds: string[],
  kind: NotifyKind,
  detail: string | null,
  excludeUserIds: string[] = []
) => getSql()`
  INSERT INTO public.notifications (org_id, user_id, actor_id, issue_id, kind, detail)
  SELECT DISTINCT i.org_id, r.user_id, ${actorId}::uuid, i.id, ${kind}::text, ${detail}::text
  FROM public.issues i
  CROSS JOIN LATERAL (
    SELECT w.user_id FROM public.issue_watchers w WHERE w.issue_id = i.id
    UNION SELECT i.reporter_id WHERE i.reporter_id IS NOT NULL
    UNION SELECT i.assignee_id WHERE i.assignee_id IS NOT NULL
  ) r
  JOIN public.profiles p ON p.id = r.user_id AND p.org_id = i.org_id AND COALESCE(p.status, 'active') <> 'departed'
  WHERE i.org_id = ${orgId}::uuid
    AND i.id IN (SELECT jsonb_array_elements_text(${JSON.stringify(issueIds)}::jsonb)::uuid)
    AND r.user_id <> ${actorId}::uuid
    AND r.user_id NOT IN (SELECT jsonb_array_elements_text(${JSON.stringify(excludeUserIds)}::jsonb)::uuid);
`;

const notifyUsers = (
  orgId: string,
  actorId: string,
  issueIds: string[],
  userIds: string[],
  kind: NotifyKind,
  detail: string | null
) => getSql()`
  INSERT INTO public.notifications (org_id, user_id, actor_id, issue_id, kind, detail)
  SELECT i.org_id, p.id, ${actorId}::uuid, i.id, ${kind}::text, ${detail}::text
  FROM public.issues i
  CROSS JOIN public.profiles p
  WHERE i.org_id = ${orgId}::uuid AND p.org_id = ${orgId}::uuid
    AND COALESCE(p.status, 'active') <> 'departed'
    AND p.id <> ${actorId}::uuid
    AND i.id IN (SELECT jsonb_array_elements_text(${JSON.stringify(issueIds)}::jsonb)::uuid)
    AND p.id IN (SELECT jsonb_array_elements_text(${JSON.stringify(userIds)}::jsonb)::uuid);
`;

const watchIssues = (orgId: string, issueIds: string[], userIds: string[]) => getSql()`
  INSERT INTO public.issue_watchers (issue_id, user_id)
  SELECT i.id, p.id
  FROM public.issues i
  CROSS JOIN public.profiles p
  WHERE i.org_id = ${orgId}::uuid AND p.org_id = ${orgId}::uuid
    AND COALESCE(p.status, 'active') <> 'departed'
    AND i.id IN (SELECT jsonb_array_elements_text(${JSON.stringify(issueIds)}::jsonb)::uuid)
    AND p.id IN (SELECT jsonb_array_elements_text(${JSON.stringify(userIds)}::jsonb)::uuid)
  ON CONFLICT DO NOTHING;
`;

/**
 * True once migration 006 (watchers, notifications, ...) is in the database. Everyday edits keep
 * working before it is run; they just skip watching and notifying. Only a positive answer is cached.
 */
let inAppReady = false;
const inAppAvailable = async (): Promise<boolean> => {
  if (inAppReady) return true;
  const rows = (await getSql()`SELECT to_regclass('public.notifications') IS NOT NULL AS ok;`) as any[];
  inAppReady = Boolean(rows[0]?.ok);
  if (!inAppReady) console.warn('Migration 006 has not been run: watching and notifications are disabled.');
  return inAppReady;
};

const actions: Record<string, (ctx: Ctx, args: any) => Promise<unknown>> = {
  // ---------------------------------------------------------------- auth ----
  async register(ctx, a) {
    const sql = getSql();
    const orgMode = a.orgMode === 'create' ? 'create' : 'join';
    const name = str(a.name, 200).trim();
    const email = str(a.email, 320).trim().toLowerCase();
    const nickname = str(a.nickname, 100).trim().replace(/^@/, '');
    const role = str(a.role, 200).trim() || 'Member';
    const department = str(a.department, 200).trim();
    const avatarUrl = httpUrl(a.avatarUrl);
    const password = str(a.password, 1000);

    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new HttpError(400, 'Please enter your full name and a valid work email.');
    }
    if (!PASSWORD_RULES.test(password)) {
      throw new HttpError(
        400,
        'Password must have at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character.'
      );
    }

    const hashed = await hashPassword(password);
    const userId = randomUUID();
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

    let org: Organization;
    const statements = [];

    if (orgMode === 'create') {
      const orgName = str(a.orgName, 200).trim();
      if (!orgName) throw new HttpError(400, 'Please enter a company or organization name.');
      let code = str(a.orgCode, 64).trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
      if (code && code.length < 6) {
        throw new HttpError(400, 'A custom organization code must be at least 6 characters.');
      }
      if (!code) {
        const slug = orgName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'ORG';
        code = `${slug}-${randomCode(8)}`; // doubles as the invite secret, so keep it unguessable
      }
      org = { id: randomUUID(), name: orgName, code, createdByEmail: email };
      statements.push(
        sql`INSERT INTO public.organizations (id, name, code, created_by_email)
            VALUES (${org.id}, ${org.name}, ${org.code}, ${email});`,
        sql`INSERT INTO public.departments (id, org_id, name, code, description, custom_fields)
            VALUES (${`eng-${org.id}`}, ${org.id}, 'Engineering', 'DEV',
                    'Core product development, bug fixes, and feature engineering.',
                    ${JSON.stringify(DEFAULT_ENG_FIELDS)});`
      );
    } else {
      const code = str(a.orgCode, 64).trim();
      if (!code) throw new HttpError(400, 'Please enter your company organization invite code.');
      const throttle: Throttle = { kind: 'join', ip: clientIp(ctx.req) };
      await assertNotThrottled(throttle);
      const found = (await sql`SELECT * FROM public.app_find_org_by_code(${code});`) as any[];
      if (!found.length) {
        await recordFailure(throttle);
        throw new HttpError(404, 'That organization code was not found. Please check with your team admin.');
      }
      org = { id: found[0].id, name: found[0].name, code: found[0].code };
    }

    statements.push(
      sql`INSERT INTO public.profiles
            (id, org_id, name, email, nickname, role, department, avatar_url, password_hash, is_admin)
          VALUES (${userId}, ${org.id}, ${name}, ${email}, ${nickname || null}, ${role}, ${department},
                  ${avatarUrl}, ${hashed}, ${orgMode === 'create'});`,
      sql`INSERT INTO public.sessions (user_id, org_id, token, expires_at)
          VALUES (${userId}, ${org.id}, ${hashToken(token)}, ${expiresAt});`
    );

    try {
      await tx({ orgId: org.id }, ...statements);
    } catch (err: any) {
      throw friendlyDbError(err) || err;
    }

    ctx.setCookie(sessionCookie(ctx.req, token, SESSION_TTL_MS / 1000));
    return {
      user: mapProfile(
        {
          id: userId, org_id: org.id, name, nickname, email, role, department,
          avatar_url: avatarUrl, is_admin: orgMode === 'create', status: 'active',
        },
        org
      ),
    };
  },

  async login(ctx, a) {
    const sql = getSql();
    const email = str(a.email, 320).trim().toLowerCase();
    const password = str(a.password, 1000);
    const fail = () => new HttpError(401, 'Incorrect email or password.');
    if (!email || !password) throw fail();

    const throttle: Throttle = { kind: 'login', email, ip: clientIp(ctx.req) };
    await assertNotThrottled(throttle);

    const rows = (await sql`SELECT * FROM public.app_lookup_login(${email});`) as any[];
    const row = rows[0];
    const { ok, upgrade } = await verifyPassword(password, row?.password_hash || null);
    if (!row || !ok || !row.org_id) {
      await recordFailure(throttle);
      throw fail();
    }
    await clearEmailFailures(throttle);

    if (upgrade) {
      await tx(
        { orgId: row.org_id },
        sql`UPDATE public.profiles SET password_hash = ${await hashPassword(password)} WHERE id = ${row.id};`
      );
    }
    await startSession(ctx, row.id, row.org_id);
    return { user: mapProfile(row) };
  },

  async me(ctx) {
    return { user: ctx.user };
  },

  async logout(ctx) {
    const token = parseCookies(ctx.req.headers.get('cookie'))[SESSION_COOKIE];
    if (token) {
      await getSql()`SELECT public.app_delete_session(${hashToken(token)});`;
    }
    ctx.setCookie(sessionCookie(ctx.req, '', 0));
    return { ok: true };
  },

  // ---------------------------------------------------------------- data ----
  async fetchAll(ctx) {
    const sql = getSql();
    const { orgId, id: userId } = requireUser(ctx);

    const [deptRows, profileRows, issueRows, commentRows, historyRows] = await tx(
      { orgId, actorId: userId },
      sql`SELECT * FROM public.departments WHERE org_id = ${orgId} ORDER BY code ASC;`,
      sql`SELECT id, org_id, name, nickname, email, role, department, avatar_url, is_admin, status, departure_reason, departed_at FROM public.profiles WHERE org_id = ${orgId} ORDER BY name ASC;`,
      sql`SELECT * FROM public.issues WHERE org_id = ${orgId} ORDER BY number DESC;`,
      sql`SELECT c.* FROM public.comments c JOIN public.issues i ON c.issue_id = i.id WHERE i.org_id = ${orgId} ORDER BY c.created_at ASC;`,
      sql`SELECT h.* FROM public.issue_history h JOIN public.issues i ON h.issue_id = i.id WHERE i.org_id = ${orgId} ORDER BY h.created_at DESC;`
    );

    // Per-user extras (stars, watching, saved views). If migration 006 has not been run yet these
    // tables don't exist: carry on without them rather than taking the whole app down.
    let starred = new Set<string>();
    let watching = new Set<string>();
    let savedViews: { id: string; name: string; config: unknown }[] = [];
    try {
      const [starRows, watchRows, viewRows] = await tx(
        { orgId, actorId: userId },
        sql`SELECT issue_id FROM public.issue_stars WHERE user_id = ${userId}::uuid;`,
        sql`SELECT issue_id FROM public.issue_watchers WHERE user_id = ${userId}::uuid;`,
        sql`SELECT id, name, config FROM public.saved_views WHERE user_id = ${userId}::uuid ORDER BY lower(name) ASC;`
      );
      starred = new Set(starRows.map((r: any) => r.issue_id));
      watching = new Set(watchRows.map((r: any) => r.issue_id));
      savedViews = viewRows.map((r: any) => ({ id: r.id, name: r.name, config: sanitizeViewConfig(r.config) }));
    } catch (err: any) {
      if (err?.code !== '42P01') throw err;
      console.warn('fetchAll: migration 006 has not been run; stars/watching/saved views are unavailable.');
    }

    const users = profileRows.map((p) => mapProfile(p));
    const userMap = new Map(users.map((u) => [u.id, u]));
    const defaultUser: UserProfile = users[0] || {
      id: 'default', name: 'Team Member', nickname: 'member',
      email: 'team@nuts.internal', role: 'Member', department: 'Engineering',
    };

    const departments: Department[] = deptRows.map((d) => ({
      id: d.id,
      orgId: d.org_id,
      name: d.name,
      code: d.code,
      description: d.description || '',
      customFields: Array.isArray(d.custom_fields) ? d.custom_fields : [],
      workflow: (() => {
        const w = sanitizeWorkflow(d.workflow);
        return w.ok && w.value ? w.value : undefined;
      })(),
    }));

    const commentsByIssue = new Map<string, Comment[]>();
    for (const c of commentRows) {
      const list = commentsByIssue.get(c.issue_id) || [];
      list.push({
        id: c.id,
        author: userMap.get(c.author_id) || defaultUser,
        text: c.text,
        createdAt: c.created_at,
        statusChange: c.status_change || undefined,
      });
      commentsByIssue.set(c.issue_id, list);
    }

    const historyByIssue = new Map<string, any[]>();
    for (const h of historyRows) {
      const list = historyByIssue.get(h.issue_id) || [];
      list.push({
        id: h.id,
        actor: userMap.get(h.actor_id) || defaultUser,
        field: h.field_name,
        oldValue: h.old_value || '',
        newValue: h.new_value || '',
        message: h.message || '',
        createdAt: h.created_at,
      });
      historyByIssue.set(h.issue_id, list);
    }

    const issues: Issue[] = issueRows.map((row) => {
      const customAttrs: Record<string, any> =
        row.custom_attributes && typeof row.custom_attributes === 'object' ? row.custom_attributes : {};
      return {
        id: row.id,
        orgId: row.org_id,
        number: Number(row.number),
        code: row.code,
        title: row.title,
        description: row.description || '',
        departmentId: row.department_id,
        priority: row.priority,
        status: row.status,
        customAttributes: customAttrs,
        linkedIssues: Array.isArray(customAttrs.linkedIssues) ? customAttrs.linkedIssues : [],
        issueType: row.issue_type || undefined,
        environment: row.environment || undefined,
        devScope: row.dev_scope || undefined,
        assignee: row.assignee_id ? userMap.get(row.assignee_id) || null : null,
        reporter: userMap.get(row.reporter_id) || defaultUser,
        starred: starred.has(row.id),
        watching: watching.has(row.id),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        comments: commentsByIssue.get(row.id) || [],
        history: historyByIssue.get(row.id) || [],
      };
    });

    return { departments, users, issues, savedViews };
  },

  async createIssue(ctx, a) {
    const sql = getSql();
    const user = requireUser(ctx);
    const d = a.data || {};

    // Foreign-key checks bypass RLS, so department and assignee must be verified explicitly.
    const [dept, assignee] = await tx(
      { orgId: user.orgId },
      sql`SELECT custom_fields, to_jsonb(departments)->'workflow' AS workflow FROM public.departments WHERE id = ${str(d.departmentId, 200)} AND org_id = ${user.orgId};`,
      sql`SELECT id FROM public.profiles WHERE id = ${d.assigneeId ? str(d.assigneeId, 100) : null} AND org_id = ${user.orgId};`
    );
    if (!dept.length) throw new HttpError(400, 'Unknown department.');
    if (d.assigneeId && !assignee.length) throw new HttpError(400, 'Unknown assignee.');

    // Every ticket needs a title, description, priority and a value for each department property
    // (the UI enforces this too; the API must not rely on it).
    if (!str(d.title, 500).trim()) throw new HttpError(400, 'A title is required.');
    if (!str(d.description, 50000).trim()) throw new HttpError(400, 'A description is required.');
    if (!ISSUE_PRIORITIES.includes(d.priority)) throw new HttpError(400, 'A valid priority is required.');
    const attrs = d.customAttributes && typeof d.customAttributes === 'object' ? d.customAttributes : {};
    const deptFields: { id: string; name: string }[] = Array.isArray(dept[0].custom_fields)
      ? dept[0].custom_fields
      : [];
    for (const f of deptFields) {
      if (!String(attrs[f.id] ?? '').trim()) throw new HttpError(400, `${f.name} is required.`);
    }
    const assigneeId: string | null = d.assigneeId ? assignee[0].id : null;

    const status = ISSUE_STATUSES.includes(d.status) ? d.status : 'NEW';
    if (!isStatusAllowed(dept[0].workflow, status)) {
      throw new HttpError(400, 'That status is not used by this department.');
    }

    // The id is chosen here so the follow-up rows (watchers, notifications) can join the same
    // transaction as the insert.
    const issueId = randomUUID();
    const followUps: any[] = [];
    if (await inAppAvailable()) {
      followUps.push(watchIssues(user.orgId, [issueId], [user.id, ...(assigneeId ? [assigneeId] : [])]));
      if (assigneeId) {
        followUps.push(notifyUsers(user.orgId, user.id, [issueId], [assigneeId], 'assigned', null));
      }
    }

    const [rows] = await tx(
      { orgId: user.orgId, actorId: user.id },
      sql`
      INSERT INTO public.issues (
        id, org_id, title, description, department_id, priority, status,
        custom_attributes, issue_type, environment, dev_scope, assignee_id, reporter_id
      ) VALUES (
        ${issueId}::uuid, ${user.orgId}, ${str(d.title, 500)}, ${str(d.description, 50000)}, ${str(d.departmentId, 200)},
        ${str(d.priority, 2)}, ${status}, ${JSON.stringify(d.customAttributes || {})},
        ${str(d.issueType, 40) || null}, ${str(d.environment, 40) || null}, ${str(d.devScope, 40) || null},
        ${assigneeId}, ${user.id}
      )
      RETURNING *;
    `,
      ...followUps
    );
    const r = rows[0];
    const issue: Issue = {
      id: r.id,
      orgId: r.org_id,
      number: Number(r.number),
      code: r.code,
      title: r.title,
      description: r.description || '',
      departmentId: r.department_id,
      priority: r.priority,
      status: r.status,
      customAttributes: d.customAttributes || {},
      issueType: d.issueType,
      environment: d.environment,
      devScope: d.devScope,
      assignee: null,
      reporter: user,
      starred: false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      comments: [],
      history: [
        {
          id: `h-init-${r.id}`,
          actor: user,
          field: 'Issue',
          oldValue: '',
          newValue: 'Created',
          message: `Created issue ${r.code}`,
          createdAt: r.created_at,
        },
      ],
    };
    return { issue };
  },

  async updateIssue(ctx, a) {
    const sql = getSql();
    const user = requireUser(ctx);
    const id = str(a.issueId, 100);
    const u = a.updates || {};
    if (!isUuid(id)) throw new HttpError(404, 'Issue not found.');

    const [own] = await tx(
      { orgId: user.orgId },
      sql`SELECT i.status, i.priority, i.assignee_id, to_jsonb(d)->'workflow' AS workflow
          FROM public.issues i JOIN public.departments d ON d.id = i.department_id
          WHERE i.id = ${id}::uuid AND i.org_id = ${user.orgId}::uuid;`
    );
    if (!own.length) throw new HttpError(404, 'Issue not found.');
    const before = own[0];

    const status = u.status !== undefined ? str(u.status, 20) : undefined;
    if (status !== undefined) {
      if (!ISSUE_STATUSES.includes(status)) throw new HttpError(400, 'Unknown status.');
      if (!isStatusAllowed(before.workflow, status)) {
        throw new HttpError(400, 'That status is not used by this department.');
      }
    }
    const priority = u.priority !== undefined ? str(u.priority, 2) : undefined;
    if (priority !== undefined && !ISSUE_PRIORITIES.includes(priority)) {
      throw new HttpError(400, 'Unknown priority.');
    }

    // History rows are written by `trigger_track_issue_changes`, which reads the actor from the
    // transaction. Everything runs in one transaction so edits are atomic.
    const statements: any[] = [];

    if (status !== undefined) {
      statements.push(sql`UPDATE public.issues SET status = ${status}, updated_at = NOW() WHERE id = ${id};`);
    }
    if (priority !== undefined) {
      statements.push(sql`UPDATE public.issues SET priority = ${priority}, updated_at = NOW() WHERE id = ${id};`);
    }
    if (u.title !== undefined) {
      statements.push(sql`UPDATE public.issues SET title = ${str(u.title, 500)}, updated_at = NOW() WHERE id = ${id};`);
    }
    if (u.description !== undefined) {
      statements.push(sql`UPDATE public.issues SET description = ${str(u.description, 50000)}, updated_at = NOW() WHERE id = ${id};`);
    }

    let newAssigneeId: string | null | undefined; // undefined = not changing
    if (u.assignee !== undefined) {
      newAssigneeId = null;
      if (u.assignee) {
        const [found] = await tx(
          { orgId: user.orgId },
          sql`SELECT id FROM public.profiles
              WHERE id = ${str(u.assignee.id, 100)} AND org_id = ${user.orgId}
                AND COALESCE(status, 'active') <> 'departed';`
        );
        if (!found.length) throw new HttpError(400, 'Unknown assignee.');
        newAssigneeId = found[0].id;
      }
      statements.push(sql`UPDATE public.issues SET assignee_id = ${newAssigneeId}, updated_at = NOW() WHERE id = ${id};`);
    }
    // (Starring is per user now and goes through `toggleStar`, not through ticket edits.)
    if (u.customAttributes !== undefined) {
      statements.push(sql`UPDATE public.issues SET custom_attributes = ${JSON.stringify(u.customAttributes)}, updated_at = NOW() WHERE id = ${id};`);
    }

    // Who hears about it
    if (await inAppAvailable()) {
      const assigneeChanged =
        newAssigneeId !== undefined && (newAssigneeId ?? null) !== (before.assignee_id ?? null);
      if (assigneeChanged && newAssigneeId) {
        statements.push(watchIssues(user.orgId, [id], [newAssigneeId]));
        statements.push(notifyUsers(user.orgId, user.id, [id], [newAssigneeId], 'assigned', null));
      }
      const alreadyTold = assigneeChanged && newAssigneeId ? [newAssigneeId] : [];
      if (status !== undefined && status !== before.status) {
        statements.push(notifyFollowers(user.orgId, user.id, [id], 'status_changed', `to ${status}`, alreadyTold));
      }
      if (priority !== undefined && priority !== before.priority) {
        statements.push(notifyFollowers(user.orgId, user.id, [id], 'priority_changed', `to ${priority}`, alreadyTold));
      }
    }

    if (statements.length) await tx({ orgId: user.orgId, actorId: user.id }, ...statements);
    return { ok: true };
  },

  async addComment(ctx, a) {
    const sql = getSql();
    const user = requireUser(ctx);
    const issueId = str(a.issueId, 100);
    const text = str(a.text, 50000);
    if (!isUuid(issueId)) throw new HttpError(404, 'Issue not found.');
    const newStatus = a.newStatus ? str(a.newStatus, 20) : undefined;
    if (!text.trim() && !newStatus) throw new HttpError(400, 'Write a comment or choose a status.');

    const [own, members] = await tx(
      { orgId: user.orgId },
      sql`SELECT i.status, to_jsonb(d)->'workflow' AS workflow
          FROM public.issues i JOIN public.departments d ON d.id = i.department_id
          WHERE i.id = ${issueId}::uuid AND i.org_id = ${user.orgId}::uuid;`,
      sql`SELECT id, nickname FROM public.profiles
          WHERE org_id = ${user.orgId}::uuid AND COALESCE(status, 'active') <> 'departed';`
    );
    if (!own.length) throw new HttpError(404, 'Issue not found.');
    if (newStatus !== undefined) {
      if (!ISSUE_STATUSES.includes(newStatus)) throw new HttpError(400, 'Unknown status.');
      if (!isStatusAllowed(own[0].workflow, newStatus)) {
        throw new HttpError(400, 'That status is not used by this department.');
      }
    }
    const statusChanged = newStatus !== undefined && newStatus !== own[0].status;
    const statusNote = statusChanged ? `Status changed from ${own[0].status} to ${newStatus}` : null;

    const mentioned = findMentionedIds(
      text,
      members.map((m: any) => ({ id: m.id, nickname: m.nickname || undefined }))
    ).filter((m) => m !== user.id);

    const statements: any[] = [
      sql`INSERT INTO public.comments (issue_id, author_id, text, status_change)
          VALUES (${issueId}::uuid, ${user.id}::uuid, ${text}, ${statusNote})
          RETURNING *;`,
    ];
    if (statusChanged) {
      statements.push(sql`UPDATE public.issues SET status = ${newStatus}, updated_at = NOW() WHERE id = ${issueId}::uuid;`);
    }
    if (await inAppAvailable()) {
      // The commenter, and anyone they mention, now follows the ticket.
      statements.push(watchIssues(user.orgId, [issueId], [user.id, ...mentioned]));
      if (mentioned.length) {
        statements.push(notifyUsers(user.orgId, user.id, [issueId], mentioned, 'mentioned', snippet(text)));
      }
      if (statusChanged) {
        // one notification, not a "commented" plus a "status changed"
        const detail = `to ${newStatus}${text.trim() ? `: ${snippet(text)}` : ''}`;
        statements.push(notifyFollowers(user.orgId, user.id, [issueId], 'status_changed', detail, mentioned));
      } else if (text.trim()) {
        statements.push(notifyFollowers(user.orgId, user.id, [issueId], 'commented', snippet(text), mentioned));
      }
    }

    const results = await tx({ orgId: user.orgId, actorId: user.id }, ...statements);
    const row = results[0][0];
    const comment: Comment = {
      id: row.id,
      author: user,
      text,
      createdAt: row.created_at,
      statusChange: statusNote || undefined,
    };
    return { comment };
  },

  async deleteIssue(ctx, a) {
    const sql = getSql();
    const user = requireUser(ctx);
    const id = str(a.issueId, 100);
    if (!isUuid(id)) throw new HttpError(404, 'Issue not found.');
    const [row] = await tx(
      { orgId: user.orgId },
      sql`SELECT reporter_id FROM public.issues WHERE id = ${id}::uuid AND org_id = ${user.orgId}::uuid;`
    );
    if (!row.length) throw new HttpError(404, 'Issue not found.');
    // A ticket belongs to the person who reported it; admins can remove anything.
    if (!user.isAdmin && row[0].reporter_id !== user.id) {
      throw new HttpError(403, 'Only the reporter or an administrator can delete a ticket.');
    }
    await tx(
      { orgId: user.orgId },
      sql`DELETE FROM public.issues WHERE id = ${id}::uuid AND org_id = ${user.orgId}::uuid;`
    );
    return { ok: true };
  },

  // ----------------------------------------------------- stars & watching ----
  async toggleStar(ctx, a) {
    const sql = getSql();
    const user = requireUser(ctx);
    const issueId = str(a.issueId, 100);
    if (!isUuid(issueId)) throw new HttpError(404, 'Issue not found.');
    const stmt = a.starred
      ? sql`INSERT INTO public.issue_stars (issue_id, user_id)
            SELECT i.id, ${user.id}::uuid FROM public.issues i
            WHERE i.id = ${issueId}::uuid AND i.org_id = ${user.orgId}::uuid
            ON CONFLICT DO NOTHING;`
      : sql`DELETE FROM public.issue_stars WHERE issue_id = ${issueId}::uuid AND user_id = ${user.id}::uuid;`;
    await tx({ orgId: user.orgId, actorId: user.id }, stmt);
    return { ok: true };
  },

  async toggleWatch(ctx, a) {
    const sql = getSql();
    const user = requireUser(ctx);
    const issueId = str(a.issueId, 100);
    if (!isUuid(issueId)) throw new HttpError(404, 'Issue not found.');
    const stmt = a.watching
      ? watchIssues(user.orgId, [issueId], [user.id])
      : sql`DELETE FROM public.issue_watchers WHERE issue_id = ${issueId}::uuid AND user_id = ${user.id}::uuid;`;
    await tx({ orgId: user.orgId, actorId: user.id }, stmt);
    return { ok: true };
  },

  // ------------------------------------------------------------- bulk edit ----
  async bulkUpdateIssues(ctx, a) {
    const sql = getSql();
    const user = requireUser(ctx);
    const ids = uuidList(a.ids, MAX_BULK);
    const u = a.updates && typeof a.updates === 'object' ? a.updates : {};

    const status = u.status !== undefined ? str(u.status, 20) : undefined;
    const priority = u.priority !== undefined ? str(u.priority, 2) : undefined;
    const hasAssignee = u.assigneeId !== undefined;
    if (status === undefined && priority === undefined && !hasAssignee) {
      throw new HttpError(400, 'Nothing to change.');
    }
    if (status !== undefined && !ISSUE_STATUSES.includes(status)) throw new HttpError(400, 'Unknown status.');
    if (priority !== undefined && !ISSUE_PRIORITIES.includes(priority)) throw new HttpError(400, 'Unknown priority.');

    let assigneeId: string | null = null;
    if (hasAssignee && u.assigneeId !== null && u.assigneeId !== 'unassigned') {
      if (!isUuid(u.assigneeId)) throw new HttpError(400, 'Unknown assignee.');
      const [found] = await tx(
        { orgId: user.orgId },
        sql`SELECT id FROM public.profiles
            WHERE id = ${u.assigneeId}::uuid AND org_id = ${user.orgId}::uuid
              AND COALESCE(status, 'active') <> 'departed';`
      );
      if (!found.length) throw new HttpError(400, 'Unknown assignee.');
      assigneeId = found[0].id;
    }

    const [before] = await tx(
      { orgId: user.orgId },
      sql`SELECT i.id, i.status, i.priority, i.assignee_id, to_jsonb(d)->'workflow' AS workflow
          FROM public.issues i JOIN public.departments d ON d.id = i.department_id
          WHERE i.org_id = ${user.orgId}::uuid
            AND i.id IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb)::uuid);`
    );
    if (before.length !== ids.length) throw new HttpError(404, 'Some tickets were not found.');
    if (status !== undefined) {
      const blocked = before.filter((r: any) => !isStatusAllowed(r.workflow, status)).length;
      if (blocked) {
        throw new HttpError(400, `${blocked} selected ${blocked === 1 ? 'ticket belongs' : 'tickets belong'} to a department that does not use ${status}.`);
      }
    }

    const idsJson = JSON.stringify(ids);
    const statements: any[] = [];
    if (hasAssignee) {
      // Assigning a brand-new ticket moves it to ASSIGNED, same as on the ticket page.
      statements.push(sql`
        UPDATE public.issues
        SET assignee_id = ${assigneeId}::uuid,
            status = CASE WHEN status = 'NEW' AND ${assigneeId}::uuid IS NOT NULL THEN 'ASSIGNED' ELSE status END,
            updated_at = NOW()
        WHERE org_id = ${user.orgId}::uuid AND id IN (SELECT jsonb_array_elements_text(${idsJson}::jsonb)::uuid);`);
    }
    if (status !== undefined) {
      statements.push(sql`UPDATE public.issues SET status = ${status}, updated_at = NOW()
        WHERE org_id = ${user.orgId}::uuid AND id IN (SELECT jsonb_array_elements_text(${idsJson}::jsonb)::uuid);`);
    }
    if (priority !== undefined) {
      statements.push(sql`UPDATE public.issues SET priority = ${priority}, updated_at = NOW()
        WHERE org_id = ${user.orgId}::uuid AND id IN (SELECT jsonb_array_elements_text(${idsJson}::jsonb)::uuid);`);
    }

    const notifying = await inAppAvailable();
    const newlyAssigned = notifying && hasAssignee && assigneeId
      ? before.filter((r: any) => (r.assignee_id ?? null) !== assigneeId).map((r: any) => r.id as string)
      : [];
    if (assigneeId && newlyAssigned.length) {
      statements.push(watchIssues(user.orgId, newlyAssigned, [assigneeId]));
      statements.push(notifyUsers(user.orgId, user.id, newlyAssigned, [assigneeId], 'assigned', null));
    }
    const alreadyTold = assigneeId && newlyAssigned.length ? [assigneeId] : [];
    if (notifying && status !== undefined) {
      const changed = before.filter((r: any) => r.status !== status).map((r: any) => r.id as string);
      if (changed.length) statements.push(notifyFollowers(user.orgId, user.id, changed, 'status_changed', `to ${status}`, alreadyTold));
    }
    if (notifying && priority !== undefined) {
      const changed = before.filter((r: any) => r.priority !== priority).map((r: any) => r.id as string);
      if (changed.length) statements.push(notifyFollowers(user.orgId, user.id, changed, 'priority_changed', `to ${priority}`, alreadyTold));
    }

    await tx({ orgId: user.orgId, actorId: user.id }, ...statements);
    return { updated: ids.length };
  },

  // ----------------------------------------------------------- saved views ----
  async saveView(ctx, a) {
    const sql = getSql();
    const user = requireUser(ctx);
    const name = cleanViewName(a.name);
    if (!name) throw new HttpError(400, 'Give the view a name.');
    const config = sanitizeViewConfig(a.config);

    const [count] = await tx(
      { orgId: user.orgId, actorId: user.id },
      sql`SELECT count(*)::int AS n FROM public.saved_views WHERE user_id = ${user.id}::uuid;`
    );
    if (count[0].n >= MAX_SAVED_VIEWS) {
      throw new HttpError(400, `You can keep up to ${MAX_SAVED_VIEWS} saved views. Delete one first.`);
    }
    try {
      const [rows] = await tx(
        { orgId: user.orgId, actorId: user.id },
        sql`INSERT INTO public.saved_views (org_id, user_id, name, config)
            VALUES (${user.orgId}::uuid, ${user.id}::uuid, ${name}, ${JSON.stringify(config)}::jsonb)
            RETURNING id, name, config;`
      );
      return { view: { id: rows[0].id, name: rows[0].name, config: sanitizeViewConfig(rows[0].config) } };
    } catch (err: any) {
      if (err?.code === '23505') throw new HttpError(409, 'You already have a view with that name.');
      throw err;
    }
  },

  async deleteView(ctx, a) {
    const sql = getSql();
    const user = requireUser(ctx);
    const id = str(a.id, 100);
    if (!isUuid(id)) throw new HttpError(404, 'View not found.');
    await tx(
      { orgId: user.orgId, actorId: user.id },
      sql`DELETE FROM public.saved_views WHERE id = ${id}::uuid AND user_id = ${user.id}::uuid;`
    );
    return { ok: true };
  },

  // --------------------------------------------------------- notifications ----
  async listNotifications(ctx) {
    const sql = getSql();
    const user = requireUser(ctx);
    const [items, unread] = await tx(
      { orgId: user.orgId, actorId: user.id },
      sql`SELECT n.id, n.kind, n.detail, n.read_at, n.created_at,
                 a.id AS actor_id, a.name AS actor_name, a.nickname AS actor_nickname, a.avatar_url AS actor_avatar,
                 i.id AS issue_id, i.code AS issue_code, i.title AS issue_title
          FROM public.notifications n
          JOIN public.issues i ON i.id = n.issue_id
          LEFT JOIN public.profiles a ON a.id = n.actor_id
          WHERE n.user_id = ${user.id}::uuid
          ORDER BY n.created_at DESC
          LIMIT 50;`,
      sql`SELECT count(*)::int AS n FROM public.notifications WHERE user_id = ${user.id}::uuid AND read_at IS NULL;`,
      // housekeeping: your own notifications older than 90 days
      sql`DELETE FROM public.notifications WHERE user_id = ${user.id}::uuid AND created_at < NOW() - INTERVAL '90 days';`
    );
    return {
      unread: unread[0].n as number,
      items: items.map((r: any) => ({
        id: r.id,
        kind: r.kind,
        detail: r.detail || undefined,
        read: Boolean(r.read_at),
        createdAt: r.created_at,
        actor: r.actor_id
          ? { id: r.actor_id, name: r.actor_name, nickname: r.actor_nickname || undefined, avatarUrl: r.actor_avatar || undefined }
          : null,
        issue: { id: r.issue_id, code: r.issue_code, title: r.issue_title },
      })),
    };
  },

  /** Cheap check the app polls: how many unread, and when the newest one arrived. */
  async notificationCount(ctx) {
    const sql = getSql();
    const user = requireUser(ctx);
    const [rows] = await tx(
      { orgId: user.orgId, actorId: user.id },
      sql`SELECT count(*) FILTER (WHERE read_at IS NULL)::int AS unread, max(created_at) AS latest
          FROM public.notifications WHERE user_id = ${user.id}::uuid;`
    );
    return { unread: rows[0].unread as number, latest: rows[0].latest || null };
  },

  async markNotificationsRead(ctx, a) {
    const sql = getSql();
    const user = requireUser(ctx);
    const stmt = a.all
      ? sql`UPDATE public.notifications SET read_at = NOW()
            WHERE user_id = ${user.id}::uuid AND read_at IS NULL;`
      : sql`UPDATE public.notifications SET read_at = NOW()
            WHERE user_id = ${user.id}::uuid AND read_at IS NULL
              AND id IN (SELECT jsonb_array_elements_text(${JSON.stringify(uuidList(a.ids, 100))}::jsonb)::uuid);`;
    await tx({ orgId: user.orgId, actorId: user.id }, stmt);
    return { ok: true };
  },

  async saveDepartment(ctx, a) {
    const sql = getSql();
    const user = requireAdmin(ctx);
    const dept = a.department || {};
    const id = dept.id === 'engineering' ? `eng-${user.orgId}` : str(dept.id, 200);
    if (!id) throw new HttpError(400, 'Department id is required.');
    const workflow = sanitizeWorkflow(dept.workflow);
    if (!workflow.ok) throw new HttpError(400, workflow.error);

    // Without migration 006 there is no workflow column: save as before, but don't silently drop a workflow.
    const hasWorkflowColumn = await inAppAvailable();
    if (!hasWorkflowColumn && workflow.value) {
      throw new HttpError(503, 'Custom workflows need the latest database update. Ask an administrator to run the newest migration.');
    }

    let rows: any[] = [];
    try {
      [rows] = await tx(
        { orgId: user.orgId },
        hasWorkflowColumn
          ? sql`
      INSERT INTO public.departments (id, org_id, name, code, description, custom_fields, workflow)
      VALUES (${id}, ${user.orgId}, ${str(dept.name, 200)}, ${str(dept.code, 20)},
              ${str(dept.description, 2000)}, ${JSON.stringify(dept.customFields || [])},
              ${workflow.value ? JSON.stringify(workflow.value) : null}::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        description = EXCLUDED.description,
        custom_fields = EXCLUDED.custom_fields,
        workflow = EXCLUDED.workflow
      WHERE public.departments.org_id = EXCLUDED.org_id
      RETURNING id;
    `
          : sql`
      INSERT INTO public.departments (id, org_id, name, code, description, custom_fields)
      VALUES (${id}, ${user.orgId}, ${str(dept.name, 200)}, ${str(dept.code, 20)},
              ${str(dept.description, 2000)}, ${JSON.stringify(dept.customFields || [])})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        description = EXCLUDED.description,
        custom_fields = EXCLUDED.custom_fields
      WHERE public.departments.org_id = EXCLUDED.org_id
      RETURNING id;
    `
      );
    } catch (err: any) {
      // An id owned by another org is invisible to us and trips RLS on the conflicting row.
      throw friendlyDbError(err) || err;
    }
    if (!rows.length) throw new HttpError(409, 'A department with this id already exists.');
    return { ok: true };
  },

  async deleteDepartment(ctx, a) {
    const user = requireAdmin(ctx);
    await tx(
      { orgId: user.orgId },
      getSql()`DELETE FROM public.departments WHERE id = ${str(a.deptId, 200)} AND org_id = ${user.orgId};`
    );
    return { ok: true };
  },

  async updateProfile(ctx, a) {
    const sql = getSql();
    const user = requireUser(ctx);
    const userId = str(a.userId, 100);
    const u = a.updates || {};

    const [target, otherAdmins] = await tx(
      { orgId: user.orgId },
      sql`SELECT id, is_admin, status FROM public.profiles WHERE id = ${userId} AND org_id = ${user.orgId};`,
      sql`SELECT 1 FROM public.profiles
          WHERE org_id = ${user.orgId} AND id <> ${userId} AND is_admin AND COALESCE(status, 'active') <> 'departed'
          LIMIT 1;`
    );
    if (!target.length) throw new HttpError(404, 'User not found.');

    const isSelf = userId === user.id;
    const touchesAdminFields =
      u.isAdmin !== undefined || u.status !== undefined ||
      u.departureReason !== undefined || u.departedAt !== undefined;
    if ((!isSelf || touchesAdminFields) && !user.isAdmin) {
      throw new HttpError(403, 'Only workspace administrators can do this.');
    }

    // Never leave the workspace without an active admin
    const removingAdmin =
      target[0].is_admin && (u.isAdmin === false || u.status === 'departed');
    if (removingAdmin && !otherAdmins.length) {
      throw new HttpError(409, 'There must be at least one active administrator.');
    }

    const nick = u.nickname ? str(u.nickname, 100).replace(/^@/, '') : null;
    try {
      await tx(
        { orgId: user.orgId },
        sql`
        UPDATE public.profiles
        SET
          name = COALESCE(${u.name ? str(u.name, 200) : null}, name),
          nickname = COALESCE(${nick || null}, nickname),
          role = COALESCE(${u.role ? str(u.role, 200) : null}, role),
          avatar_url = COALESCE(${httpUrl(u.avatarUrl)}, avatar_url),
          department = COALESCE(${u.department ? str(u.department, 200) : null}, department),
          is_admin = COALESCE(${u.isAdmin !== undefined ? Boolean(u.isAdmin) : null}, is_admin),
          status = COALESCE(${u.status ? str(u.status, 20) : null}, status),
          departure_reason = COALESCE(${u.departureReason ? str(u.departureReason, 1000) : null}, departure_reason),
          departed_at = COALESCE(${u.departedAt ? new Date(u.departedAt) : null}, departed_at),
          updated_at = NOW()
        WHERE id = ${userId} AND org_id = ${user.orgId};
      `
      );
    } catch (err: any) {
      throw friendlyDbError(err) || err;
    }
    return { ok: true };
  },
};

// ============================================================================
// Entry point
// ============================================================================

const json = (status: number, body: unknown, cookies: string[] = []) => {
  const headers = new Headers({ 'content-type': 'application/json', 'cache-control': 'no-store' });
  cookies.forEach((c) => headers.append('set-cookie', c));
  return new Response(JSON.stringify(body), { status, headers });
};

export default async (req: Request): Promise<Response> => {
  const cookies: string[] = [];
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');

    // CSRF: cross-site pages can't send JSON without a preflight we never answer,
    // and the cookie is SameSite=Strict; this also rejects mismatched Origins.
    const origin = req.headers.get('origin');
    if (origin && origin !== new URL(req.url).origin) throw new HttpError(403, 'Forbidden.');
    if (!(req.headers.get('content-type') || '').includes('application/json')) {
      throw new HttpError(415, 'Expected JSON.');
    }

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) throw new HttpError(413, 'Request too large.');
    let body: { action?: string; args?: unknown };
    try {
      body = JSON.parse(raw);
    } catch {
      throw new HttpError(400, 'Invalid JSON.');
    }

    const handler = typeof body.action === 'string' && Object.hasOwn(actions, body.action)
      ? actions[body.action]
      : null;
    if (!handler) throw new HttpError(404, 'Unknown action.');

    const ctx: Ctx = { req, user: await loadSessionUser(req), setCookie: (c) => cookies.push(c) };
    const result = await handler(ctx, body.args || {});
    return json(200, result, cookies);
  } catch (err) {
    if (err instanceof HttpError) return json(err.status, { error: err.message }, cookies);
    // The database is behind the code (a migration has not been run yet): say so, don't just fail.
    const code = (err as any)?.code;
    if (code === '42P01' || code === '42703') {
      console.error('API error (migration missing?):', err);
      return json(503, { error: 'The database needs its latest update. Ask an administrator to run the newest migration.' }, cookies);
    }
    if (code === '23514') {
      console.error('API error (constraint):', err);
      return json(409, { error: 'The database rejected that value. Make sure every migration has been run.' }, cookies);
    }
    console.error('API error:', err);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
};
