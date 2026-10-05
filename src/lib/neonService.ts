import { Department, UserProfile, Issue, Status, Comment, SavedView, SavedViewConfig, AppNotification } from '../types';
import {
  neonAuthEnabled,
  getAuthClient,
  getAccessToken,
  clearTokenCache,
  friendlyAuthError,
  isUnverifiedEmailError,
  VerificationRequiredError,
  ProfileRequiredError,
} from './neonAuth';

/**
 * Client for the NUTS API (netlify/functions/api.mts).
 *
 * The browser holds no database credentials. Identity is an HttpOnly session cookie, so the
 * server decides who the caller is and which organization they belong to; the `reporter`,
 * `actor`, `author` and `orgId` parameters below are kept for call-site compatibility and
 * are never sent.
 */

async function call<T>(action: string, args: Record<string, unknown> = {}): Promise<T> {
  const send = async (token: string | null): Promise<Response> => {
    try {
      return await fetch('/api', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ action, args }),
      });
    } catch {
      throw new Error('Could not reach the server. Please check your connection.');
    }
  };

  // With Neon Auth the person is identified by a short-lived signed token instead of a cookie.
  let token = neonAuthEnabled ? await getAccessToken() : null;
  let res = await send(token);
  if (res.status === 401 && token) {
    // the token may have expired between being checked and being used: get a fresh one once
    token = await getAccessToken(true);
    if (token) res = await send(token);
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

export interface SignUpParams {
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
}

interface MeResponse {
  user: UserProfile | null;
  authMode?: 'neon' | 'password';
  needsProfile?: boolean;
  identity?: { email: string; name: string } | null;
}

/** After a Neon Auth session exists: resolve to the person's profile, or say which step comes next. */
async function resolveSignedInUser(emailHint: string, profile?: SignUpParams): Promise<UserProfile> {
  clearTokenCache();
  const me = await call<MeResponse>('me');
  if (me.user) return me.user;
  if (me.needsProfile && me.identity) {
    if (profile) return completeSignup(profile);
    throw new ProfileRequiredError(me.identity);
  }
  // no session yet, or the email is not confirmed
  throw new VerificationRequiredError(emailHint);
}

export async function registerUser(params: SignUpParams): Promise<UserProfile> {
  if (!neonAuthEnabled) return (await call<{ user: UserProfile }>('register', params as any)).user;
  const client: any = await getAuthClient();
  const email = params.email.trim().toLowerCase();
  const { error } = await client.signUp.email({ email, password: params.password || '', name: params.name });
  if (error) throw new Error(friendlyAuthError(error, 'Could not create your account.'));
  return resolveSignedInUser(email, params);
}

export async function loginWithEmail(email: string, password?: string): Promise<UserProfile> {
  if (!neonAuthEnabled) return (await call<{ user: UserProfile }>('login', { email, password })).user;
  const client: any = await getAuthClient();
  const clean = email.trim().toLowerCase();
  const { error } = await client.signIn.email({ email: clean, password: password || '' });
  if (error) {
    if (isUnverifiedEmailError(error)) throw new VerificationRequiredError(clean);
    throw new Error(friendlyAuthError(error, 'Incorrect email or password.'));
  }
  return resolveSignedInUser(clean);
}

/**
 * For people who had an account before sign-in moved to Neon Auth: creates their new login. Once the
 * email is confirmed, the API reconnects it to their existing profile, matched on that verified email.
 */
export async function startLoginForExistingAccount(email: string, password: string, name: string): Promise<UserProfile> {
  const client: any = await getAuthClient();
  const clean = email.trim().toLowerCase();
  const { error } = await client.signUp.email({ email: clean, password, name: name.trim() || clean });
  if (error) throw new Error(friendlyAuthError(error, 'Could not set up your new login.'));
  return resolveSignedInUser(clean);
}

/** Confirms the emailed code, then signs in (and finishes the workspace step if sign-up details were given). */
export async function verifyEmailCode(
  email: string,
  code: string,
  password?: string,
  profile?: SignUpParams
): Promise<UserProfile> {
  const client: any = await getAuthClient();
  const clean = email.trim().toLowerCase();
  const { error } = await client.emailOtp.verifyEmail({ email: clean, otp: code.trim() });
  if (error) throw new Error(friendlyAuthError(error, 'That code is not right.'));
  if (password) {
    const signedIn = await client.signIn.email({ email: clean, password });
    if (signedIn.error) throw new Error(friendlyAuthError(signedIn.error, 'Could not sign you in.'));
  }
  return resolveSignedInUser(clean, profile);
}

export async function resendVerificationCode(email: string): Promise<void> {
  const client: any = await getAuthClient();
  const clean = email.trim().toLowerCase();
  const { error } = await client.emailOtp.sendVerificationOtp({ email: clean, type: 'email-verification' });
  if (error) throw new Error(friendlyAuthError(error, 'Could not send a new code.'));
}

/** Creates the workspace (or joins one by invite code) for a verified, signed-in person. */
export async function completeSignup(p: SignUpParams): Promise<UserProfile> {
  const { password: _ignored, email: _email, ...rest } = p; // email and name come from the verified token on the server
  return (await call<{ user: UserProfile }>('completeSignup', rest as any)).user;
}

/** Signed in with Neon Auth but not yet in a workspace? Returns who they are. */
export async function fetchPendingProfile(): Promise<{ email: string; name: string } | null> {
  if (!neonAuthEnabled) return null;
  try {
    const me = await call<MeResponse>('me');
    return me.needsProfile && me.identity ? me.identity : null;
  } catch {
    return null;
  }
}

/** Asks Neon Auth to email a one-time code for resetting the password. The answer never reveals whether the address has an account. */
export async function requestPasswordResetCode(email: string): Promise<void> {
  const client: any = await getAuthClient();
  const { error } = await client.emailOtp.requestPasswordReset({ email: email.trim().toLowerCase() });
  if (error && Number(error.status) !== 400 && Number(error.status) !== 404) {
    throw new Error(friendlyAuthError(error, 'Could not send a reset code.'));
  }
}

export async function resetPasswordWithCode(email: string, code: string, newPassword: string): Promise<void> {
  const client: any = await getAuthClient();
  const { error } = await client.emailOtp.resetPassword({
    email: email.trim().toLowerCase(),
    otp: code.trim(),
    password: newPassword,
  });
  if (error) throw new Error(friendlyAuthError(error, 'Could not reset the password.'));
}

/** Changes the password for the signed-in person and signs out every other session. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const client: any = await getAuthClient();
  const { error } = await client.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
  if (error) throw new Error(friendlyAuthError(error, 'Could not change the password.'));
}

export async function signOutOtherSessions(): Promise<void> {
  const client: any = await getAuthClient();
  const { error } = await client.revokeOtherSessions();
  if (error) throw new Error(friendlyAuthError(error, 'Could not sign out other devices.'));
}

/** The signed-in user for the current session, or null. */
export async function fetchCurrentUser(): Promise<UserProfile | null> {
  try {
    if (neonAuthEnabled && !(await getAccessToken())) return null; // signed out: nothing to ask the server
    return (await call<MeResponse>('me')).user;
  } catch {
    return null;
  }
}

export async function logoutFromServer(): Promise<void> {
  try {
    if (neonAuthEnabled) {
      const client: any = await getAuthClient();
      await client.signOut();
    } else {
      await call('logout');
    }
  } catch {
    // the local sign-out proceeds regardless
  } finally {
    clearTokenCache();
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
