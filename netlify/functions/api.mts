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
  { id: 'issueType', name: 'Issue Type', type: 'select', options: ['Bug', 'Feature', 'Update', 'Adjustment'], defaultValue: 'Bug', required: true },
  { id: 'environment', name: 'Environment Stage', type: 'select', options: ['LOCAL', 'STAGING', 'PROD'], defaultValue: 'LOCAL' },
  { id: 'devScope', name: 'Development Layer', type: 'select', options: ['Frontend only', 'Backend only', 'Both (Frontend + Backend)'], defaultValue: 'Both (Frontend + Backend)' },
];

const ISSUE_STATUSES = ['NEW', 'ASSIGNED', 'ACCEPTED', 'PENDING', 'COMPLETED', 'VERIFIED', 'CLOSED'];

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode = (len: number) =>
  Array.from({ length: len }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');

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
    const { orgId } = requireUser(ctx);

    const [deptRows, profileRows, issueRows, commentRows, historyRows] = await tx(
      { orgId },
      sql`SELECT id, org_id, name, code, description, custom_fields FROM public.departments WHERE org_id = ${orgId} ORDER BY code ASC;`,
      sql`SELECT id, org_id, name, nickname, email, role, department, avatar_url, is_admin, status, departure_reason, departed_at FROM public.profiles WHERE org_id = ${orgId} ORDER BY name ASC;`,
      sql`SELECT * FROM public.issues WHERE org_id = ${orgId} ORDER BY number DESC;`,
      sql`SELECT c.* FROM public.comments c JOIN public.issues i ON c.issue_id = i.id WHERE i.org_id = ${orgId} ORDER BY c.created_at ASC;`,
      sql`SELECT h.* FROM public.issue_history h JOIN public.issues i ON h.issue_id = i.id WHERE i.org_id = ${orgId} ORDER BY h.created_at DESC;`
    );

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
    }));

    const commentsByIssue = new Map<string, Comment[]>();
    for (const c of commentRows) {
      const list = commentsByIssue.get(c.issue_id) || [];
      list.push({ id: c.id, author: userMap.get(c.author_id) || defaultUser, text: c.text, createdAt: c.created_at });
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
        starred: Boolean(row.starred),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        comments: commentsByIssue.get(row.id) || [],
        history: historyByIssue.get(row.id) || [],
      };
    });

    return { departments, users, issues };
  },

  async createIssue(ctx, a) {
    const sql = getSql();
    const user = requireUser(ctx);
    const d = a.data || {};

    // Foreign-key checks bypass RLS, so department and assignee must be verified explicitly.
    const [dept, assignee] = await tx(
      { orgId: user.orgId },
      sql`SELECT 1 FROM public.departments WHERE id = ${str(d.departmentId, 200)} AND org_id = ${user.orgId};`,
      sql`SELECT id FROM public.profiles WHERE id = ${d.assigneeId ? str(d.assigneeId, 100) : null} AND org_id = ${user.orgId};`
    );
    if (!dept.length) throw new HttpError(400, 'Unknown department.');
    if (d.assigneeId && !assignee.length) throw new HttpError(400, 'Unknown assignee.');
    const assigneeId: string | null = d.assigneeId ? assignee[0].id : null;

    const [rows] = await tx(
      { orgId: user.orgId, actorId: user.id },
      sql`
      INSERT INTO public.issues (
        org_id, title, description, department_id, priority, status,
        custom_attributes, issue_type, environment, dev_scope, assignee_id, reporter_id
      ) VALUES (
        ${user.orgId}, ${str(d.title, 500)}, ${str(d.description, 50000)}, ${str(d.departmentId, 200)},
        ${str(d.priority, 2)}, ${ISSUE_STATUSES.includes(d.status) ? d.status : 'NEW'}, ${JSON.stringify(d.customAttributes || {})},
        ${d.issueType || null}, ${d.environment || null}, ${d.devScope || null},
        ${assigneeId}, ${user.id}
      )
      RETURNING *;
    `
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

    const [own] = await tx(
      { orgId: user.orgId },
      sql`SELECT 1 FROM public.issues WHERE id = ${id} AND org_id = ${user.orgId};`
    );
    if (!own.length) throw new HttpError(404, 'Issue not found.');

    // History rows are written by `trigger_track_issue_changes`, which reads the actor from the
    // transaction. Everything runs in one transaction so edits are atomic.
    const statements: any[] = [];

    if (u.status !== undefined) {
      statements.push(sql`UPDATE public.issues SET status = ${str(u.status, 20)}, updated_at = NOW() WHERE id = ${id};`);
    }
    if (u.priority !== undefined) {
      statements.push(sql`UPDATE public.issues SET priority = ${str(u.priority, 2)}, updated_at = NOW() WHERE id = ${id};`);
    }
    if (u.title !== undefined) {
      statements.push(sql`UPDATE public.issues SET title = ${str(u.title, 500)}, updated_at = NOW() WHERE id = ${id};`);
    }
    if (u.description !== undefined) {
      statements.push(sql`UPDATE public.issues SET description = ${str(u.description, 50000)}, updated_at = NOW() WHERE id = ${id};`);
    }
    if (u.assignee !== undefined) {
      let assigneeId: string | null = null;
      if (u.assignee) {
        const [found] = await tx(
          { orgId: user.orgId },
          sql`SELECT id FROM public.profiles WHERE id = ${str(u.assignee.id, 100)} AND org_id = ${user.orgId};`
        );
        if (!found.length) throw new HttpError(400, 'Unknown assignee.');
        assigneeId = found[0].id;
      }
      statements.push(sql`UPDATE public.issues SET assignee_id = ${assigneeId}, updated_at = NOW() WHERE id = ${id};`);
    }
    if (u.starred !== undefined) {
      statements.push(sql`UPDATE public.issues SET starred = ${Boolean(u.starred)} WHERE id = ${id};`);
    }
    if (u.customAttributes !== undefined) {
      statements.push(sql`UPDATE public.issues SET custom_attributes = ${JSON.stringify(u.customAttributes)}, updated_at = NOW() WHERE id = ${id};`);
    }
    if (statements.length) await tx({ orgId: user.orgId, actorId: user.id }, ...statements);
    return { ok: true };
  },

  async addComment(ctx, a) {
    const sql = getSql();
    const user = requireUser(ctx);
    const issueId = str(a.issueId, 100);
    const text = str(a.text, 50000);

    const [own] = await tx(
      { orgId: user.orgId },
      sql`SELECT 1 FROM public.issues WHERE id = ${issueId} AND org_id = ${user.orgId};`
    );
    if (!own.length) throw new HttpError(404, 'Issue not found.');

    const newStatus = a.newStatus ? str(a.newStatus, 20) : undefined;
    const statements: any[] = [
      sql`INSERT INTO public.comments (issue_id, author_id, text)
          VALUES (${issueId}, ${user.id}, ${text})
          RETURNING *;`,
    ];
    if (newStatus) {
      statements.push(sql`UPDATE public.issues SET status = ${newStatus}, updated_at = NOW() WHERE id = ${issueId};`);
    }
    const results = await tx({ orgId: user.orgId, actorId: user.id }, ...statements);
    const row = results[0][0];
    const comment: Comment = {
      id: row.id,
      author: user,
      text,
      createdAt: row.created_at,
      statusChange: newStatus,
    };
    return { comment };
  },

  async deleteIssue(ctx, a) {
    const user = requireUser(ctx);
    await tx(
      { orgId: user.orgId },
      getSql()`DELETE FROM public.issues WHERE id = ${str(a.issueId, 100)} AND org_id = ${user.orgId};`
    );
    return { ok: true };
  },

  async saveDepartment(ctx, a) {
    const sql = getSql();
    const user = requireAdmin(ctx);
    const dept = a.department || {};
    const id = dept.id === 'engineering' ? `eng-${user.orgId}` : str(dept.id, 200);
    if (!id) throw new HttpError(400, 'Department id is required.');

    let rows: any[] = [];
    try {
      [rows] = await tx(
        { orgId: user.orgId },
        sql`
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
    console.error('API error:', err);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
};
