import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePasswordStrength } from './passwordStrength';

test('a password needs length, upper, lower, number and symbol', () => {
  assert.equal(validatePasswordStrength('Str0ng!pass').isValid, true);
  for (const weak of ['', 'sh0rt!A', 'alllowercase1!', 'ALLUPPERCASE1!', 'NoNumbers!!', 'NoSymbols123A']) {
    assert.equal(validatePasswordStrength(weak).isValid, false, weak);
  }
});
