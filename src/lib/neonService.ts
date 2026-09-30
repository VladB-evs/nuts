import { getDb, isNeonConfigured } from './neon';
import {
  Department,
  UserProfile,
  Issue,
  Priority,
  Status,
  IssueType,
  Environment,
  DevScope,
  Comment,
  HistoryEntry,
  CustomFieldDefinition,
  Organization,
} from '../types';

export const STORAGE_AUTH_TOKEN = 'nuts_session_token';
export const STORAGE_AUTH_USER = 'nuts_auth_user_v10';

export async function hashPassword(password: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    return password;
  }
  const enc = new TextEncoder();
  const data = enc.encode(password + ':nuts_multi_tenant_salt_2026');
  const hashBuf = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function testConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const sql = getDb();
    if (!sql) {
      return { success: false, message: 'Neon connection URL is not configured.' };
    }
    const res = await sql`SELECT NOW() as current_time, current_database() as db_name;`;
    if (res && res.length > 0) {
      // Ensure schema is updated on connect
      await ensureMultiTenantSchema();
      return {
        success: true,
        message: `Connected successfully to database "${res[0].db_name}".`,
      };
    }
    return { success: false, message: 'Empty response from Neon.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to connect to Neon.' };
  }
}

/**
 * Automatically applies non-breaking schema updates to Neon Postgres
 * (Organizations, Sessions, and org_id references)
 */
export async function ensureMultiTenantSchema(): Promise<void> {
  const sql = getDb();
  if (!sql) return;

  try {
    // 1. Organizations
    await sql`
      CREATE TABLE IF NOT EXISTS public.organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        created_by_email TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_organizations_code ON public.organizations(code);`;

    // 2. Profiles org_id & password_hash
    await sql`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;`;
    await sql`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;`;
    await sql`CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(org_id);`;

    // 3. Sessions
    await sql`
      CREATE TABLE IF NOT EXISTS public.sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(token);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);`;

    // 4. Departments org_id & drop global code uniqueness constraint
    await sql`ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;`;
    await sql`CREATE INDEX IF NOT EXISTS idx_departments_org_id ON public.departments(org_id);`;
    await sql`ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_code_key;`;

    // 5. Issues org_id & drop global code uniqueness constraint
    await sql`ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;`;
    await sql`CREATE INDEX IF NOT EXISTS idx_issues_org_id ON public.issues(org_id);`;
    await sql`ALTER TABLE public.issues DROP CONSTRAINT IF EXISTS issues_code_key;`;
  } catch (err) {
    console.warn('ensureMultiTenantSchema notice:', err);
  }
}

// ============================================================================
// ORGANIZATIONS & AUTHENTICATION
// ============================================================================

export async function createOrganization(
  name: string,
  customCode?: string,
  createdByEmail: string = ''
): Promise<Organization> {
  const sql = getDb();
  if (!sql) throw new Error('Database not configured');

  await ensureMultiTenantSchema();

  const cleanName = name.trim();
  let code = (customCode || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');

  if (!code) {
    const slug = cleanName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 4) || 'ORG';
    const rand = Math.floor(1000 + Math.random() * 9000);
    code = `${slug}-${rand}`;
  }

  const rows = await sql`
    INSERT INTO public.organizations (name, code, created_by_email)
    VALUES (${cleanName}, ${code}, ${createdByEmail.toLowerCase()})
    RETURNING id, name, code, created_by_email, created_at;
  `;

  const orgRow = rows[0];
  const org: Organization = {
    id: orgRow.id,
    name: orgRow.name,
    code: orgRow.code,
    createdByEmail: orgRow.created_by_email,
    createdAt: orgRow.created_at,
  };

  // Seed default Engineering department for this new organization
  try {
    const defaultFields = [
      {
        id: 'issueType',
        name: 'Issue Type',
        type: 'select',
        options: ['Bug', 'Feature'],
        defaultValue: 'Bug',
        required: true,
      },
      {
        id: 'environment',
        name: 'Environment Stage',
        type: 'select',
        options: ['LOCAL', 'STAGING', 'PROD'],
        defaultValue: 'STAGING',
      },
      {
        id: 'devScope',
        name: 'Development Layer',
        type: 'select',
        options: ['Frontend only', 'Backend only', 'Both (Frontend + Backend)'],
        defaultValue: 'Both (Frontend + Backend)',
      },
    ];

    await sql`
      INSERT INTO public.departments (id, org_id, name, code, description, custom_fields)
      VALUES (
        ${`eng-${org.id}`},
        ${org.id},
        'Engineering',
        'DEV',
        'Core product development, bug fixes, and feature engineering.',
        ${JSON.stringify(defaultFields)}
      )
      ON CONFLICT DO NOTHING;
    `;
  } catch (err) {
    console.warn('Notice seeding default department for org:', err);
  }

  return org;
}

