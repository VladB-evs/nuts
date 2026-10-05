import { Department, UserProfile, Issue, Status, Comment, SavedView, SavedViewConfig, AppNotification } from '../types';

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

/**
 * Fire-and-forget saves (edits, comments, ...) update the screen first and the server second.
 * When the server refuses one, the app registers a handler here so the person is told and the
 * screen is re-synced, instead of silently showing something that was never saved.
 */
let mutationErrorHandler: ((message: string) => void) | null = null;
export function setMutationErrorHandler(handler: ((message: string) => void) | null) {
  mutationErrorHandler = handler;
}
const reportMutationError = (what: string, err: unknown) => {
  console.error(`Failed to ${what}:`, err);
  mutationErrorHandler?.(err instanceof Error ? err.message : `Could not ${what}.`);
};

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
  savedViews?: SavedView[];
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
    reportMutationError('save your change', err);
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
    reportMutationError('add the comment', err);
    return null;
  }
}

export async function deleteIssueInNeon(issueId: string): Promise<void> {
  try {
    await call('deleteIssue', { issueId });
  } catch (err) {
    reportMutationError('delete the issue', err);
  }
}

export async function saveDepartmentInNeon(department: Department, _orgId?: string): Promise<void> {
  try {
    await call('saveDepartment', { department });
  } catch (err) {
    reportMutationError('save the department', err);
  }
}

export async function deleteDepartmentInNeon(deptId: string): Promise<void> {
  try {
    await call('deleteDepartment', { deptId });
  } catch (err) {
    reportMutationError('delete the department', err);
  }
}

export async function updateProfileInNeon(userId: string, updates: Partial<UserProfile>): Promise<void> {
  try {
    await call('updateProfile', { userId, updates });
  } catch (err) {
    reportMutationError('update the profile', err);
  }
}

// ============================================================================
// STARS, WATCHING, BULK EDITS, SAVED VIEWS, NOTIFICATIONS
// ============================================================================

export async function setStarInNeon(issueId: string, starred: boolean): Promise<void> {
  try {
    await call('toggleStar', { issueId, starred });
  } catch (err) {
    reportMutationError('update the star', err);
  }
}

export async function setWatchInNeon(issueId: string, watching: boolean): Promise<void> {
  try {
    await call('toggleWatch', { issueId, watching });
  } catch (err) {
    reportMutationError('update watching', err);
  }
}

/** Throws with the server's message so the caller can show it. */
export async function bulkUpdateInNeon(
  ids: string[],
  updates: { status?: string; priority?: string; assigneeId?: string }
): Promise<number> {
  return (await call<{ updated: number }>('bulkUpdateIssues', { ids, updates })).updated;
}

export async function saveViewInNeon(name: string, config: SavedViewConfig): Promise<SavedView> {
  return (await call<{ view: SavedView }>('saveView', { name, config })).view;
}

export async function deleteViewInNeon(id: string): Promise<void> {
  await call('deleteView', { id });
}

export async function fetchNotificationsFromNeon(): Promise<{ items: AppNotification[]; unread: number } | null> {
  try {
    return await call('listNotifications');
  } catch {
    return null; // a missed refresh is not worth interrupting anyone
  }
}

export async function fetchNotificationCount(): Promise<{ unread: number; latest: string | null } | null> {
  try {
    return await call('notificationCount');
  } catch {
    return null;
  }
}

export async function markNotificationsReadInNeon(target: { ids: string[] } | { all: true }): Promise<void> {
  try {
    await call('markNotificationsRead', target);
  } catch (err) {
    console.error('Failed to mark notifications read:', err);
  }
}
