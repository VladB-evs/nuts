import { getDb, isNeonConfigured } from './neon';
import { Department, UserProfile, Issue, Priority, Status, IssueType, Environment, DevScope, Comment, HistoryEntry, CustomFieldDefinition } from '../types';

export async function hashPassword(password: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    return password;
  }
  const enc = new TextEncoder();
  const data = enc.encode(password + ':nuts_salt_2026');
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

export async function ensurePasswordColumn(): Promise<void> {
  const sql = getDb();
  if (!sql) return;
  try {
    await sql`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;`;
  } catch {
    // If table doesn't exist yet, migration will be run by user
  }
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

export async function loginWithEmail(email: string, password?: string): Promise<UserProfile> {
  const sql = getDb();
  if (!sql) throw new Error('Database not configured');

  await ensurePasswordColumn();

  const cleanEmail = email.trim().toLowerCase();
  const rows = await sql`
    SELECT id, name, nickname, email, role, department, avatar_url, is_admin, password_hash
    FROM public.profiles
    WHERE LOWER(email) = LOWER(${cleanEmail})
    LIMIT 1;
  `;

  if (!rows || rows.length === 0) {
    throw new Error(`No account found for "${cleanEmail}". Please check your email or create an account.`);
  }

  const userRow = rows[0];

  // If password was provided and account has a password_hash set, verify it
  if (userRow.password_hash && password) {
    const hashed = await hashPassword(password);
    if (userRow.password_hash !== hashed) {
      throw new Error('Incorrect password. Please try again.');
    }
  } else if (!userRow.password_hash && password) {
    // Save password for seeded account on first sign-in
    const hashed = await hashPassword(password);
    try {
      await sql`
        UPDATE public.profiles
        SET password_hash = ${hashed}
        WHERE id = ${userRow.id};
      `;
    } catch {
      // Non-fatal if update fails
    }
  }

  return {
    id: userRow.id,
    name: userRow.name,
    nickname: userRow.nickname || '',
    email: userRow.email,
    role: userRow.role || 'Member',
    department: userRow.department || 'Engineering',
    avatarUrl: userRow.avatar_url || '',
    avatar: userRow.avatar_url || '',
  };
}

export async function registerProfile(data: {
  name: string;
  email: string;
  nickname: string;
  password?: string;
  department: string;
  role: string;
  avatarUrl?: string;
}): Promise<UserProfile> {
  const sql = getDb();
  if (!sql) throw new Error('Database not configured');

  await ensurePasswordColumn();

  const cleanEmail = data.email.trim().toLowerCase();
  const cleanNickname = data.nickname.trim().replace(/^@/, '');
  const hashed = data.password ? await hashPassword(data.password) : null;

  const rows = await sql`
    INSERT INTO public.profiles (
      name, email, nickname, role, department, avatar_url, password_hash
    ) VALUES (
      ${data.name.trim()},
      ${cleanEmail},
      ${cleanNickname},
      ${data.role.trim() || 'Member'},
      ${data.department.trim() || 'Engineering'},
      ${data.avatarUrl?.trim() || null},
      ${hashed}
    )
    RETURNING id, name, nickname, email, role, department, avatar_url;
  `;

  const userRow = rows[0];
  return {
    id: userRow.id,
    name: userRow.name,
    nickname: userRow.nickname || '',
    email: userRow.email,
    role: userRow.role || 'Member',
    department: userRow.department || 'Engineering',
    avatarUrl: userRow.avatar_url || '',
    avatar: userRow.avatar_url || '',
  };
}

// ============================================================================
// DATA FETCHING
// ============================================================================

export async function fetchAllDataFromNeon(): Promise<{
  departments: Department[];
  users: UserProfile[];
  issues: Issue[];
} | null> {
  const sql = getDb();
  if (!sql) return null;

  try {
    // 1. Fetch departments and profiles in parallel
    const [deptRows, profileRows] = await Promise.all([
      sql`SELECT id, name, code, description, custom_fields FROM public.departments ORDER BY code ASC;`,
      sql`SELECT id, name, nickname, email, role, department, avatar_url, is_admin FROM public.profiles ORDER BY name ASC;`,
    ]);

    const users: UserProfile[] = (profileRows || []).map((p: any) => ({
      id: p.id,
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
        name: d.name,
        code: d.code,
        description: d.description || '',
        customFields: fields,
      };
    });

    // 2. Fetch issues, comments, and history
    const [issueRows, commentRows, historyRows] = await Promise.all([
      sql`SELECT * FROM public.issues ORDER BY number DESC;`,
      sql`SELECT * FROM public.comments ORDER BY created_at ASC;`,
      sql`SELECT * FROM public.issue_history ORDER BY created_at DESC;`,
    ]);

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
// MUTATIONS
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
  reporter: UserProfile
): Promise<Issue | null> {
  const sql = getDb();
  if (!sql) return null;

  try {
    const rows = await sql`
      INSERT INTO public.issues (
        title, description, department_id, priority, status,
        custom_attributes, issue_type, environment, dev_scope,
        assignee_id, reporter_id
      ) VALUES (
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
  actor: UserProfile
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

export async function saveDepartmentInNeon(department: Department): Promise<void> {
  const sql = getDb();
  if (!sql) return;
  try {
    await sql`
      INSERT INTO public.departments (id, name, code, description, custom_fields)
      VALUES (
        ${department.id},
        ${department.name},
        ${department.code},
        ${department.description || ''},
        ${JSON.stringify(department.customFields || [])}
      )
      ON CONFLICT (id) DO UPDATE SET
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