export async function getOrganizationByCode(code: string): Promise<Organization | null> {
  const sql = getDb();
  if (!sql) return null;

  await ensureMultiTenantSchema();

  const cleanCode = code.trim().toUpperCase();
  const rows = await sql`
    SELECT id, name, code, created_by_email, created_at
    FROM public.organizations
    WHERE UPPER(code) = UPPER(${cleanCode})
    LIMIT 1;
  `;

  if (!rows || rows.length === 0) return null;
  return {
    id: rows[0].id,
    name: rows[0].name,
    code: rows[0].code,
    createdByEmail: rows[0].created_by_email,
    createdAt: rows[0].created_at,
  };
}

export async function registerUser(params: {
  name: string;
  email: string;
  nickname: string;
  password?: string;
  department: string;
  role: string;
  avatarUrl?: string;
  orgMode: 'create' | 'join';
  orgName?: string;
  orgCode?: string;
}): Promise<UserProfile> {
  const sql = getDb();
  if (!sql) throw new Error('Database not configured');

  await ensureMultiTenantSchema();

  const cleanEmail = params.email.trim().toLowerCase();
  const cleanNickname = params.nickname.trim().replace(/^@/, '');
  const hashed = params.password ? await hashPassword(params.password) : null;

  let org: Organization;

  if (params.orgMode === 'create') {
    if (!params.orgName || !params.orgName.trim()) {
      throw new Error('Please enter a company or organization name.');
    }
    org = await createOrganization(params.orgName, params.orgCode, cleanEmail);
  } else {
    if (!params.orgCode || !params.orgCode.trim()) {
      throw new Error('Please enter your company organization invite code.');
    }
    const found = await getOrganizationByCode(params.orgCode);
    if (!found) {
      throw new Error(
        `Organization code "${params.orgCode.toUpperCase()}" was not found. Please check with your team admin.`
      );
    }
    org = found;
  }

  // Create Profile linked to org
  const rows = await sql`
    INSERT INTO public.profiles (
      org_id, name, email, nickname, role, department, avatar_url, password_hash, is_admin
    ) VALUES (
      ${org.id},
      ${params.name.trim()},
      ${cleanEmail},
      ${cleanNickname},
      ${params.role.trim() || 'Member'},
      ${params.department.trim() || 'Engineering'},
      ${params.avatarUrl?.trim() || null},
      ${hashed},
      ${params.orgMode === 'create'}
    )
    RETURNING id, org_id, name, nickname, email, role, department, avatar_url, is_admin;
  `;

  const userRow = rows[0];

  // Create secure session token
  const token = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tok_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  try {
    await sql`
      INSERT INTO public.sessions (user_id, org_id, token, expires_at)
      VALUES (${userRow.id}, ${org.id}, ${token}, ${expiresAt});
    `;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_AUTH_TOKEN, token);
    }
  } catch (e) {
    console.warn('Session table notice:', e);
  }

  const profile: UserProfile = {
    id: userRow.id,
    orgId: org.id,
    organization: org,
    isAdmin: Boolean(userRow.is_admin),
    name: userRow.name,
    nickname: userRow.nickname || '',
    email: userRow.email,
    role: userRow.role || 'Member',
    department: userRow.department || 'Engineering',
    avatarUrl: userRow.avatar_url || '',
    avatar: userRow.avatar_url || '',
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_AUTH_USER, JSON.stringify(profile));
  }

  return profile;
}

