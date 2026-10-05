import { createServer } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { makeApi, suite, eq } from './harness.mjs';

const { t, summary } = suite();

// ---- a local stand-in for Neon Auth's key server (the real one serves /.well-known/jwks.json) ----
const { publicKey, privateKey } = await generateKeyPair('EdDSA', { extractable: true });
const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'EdDSA', use: 'sig' };
const other = await generateKeyPair('EdDSA'); // a key Neon never published
const server = createServer((req, res) => {
  if (req.url === '/neondb/auth/.well-known/jwks.json') {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ keys: [jwk] }));
  } else { res.statusCode = 404; res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const AUTH_URL = `${origin}/neondb/auth`;

let n = 0;
/** A token like the ones Neon Auth issues. `over` tweaks claims; `opts` tweaks signing. */
const token = async (over = {}, opts = {}) => {
  const claims = { email: `user${++n}@a.io`, name: `User ${n}`, emailVerified: true, ...over };
  let jwt = new SignJWT(claims).setProtectedHeader({ alg: opts.alg || 'EdDSA', kid: 'k1' })
    .setSubject(over.sub || `sub-${n}`).setIssuedAt().setIssuer(opts.iss ?? origin);
  jwt = opts.noExp ? jwt : jwt.setExpirationTime(opts.exp ?? '15m');
  return jwt.sign(opts.key || privateKey);
};
const bearer = (tk) => `__bearer__${tk}`;

const { db, call: rawCall } = await makeApi();
const owner = async (sql) => { await db.exec('RESET ROLE'); try { return await db.query(sql); } finally { await db.exec('SET ROLE nuts_app'); } };
// route a "cookie" argument starting with __bearer__ to the Authorization header
const call = async (action, args, auth = '', ip = '10.0.0.1') => {
  const realFetch = globalThis.Request;
  if (auth.startsWith('__bearer__')) {
    globalThis.Request = class extends realFetch { constructor(url, init) { super(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${auth.slice(10)}` } }); } };
    try { return await rawCall(action, args, '', ip); } finally { globalThis.Request = realFetch; }
  }
  return rawCall(action, args, auth, ip);
};
const raw = async (action, args, authHeader) => {
  const realFetch = globalThis.Request;
  globalThis.Request = class extends realFetch { constructor(url, init) { super(url, { ...init, headers: { ...init.headers, ...(authHeader ? { authorization: authHeader } : {}) } }); } };
  try { return await rawCall(action, args, '', '10.0.0.9'); } finally { globalThis.Request = realFetch; }
};

// ================================ legacy mode is untouched while the switch is off ================================
delete process.env.NEON_AUTH_URL;
console.log('\nswitch OFF (NEON_AUTH_URL unset): current login keeps working');
await t('me reports password mode', async () => eq((await call('me', {})).body.authMode, 'password'));
await t('completeSignup does not exist', async () => eq((await call('completeSignup', {}, bearer(await token()))).status, 404));
const legacy = await call('register', { orgMode: 'create', name: 'Legacy Admin', email: 'legacy@a.io', password: 'Str0ng!pass', orgName: 'Acme', nickname: 'leg', department: 'Engineering' }, '', '1.1.1.1');
await t('password register + login still work', async () => legacy.status === 200 && (await call('login', { email: 'legacy@a.io', password: 'Str0ng!pass' }, '', '1.1.1.2')).status === 200);
const orgCode = legacy.body.user.organization.code;
await t('a bearer token is ignored in password mode', async () => eq((await call('fetchAll', {}, bearer(await token()))).status, 401));

// ================================ switch ON ================================
process.env.NEON_AUTH_URL = AUTH_URL;
console.log('\nswitch ON: token verification');
await t('no token: me is empty, data calls are 401', async () => {
  const me = (await call('me', {})).body;
  return me.user === null && me.needsProfile === false && me.authMode === 'neon' && eq((await call('fetchAll', {})).status, 401);
});
await t('lower-case "bearer" scheme is accepted', async () => eq((await raw('me', {}, `bearer ${await token()}`)).body.needsProfile, true));

const bad = {
  'expired token': await token({}, { exp: Math.floor(Date.now() / 1000) - 3600 }),
  'wrong issuer': await token({}, { iss: 'https://evil.example' }),
  'signed with an unpublished key': await token({}, { key: other.privateKey }),
  'no expiry': await token({}, { noExp: true }),
  'banned user': await token({ banned: true }),
  'missing subject': await (async () => new SignJWT({ email: 'x@a.io', emailVerified: true }).setProtectedHeader({ alg: 'EdDSA', kid: 'k1' }).setIssuer(origin).setExpirationTime('5m').sign(privateKey))(),
};
for (const [name, tk] of Object.entries(bad)) {
  await t(`${name} is rejected (401)`, async () => eq((await call('fetchAll', {}, bearer(tk))).status, 401));
}
await t('tampered payload is rejected', async () => {
  const good = await token({ emailVerified: false });
  const [h, p, s] = good.split('.');
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url')), emailVerified: true })).toString('base64url');
  return eq((await call('fetchAll', {}, bearer(`${h}.${forged}.${s}`))).status, 401);
});
await t('algorithm "none" and HS256 tokens are rejected', async () => {
  const none = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: 'x', email: 'a@a.io', emailVerified: true, iss: origin, exp: 9999999999 })).toString('base64url')}.`;
  const hs = await new SignJWT({ emailVerified: true, email: 'a@a.io' }).setProtectedHeader({ alg: 'HS256' }).setSubject('x').setIssuer(origin).setExpirationTime('5m').sign(new TextEncoder().encode('secret'));
  return eq((await call('fetchAll', {}, bearer(none))).status, 401) && eq((await call('fetchAll', {}, bearer(hs))).status, 401);
});
await t('garbage Authorization headers are rejected', async () => {
  for (const h of ['Bearer', 'Bearer a.b', 'Basic abc', 'Bearer a.b.c.d', 'Bearer ' + 'x'.repeat(10)]) if ((await raw('fetchAll', {}, h)).status !== 401) return false;
  return true;
});
await t('a cookie session is ignored in Neon Auth mode', async () => eq((await rawCall('fetchAll', {}, 'nuts_session=abc')).status, 401));
await t('legacy register/login are switched off (410)', async () =>
  eq((await call('register', { orgMode: 'create', name: 'x', email: 'x@y.io', password: 'Str0ng!pass', orgName: 'z' })).status, 410) && eq((await call('login', { email: 'a@b.io', password: 'x' })).status, 410));

console.log('\nemail verification');
const unverified = bearer(await token({ emailVerified: false }));
await t('unverified: me shows no profile step, data is 403', async () => {
  const me = (await call('me', {}, unverified)).body;
  return me.user === null && me.needsProfile === false && eq((await call('fetchAll', {}, unverified)).status, 403);
});
await t('unverified cannot complete sign-up', async () => eq((await call('completeSignup', { orgMode: 'create', orgName: 'Nope' }, unverified)).status, 403));

console.log('\nsign-up completion (create a workspace, join one)');
const adminTok = await token({ email: 'Admin@New.io', name: 'Nia Admin' });
const admin = bearer(adminTok);
await t('verified but profile-less: me asks for the profile step', async () => {
  const me = (await call('me', {}, admin)).body;
  return me.needsProfile === true && me.identity.email === 'admin@new.io' && me.identity.name === 'Nia Admin';
});
await t('data calls before the profile step are 403', async () => eq((await call('fetchAll', {}, admin)).status, 403));
const created = await call('completeSignup', { orgMode: 'create', orgName: 'NewCo', nickname: 'nia', department: 'Engineering', email: 'victim@x.io', name: '' }, admin, '5.5.5.5');
await t('creates the workspace; the admin flag is set', () => eq(created.status, 200) && created.body.user.isAdmin === true && created.body.user.organization.name === 'NewCo');
await t('email comes from the token, not the request (spoofed email ignored)', async () => eq(created.body.user.email, 'admin@new.io') && (await owner(`SELECT count(*)::int n FROM profiles WHERE email='victim@x.io'`)).rows[0].n === 0);
await t('name falls back to the verified token name', async () => eq(created.body.user.name, 'Nia Admin'));
await t('the profile is linked to the token subject', async () => (await owner(`SELECT auth_user_id FROM profiles WHERE email='admin@new.io'`)).rows[0].auth_user_id !== null);
await t('no password hash is stored for a Neon Auth profile', async () => (await owner(`SELECT password_hash FROM profiles WHERE email='admin@new.io'`)).rows[0].password_hash === null);
await t('the same token now has full access', async () => { const all = await call('fetchAll', {}, admin); return all.status === 200 && all.body.users.length === 1; });
await t('completing sign-up twice is a 409', async () => eq((await call('completeSignup', { orgMode: 'create', orgName: 'Again' }, admin)).status, 409));

const newCode = created.body.user.organization.code;
const joiner = bearer(await token({ email: 'joe@new.io', name: 'Joe' }));
await t('a wrong invite code is a 404 and nothing is created', async () => eq((await call('completeSignup', { orgMode: 'join', orgCode: 'WRONG-CODE' }, joiner, '6.6.6.6')).status, 404) && (await owner(`SELECT count(*)::int n FROM profiles WHERE email='joe@new.io'`)).rows[0].n === 0);
const joined = await call('completeSignup', { orgMode: 'join', orgCode: newCode, nickname: 'joe' }, joiner, '6.6.6.7');
await t('the right invite code joins as a regular member', () => eq(joined.status, 200) && joined.body.user.isAdmin === false && joined.body.user.orgId === created.body.user.orgId);
await t('invite-code guessing is throttled per IP', async () => {
  const guesser = bearer(await token({ email: 'guess@new.io' }));
  let last = 0;
  for (let i = 0; i < 25; i++) last = (await call('completeSignup', { orgMode: 'join', orgCode: `NOPE-${i}` }, guesser, '7.7.7.7')).status;
  return eq(last, 429);
});
await t('joining requires a code', async () => eq((await call('completeSignup', { orgMode: 'join' }, bearer(await token()), '8.8.8.8')).status, 400));

console.log('\naccount takeover attempts');
await t('a second Neon user with an already-registered email cannot take that profile (409)', async () => {
  const impostor = bearer(await token({ email: 'admin@new.io', name: 'Mallory' }));
  const me = (await call('me', {}, impostor)).body;
  const res = await call('completeSignup', { orgMode: 'join', orgCode: newCode }, impostor, '9.9.9.9');
  return me.user === null && eq(res.status, 409);
});
await t('the impostor still has no access to the real admin\'s data', async () => eq((await call('fetchAll', {}, bearer(await token({ email: 'admin@new.io' })))).status, 403));

console.log('\nmoving an existing (password) account onto Neon Auth');
const legacyId = legacy.body.user.id;
await t('an UNVERIFIED token with the same email does not link the old account', async () => {
  const tk = bearer(await token({ email: 'legacy@a.io', emailVerified: false, sub: 'legacy-sub-unverified' }));
  return eq((await call('fetchAll', {}, tk)).status, 403) && (await owner(`SELECT auth_user_id FROM profiles WHERE id='${legacyId}'`)).rows[0].auth_user_id === null;
});
const legacySub = 'legacy-sub-real';
const legacyTok = bearer(await token({ email: 'LEGACY@a.io', sub: legacySub }));
await t('a VERIFIED token with the same email links it: same org, still admin, same id', async () => {
  const all = await call('fetchAll', {}, legacyTok);
  const me = (await call('me', {}, legacyTok)).body.user;
  return eq(all.status, 200) && me.id === legacyId && me.isAdmin === true && me.organization.code === orgCode
    && (await owner(`SELECT auth_user_id FROM profiles WHERE id='${legacyId}'`)).rows[0].auth_user_id === legacySub;
});
await t('a second verified Neon user cannot link the same (now claimed) profile', async () => {
  const tk = bearer(await token({ email: 'legacy@a.io', sub: 'legacy-sub-attacker' }));
  const me = (await call('me', {}, tk)).body;
  return me.user === null && me.needsProfile === true && (await owner(`SELECT auth_user_id FROM profiles WHERE id='${legacyId}'`)).rows[0].auth_user_id === legacySub;
});
await t('a profile can never be linked to two Neon users (unique index)', async () => {
  try { await owner(`INSERT INTO profiles (id, org_id, email, name, auth_user_id) SELECT gen_random_uuid(), org_id, 'dup@a.io', 'Dup', '${legacySub}' FROM profiles WHERE id='${legacyId}'`); return false; } catch { return true; }
});

console.log('\neveryday use over Bearer tokens');
await t('create ticket, comment and read it back with a bearer token', async () => {
  const dept = (await call('fetchAll', {}, legacyTok)).body.departments[0];
  const attrs = { issueType: 'Bug', environment: 'LOCAL', devScope: 'Frontend only' };
  const iss = (await call('createIssue', { data: { title: 'via neon auth', description: 'd', departmentId: dept.id, priority: 'P2', customAttributes: attrs } }, legacyTok)).body.issue;
  await call('addComment', { issueId: iss.id, text: 'hello' }, legacyTok);
  return (await call('fetchAll', {}, legacyTok)).body.issues.find((i) => i.id === iss.id)?.comments.length === 1;
});
await t('a user in another workspace cannot see it', async () => (await call('fetchAll', {}, admin)).body.issues.every((i) => i.title !== 'via neon auth'));
await t('an offboarded user is locked out on their very next request', async () => {
  const before = (await call('fetchAll', {}, joiner)).status;
  await call('updateProfile', { userId: joined.body.user.id, updates: { status: 'departed', departureReason: 'left' } }, admin);
  const after = await call('fetchAll', {}, joiner);
  return eq(before, 200) && eq(after.status, 403);
});
await t('logout is harmless (the browser clears its own token)', async () => eq((await call('logout', {}, admin)).status, 200));

console.log('\nswitching back off restores password login');
delete process.env.NEON_AUTH_URL;
await t('password login works again and tokens stop working', async () =>
  (await call('login', { email: 'legacy@a.io', password: 'Str0ng!pass' }, '', '1.1.1.9')).status === 200 && eq((await call('fetchAll', {}, legacyTok)).status, 401));

server.close();
process.exit(summary() ? 0 : 1);
