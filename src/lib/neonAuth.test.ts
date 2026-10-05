import { test } from 'node:test';
import assert from 'node:assert/strict';
import { friendlyAuthError, isUnverifiedEmailError, tokenExpiryMs } from './neonAuth';

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (payload: unknown) => `${b64({ alg: 'EdDSA' })}.${b64(payload)}.sig`;

test('tokenExpiryMs reads exp from the payload and survives junk', () => {
  assert.equal(tokenExpiryMs(jwt({ exp: 1_800_000_000 })), 1_800_000_000_000);
  assert.equal(tokenExpiryMs(jwt({ sub: 'x' })), 0);
  for (const junk of ['', 'abc', 'a.b', 'a.!!!.c', jwt('not an object')]) assert.equal(tokenExpiryMs(junk), 0);
});

test('friendlyAuthError turns Neon Auth errors into plain language', () => {
  assert.equal(friendlyAuthError({ code: 'INVALID_EMAIL_OR_PASSWORD' }), 'Incorrect email or password.');
  assert.match(friendlyAuthError({ code: 'USER_ALREADY_EXISTS' }), /already exists/);
  assert.match(friendlyAuthError({ code: 'EMAIL_NOT_VERIFIED' }), /confirm your email/i);
  assert.match(friendlyAuthError({ code: 'INVALID_OTP' }), /code is not right/);
  assert.match(friendlyAuthError({ message: 'OTP expired' }), /expired/);
  assert.match(friendlyAuthError({ status: 429 }), /Too many/);
});

test('friendlyAuthError never leaks long or empty technical messages', () => {
  assert.equal(friendlyAuthError(null, 'fallback'), 'fallback');
  assert.equal(friendlyAuthError({ message: 'x'.repeat(500) }, 'fallback'), 'fallback');
  assert.equal(friendlyAuthError({ message: 'Short readable text' }), 'Short readable text');
});

test('isUnverifiedEmailError recognises the unverified-email response', () => {
  assert.equal(isUnverifiedEmailError({ code: 'EMAIL_NOT_VERIFIED' }), true);
  assert.equal(isUnverifiedEmailError({ message: 'Please verify your email' }), true);
  assert.equal(isUnverifiedEmailError({ code: 'INVALID_EMAIL_OR_PASSWORD' }), false);
  assert.equal(isUnverifiedEmailError(undefined), false);
});