export async function loginWithEmail(email: string, password?: string): Promise<UserProfile> {
  const sql = getDb();
  if (!sql) throw new Error('Database not configured');

  await ensureMultiTenantSchema();

  const cleanEmail = email.trim().toLowerCase();

  // Find profile with its organization
  const rows = await sql`
    SELECT 
      p.id, p.org_id, p.name, p.nickname, p.email, p.role, p.department, p.avatar_url, p.is_admin, p.password_hash,
      o.id as organization_id, o.name as organization_name, o.code as organization_code
    FROM public.profiles p
    LEFT JOIN public.organizations o ON p.org_id = o.id
    WHERE LOWER(p.email) = LOWER(${cleanEmail})
    LIMIT 1;
  `;

  if (!rows || rows.length === 0) {
    throw new Error(`No account found for "${cleanEmail}". Please check your email or create an account.`);
  }

  const userRow = rows[0];

  // Verify password hash
  if (userRow.password_hash && password) {
    const hashed = await hashPassword(password);
    if (userRow.password_hash !== hashed) {
      throw new Error('Incorrect password. Please try again.');
    }
  } else if (!userRow.password_hash && password) {
    // Save password for account on first login
    const hashed = await hashPassword(password);
    try {
      await sql`UPDATE public.profiles SET password_hash = ${hashed} WHERE id = ${userRow.id};`;
    } catch {}
  }

  let org: Organization | undefined = undefined;
  if (userRow.organization_id) {
    org = {
      id: userRow.organization_id,
      name: userRow.organization_name || 'My Organization',
      code: userRow.organization_code || 'ORG',
    };
  }

  // Create or refresh session token
  const token = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tok_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    await sql`
      INSERT INTO public.sessions (user_id, org_id, token, expires_at)
      VALUES (${userRow.id}, ${userRow.org_id}, ${token}, ${expiresAt});
    `;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_AUTH_TOKEN, token);
    }
  } catch {}

  const profile: UserProfile = {
    id: userRow.id,
    orgId: userRow.org_id || undefined,
    organization: org,
    isAdmin: Boolean(userRow.is_admin),
    name: userRow.name,
    nickname: userRow.nickname || '',
    email: userRow.email,
    role: userRow.role || 'Member',
    department: userRow.department || 'Engineering',
    avatarUrl: userRow.avatar_url || '',
    avatar: userRow.avatar_url || '',
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_AUTH_USER, JSON.stringify(profile));
  }

  return profile;
}

export async function validateSessionToken(token: string): Promise<UserProfile | null> {
  const sql = getDb();
  if (!sql || !token) return null;

  try {
    await ensureMultiTenantSchema();

    const rows = await sql`
      SELECT 
        p.id, p.org_id, p.name, p.nickname, p.email, p.role, p.department, p.avatar_url, p.is_admin,
        o.id as organization_id, o.name as organization_name, o.code as organization_code
      FROM public.sessions s
      JOIN public.profiles p ON s.user_id = p.id
      LEFT JOIN public.organizations o ON p.org_id = o.id
      WHERE s.token = ${token} AND s.expires_at > NOW()
      LIMIT 1;
    `;

    if (!rows || rows.length === 0) return null;
    const r = rows[0];

    return {
      id: r.id,
      orgId: r.org_id || undefined,
      organization: r.organization_id
        ? {
            id: r.organization_id,
            name: r.organization_name,
            code: r.organization_code,
          }
        : undefined,
      isAdmin: Boolean(r.is_admin),
      name: r.name,
      nickname: r.nickname || '',
      email: r.email,
      role: r.role || 'Member',
      department: r.department || 'Engineering',
      avatarUrl: r.avatar_url || '',
      avatar: r.avatar_url || '',
    };
  } catch {
    return null;
  }
}

// ============================================================================
// DATA FETCHING (STRICTLY SCOPED PER ORGANIZATION)
// ============================================================================

