import { Department, UserProfile, Issue, Status, Comment } from '../types';

/**
 * Client for the NUTS API (netlify/functions/api.mts).
 *
 * The browser holds no database credentials. Identity is an HttpOnly session cookie, so the
 * server decides who the caller is and which organization they belong to; the `reporter`,
 * `actor`, `author` and `orgId` parameters below are kept for call-site compatibility and
 * are never sent.
 */

async function call<T>(action: string, args: Record<string, unknown> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch('/api', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action, args }),
    });
  } catch {
    throw new Error('Could not reach the server. Please check your connection.');
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response (e.g. the API isn't running)
  }
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status}).`);
  }
  return data as T;
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

export async function registerUser(params: {
  name: string;
  email: string;
  nickname: string;
  password?: string;
  department?: string;
  role: string;
  avatarUrl?: string;
  orgMode: 'create' | 'join';
  orgName?: string;
  orgCode?: string;
}): Promise<UserProfile> {
  return (await call<{ user: UserProfile }>('register', params)).user;
}

export async function loginWithEmail(email: string, password?: string): Promise<UserProfile> {
  return (await call<{ user: UserProfile }>('login', { email, password })).user;
}

/** The signed-in user for the current session cookie, or null. */
export async function fetchCurrentUser(): Promise<UserProfile | null> {
  try {
    return (await call<{ user: UserProfile | null }>('me')).user;
  } catch {
    return null;
  }
}

export async function logoutFromServer(): Promise<void> {
  try {
    await call('logout');
  } catch {
    // the local sign-out proceeds regardless
  }
}

// ============================================================================
// DATA FETCHING (scoped to the caller's organization by the server)
// ============================================================================

export async function fetchAllDataFromNeon(): Promise<{
  departments: Department[];
  users: UserProfile[];
  issues: Issue[];
} | null> {
  try {
    return await call('fetchAll');
  } catch (err) {
    console.error('Failed to load workspace data:', err);
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
    priority: string;
    customAttributes?: Record<string, any>;
    issueType?: string;
    environment?: string;
    devScope?: string;
    status?: string;
    assigneeId?: string;
  },
  _reporter?: UserProfile,
  _orgId?: string
): Promise<Issue | null> {
  try {
    return (await call<{ issue: Issue }>('createIssue', { data })).issue;
  } catch (err) {
    console.error('Failed to create issue:', err);
    return null;
  }
}

export async function updateIssueInNeon(
  issueId: string,
  updates: Partial<Issue>,
  _actor?: UserProfile,
  _orgId?: string
): Promise<void> {
  try {
    await call('updateIssue', { issueId, updates });
  } catch (err) {
    console.error('Failed to update issue:', err);
  }
}

export async function addCommentInNeon(
  issueId: string,
  text: string,
  _author?: UserProfile,
  newStatus?: Status
): Promise<Comment | null> {
  try {
    return (await call<{ comment: Comment }>('addComment', { issueId, text, newStatus })).comment;
  } catch (err) {
    console.error('Failed to add comment:', err);
    return null;
  }
}

export async function deleteIssueInNeon(issueId: string): Promise<void> {
  try {
    await call('deleteIssue', { issueId });
  } catch (err) {
    console.error('Failed to delete issue:', err);
  }
}

export async function saveDepartmentInNeon(department: Department, _orgId?: string): Promise<void> {
  try {
    await call('saveDepartment', { department });
  } catch (err) {
    console.error('Failed to save department:', err);
  }
}

export async function deleteDepartmentInNeon(deptId: string): Promise<void> {
  try {
    await call('deleteDepartment', { deptId });
  } catch (err) {
    console.error('Failed to delete department:', err);
  }
}

export async function updateProfileInNeon(userId: string, updates: Partial<UserProfile>): Promise<void> {
  try {
    await call('updateProfile', { userId, updates });
  } catch (err) {
    console.error('Failed to update profile:', err);
  }
}