export async function fetchAllDataFromNeon(orgId?: string): Promise<{
  departments: Department[];
  users: UserProfile[];
  issues: Issue[];
} | null> {
  const sql = getDb();
  if (!sql) return null;

  try {
    await ensureMultiTenantSchema();

    // 1. Fetch departments and profiles for this org
    let deptRows: any[];
    let profileRows: any[];

    if (orgId) {
      [deptRows, profileRows] = await Promise.all([
        sql`SELECT id, org_id, name, code, description, custom_fields FROM public.departments WHERE org_id = ${orgId} ORDER BY code ASC;`,
        sql`SELECT id, org_id, name, nickname, email, role, department, avatar_url, is_admin FROM public.profiles WHERE org_id = ${orgId} ORDER BY name ASC;`,
      ]);

      if (!deptRows || deptRows.length === 0) {
        const defaultFields = [
          { id: 'issueType', name: 'Issue Type', type: 'select', options: ['Bug', 'Feature'], defaultValue: 'Bug', required: true },
          { id: 'environment', name: 'Environment Stage', type: 'select', options: ['LOCAL', 'STAGING', 'PROD'], defaultValue: 'STAGING' },
          { id: 'devScope', name: 'Development Layer', type: 'select', options: ['Frontend only', 'Backend only', 'Both (Frontend + Backend)'], defaultValue: 'Both (Frontend + Backend)' },
        ];
        const deptId = `eng-${orgId}`;
        try {
          await sql`
            INSERT INTO public.departments (id, org_id, name, code, description, custom_fields)
            VALUES (${deptId}, ${orgId}, 'Engineering', 'DEV', 'Core product engineering and bug triage', ${JSON.stringify(defaultFields)})
            ON CONFLICT DO NOTHING;
          `;
          deptRows = await sql`SELECT id, org_id, name, code, description, custom_fields FROM public.departments WHERE org_id = ${orgId} ORDER BY code ASC;`;
        } catch (e) {
          console.warn('Auto-seed engineering dept notice:', e);
        }
      }
    } else {
      [deptRows, profileRows] = await Promise.all([
        sql`SELECT id, org_id, name, code, description, custom_fields FROM public.departments WHERE org_id IS NULL ORDER BY code ASC;`,
        sql`SELECT id, org_id, name, nickname, email, role, department, avatar_url, is_admin FROM public.profiles WHERE org_id IS NULL ORDER BY name ASC;`,
      ]);
    }

    const users: UserProfile[] = (profileRows || []).map((p: any) => ({
      id: p.id,
      orgId: p.org_id,
      isAdmin: Boolean(p.is_admin),
      name: p.name,
      nickname: p.nickname || '',
      email: p.email,
      role: p.role || 'Member',
      department: p.department || 'Engineering',
      avatarUrl: p.avatar_url || '',
      avatar: p.avatar_url || '',
    }));

    const userMap = new Map<string, UserProfile>();
    users.forEach((u) => userMap.set(u.id, u));

    const defaultUser: UserProfile = users[0] || {
      id: 'default',
      name: 'Team Member',
      nickname: 'member',
      email: 'team@nuts.internal',
      role: 'Member',
      department: 'Engineering',
    };

    const departments: Department[] = (deptRows || []).map((d: any) => {
      let fields: CustomFieldDefinition[] = [];
      if (Array.isArray(d.custom_fields)) {
        fields = d.custom_fields;
      } else if (typeof d.custom_fields === 'string') {
        try {
          fields = JSON.parse(d.custom_fields);
        } catch {
          fields = [];
        }
      }
      return {
        id: d.id,
        orgId: d.org_id,
        name: d.name,
        code: d.code,
        description: d.description || '',
        customFields: fields,
      };
    });

    // 2. Fetch issues, comments, and history scoped by org
    let issueRows: any[];
    let commentRows: any[];
    let historyRows: any[];

    if (orgId) {
      [issueRows, commentRows, historyRows] = await Promise.all([
        sql`SELECT * FROM public.issues WHERE org_id = ${orgId} ORDER BY number DESC;`,
        sql`
          SELECT c.* 
          FROM public.comments c
          JOIN public.issues i ON c.issue_id = i.id
          WHERE i.org_id = ${orgId}
          ORDER BY c.created_at ASC;
        `,
        sql`
          SELECT h.* 
          FROM public.issue_history h
          JOIN public.issues i ON h.issue_id = i.id
          WHERE i.org_id = ${orgId}
          ORDER BY h.created_at DESC;
        `,
      ]);
    } else {
      [issueRows, commentRows, historyRows] = await Promise.all([
        sql`SELECT * FROM public.issues WHERE org_id IS NULL ORDER BY number DESC;`,
        sql`SELECT * FROM public.comments ORDER BY created_at ASC;`,
        sql`SELECT * FROM public.issue_history ORDER BY created_at DESC;`,
      ]);
    }

    const commentsByIssue = new Map<string, Comment[]>();
    for (const c of commentRows || []) {
      const issueComments = commentsByIssue.get(c.issue_id) || [];
      issueComments.push({
        id: c.id,
        author: userMap.get(c.author_id) || defaultUser,
        text: c.text,
        createdAt: c.created_at,
      });
      commentsByIssue.set(c.issue_id, issueComments);
    }

    const historyByIssue = new Map<string, HistoryEntry[]>();
    for (const h of historyRows || []) {
      const issueHistory = historyByIssue.get(h.issue_id) || [];
      issueHistory.push({
        id: h.id,
        actor: userMap.get(h.actor_id) || defaultUser,
        field: h.field,
        oldValue: h.old_value || '',
        newValue: h.new_value || '',
        message: h.message || '',
        createdAt: h.created_at,
      });
      historyByIssue.set(h.issue_id, issueHistory);
    }

    const issues: Issue[] = (issueRows || []).map((row: any) => {
      let customAttrs: Record<string, any> = {};
      if (typeof row.custom_attributes === 'object' && row.custom_attributes !== null) {
        customAttrs = row.custom_attributes;
      } else if (typeof row.custom_attributes === 'string') {
        try {
          customAttrs = JSON.parse(row.custom_attributes);
        } catch {
          customAttrs = {};
        }
      }

      return {
        id: row.id,
        orgId: row.org_id,
        number: Number(row.number),
        code: row.code,
        title: row.title,
        description: row.description || '',
        departmentId: row.department_id,
        priority: row.priority as Priority,
        status: row.status as Status,
        customAttributes: customAttrs,
        issueType: (row.issue_type as IssueType) || undefined,
        environment: (row.environment as Environment) || undefined,
        devScope: (row.dev_scope as DevScope) || undefined,
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
  } catch (err) {
    console.error('Failed to fetch from Neon database:', err);
    return null;
  }
}

// ============================================================================
// MUTATIONS (SCOPED PER ORGANIZATION)
// ============================================================================

export async function createIssueInNeon(
  data: {
    title: string;
    description: string;
    departmentId: string;
    priority: Priority;
    customAttributes?: Record<string, any>;
    issueType?: IssueType;
    environment?: Environment;
    devScope?: DevScope;
    assigneeId?: string;
  },
  reporter: UserProfile,
  orgId?: string
): Promise<Issue | null> {
  const sql = getDb();
  if (!sql) return null;

  try {
    const rows = await sql`
      INSERT INTO public.issues (
        org_id, title, description, department_id, priority, status,
        custom_attributes, issue_type, environment, dev_scope,
        assignee_id, reporter_id
      ) VALUES (
        ${orgId || null},
        ${data.title},
        ${data.description || ''},
        ${data.departmentId},
        ${data.priority},
        'NEW',
        ${JSON.stringify(data.customAttributes || {})},
        ${data.issueType || null},
        ${data.environment || null},
        ${data.devScope || null},
        ${data.assigneeId || null},
        ${reporter.id}
      )
      RETURNING *;
    `;

    if (!rows || rows.length === 0) return null;
    const r = rows[0];

    return {
      id: r.id,
      orgId: r.org_id,
      number: Number(r.number),
      code: r.code,
      title: r.title,
      description: r.description || '',
      departmentId: r.department_id,
      priority: r.priority as Priority,
      status: r.status as Status,
      customAttributes: data.customAttributes || {},
      issueType: data.issueType,
      environment: data.environment,
      devScope: data.devScope,
      assignee: null,
      reporter,
      starred: false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      comments: [],
      history: [
        {
          id: `h-init-${r.id}`,
          actor: reporter,
          field: 'Issue',
          oldValue: '',
          newValue: 'Created',
          message: `Created issue ${r.code}`,
          createdAt: r.created_at,
        },
      ],
    };
  } catch (err) {
    console.error('Failed to create issue in Neon:', err);
    return null;
  }
}

export async function updateIssueInNeon(
  issueId: string,
  updates: Partial<Issue>,
  actor: UserProfile,
  orgId?: string
): Promise<void> {
  const sql = getDb();
  if (!sql) return;

  try {
    if (updates.status !== undefined) {
      await sql`UPDATE public.issues SET status = ${updates.status}, updated_at = NOW() WHERE id = ${issueId};`;
      await sql`
        INSERT INTO public.issue_history (issue_id, actor_id, field, old_value, new_value, message)
        VALUES (${issueId}, ${actor.id}, 'Status', '', ${updates.status}, ${`Status changed to ${updates.status}`});
      `;
    }
    if (updates.priority !== undefined) {
      await sql`UPDATE public.issues SET priority = ${updates.priority}, updated_at = NOW() WHERE id = ${issueId};`;
      await sql`
        INSERT INTO public.issue_history (issue_id, actor_id, field, old_value, new_value, message)
        VALUES (${issueId}, ${actor.id}, 'Priority', '', ${updates.priority}, ${`Priority changed to ${updates.priority}`});
      `;
    }
    if (updates.title !== undefined) {
      await sql`UPDATE public.issues SET title = ${updates.title}, updated_at = NOW() WHERE id = ${issueId};`;
    }
    if (updates.description !== undefined) {
      await sql`UPDATE public.issues SET description = ${updates.description}, updated_at = NOW() WHERE id = ${issueId};`;
    }
    if (updates.assignee !== undefined) {
      const assigneeId = updates.assignee ? updates.assignee.id : null;
      await sql`UPDATE public.issues SET assignee_id = ${assigneeId}, updated_at = NOW() WHERE id = ${issueId};`;
      await sql`
        INSERT INTO public.issue_history (issue_id, actor_id, field, old_value, new_value, message)
        VALUES (${issueId}, ${actor.id}, 'Assignee', '', ${updates.assignee?.name || 'Unassigned'}, ${`Assigned to ${updates.assignee?.name || 'Unassigned'}`});
      `;
    }
    if (updates.starred !== undefined) {
      await sql`UPDATE public.issues SET starred = ${updates.starred} WHERE id = ${issueId};`;
    }
    if (updates.customAttributes !== undefined) {
      await sql`UPDATE public.issues SET custom_attributes = ${JSON.stringify(updates.customAttributes)}, updated_at = NOW() WHERE id = ${issueId};`;
    }
  } catch (err) {
    console.error('Failed to update issue in Neon:', err);
  }
}

export async function addCommentInNeon(
  issueId: string,
  text: string,
  author: UserProfile,
  newStatus?: Status
): Promise<Comment | null> {
  const sql = getDb();
  if (!sql) return null;

  try {
    const rows = await sql`
      INSERT INTO public.comments (issue_id, author_id, text)
      VALUES (${issueId}, ${author.id}, ${text})
      RETURNING *;
    `;
    if (newStatus) {
      await sql`UPDATE public.issues SET status = ${newStatus}, updated_at = NOW() WHERE id = ${issueId};`;
      await sql`
        INSERT INTO public.issue_history (issue_id, actor_id, field, old_value, new_value, message)
        VALUES (${issueId}, ${author.id}, 'Status', '', ${newStatus}, ${`Status changed to ${newStatus}`});
      `;
    }
    if (rows && rows.length > 0) {
      return {
        id: rows[0].id,
        author,
        text,
        createdAt: rows[0].created_at,
        statusChange: newStatus,
      };
    }
    return null;
  } catch (err) {
    console.error('Failed to add comment in Neon:', err);
    return null;
  }
}

export async function deleteIssueInNeon(issueId: string): Promise<void> {
  const sql = getDb();
  if (!sql) return;
  try {
    await sql`DELETE FROM public.issues WHERE id = ${issueId};`;
  } catch (err) {
    console.error('Failed to delete issue in Neon:', err);
  }
}

export async function saveDepartmentInNeon(department: Department, orgId?: string): Promise<void> {
  const sql = getDb();
  if (!sql) return;
  const targetOrgId = orgId || department.orgId;
  const targetDeptId =
    department.id === 'engineering' && targetOrgId
      ? `eng-${targetOrgId}`
      : department.id;

  try {
    await sql`
      INSERT INTO public.departments (id, org_id, name, code, description, custom_fields)
      VALUES (
        ${targetDeptId},
        ${targetOrgId || null},
        ${department.name},
        ${department.code},
        ${department.description || ''},
        ${JSON.stringify(department.customFields || [])}
      )
      ON CONFLICT (id) DO UPDATE SET
        org_id = COALESCE(public.departments.org_id, EXCLUDED.org_id),
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        description = EXCLUDED.description,
        custom_fields = EXCLUDED.custom_fields;
    `;
  } catch (err) {
    console.error('Failed to save department in Neon:', err);
  }
}

export async function deleteDepartmentInNeon(deptId: string): Promise<void> {
  const sql = getDb();
  if (!sql) return;
  try {
    await sql`DELETE FROM public.departments WHERE id = ${deptId};`;
  } catch (err) {
    console.error('Failed to delete department in Neon:', err);
  }
}

export async function updateProfileInNeon(userId: string, updates: Partial<UserProfile>): Promise<void> {
  const sql = getDb();
  if (!sql) return;
  try {
    const cleanNick = updates.nickname ? updates.nickname.replace(/^@/, '') : undefined;
    await sql`
      UPDATE public.profiles
      SET
        name = COALESCE(${updates.name || null}, name),
        nickname = COALESCE(${cleanNick || null}, nickname),
        role = COALESCE(${updates.role || null}, role),
        avatar_url = COALESCE(${updates.avatarUrl || null}, avatar_url),
        department = COALESCE(${updates.department || null}, department),
        updated_at = NOW()
      WHERE id = ${userId};
    `;
  } catch (err) {
    console.error('Failed to update profile in Neon:', err);
  }
}
