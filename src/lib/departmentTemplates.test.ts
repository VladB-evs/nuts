import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEPARTMENT_TEMPLATES,
  parseQuickProperty,
  suggestDepartmentCode,
} from './departmentTemplates';
import { findDuplicateDepartment } from './departmentRules';
import { withStandardIssueTypes } from './issueOptions';
import type { Department } from '../types';

test('suggestDepartmentCode uses initials for several words and a prefix for one', () => {
  assert.equal(suggestDepartmentCode('Customer Support'), 'CS');
  assert.equal(suggestDepartmentCode('Engineering'), 'ENG');
  assert.equal(suggestDepartmentCode('  human   resources '), 'HR');
  assert.equal(suggestDepartmentCode(''), '');
  assert.ok(suggestDepartmentCode('A B C D E F G').length <= 5);
});

test('parseQuickProperty builds a dropdown from "Name: a, b, c"', () => {
  const f = parseQuickProperty('Account Tier: Gold, Silver, Gold, Bronze', []);
  assert.deepEqual(f, {
    id: 'account_tier',
    name: 'Account Tier',
    type: 'select',
    options: ['Gold', 'Silver', 'Bronze'],
  });
});

test('parseQuickProperty builds a text field when there are no options', () => {
  assert.deepEqual(parseQuickProperty('Contract Number', []), {
    id: 'contract_number',
    name: 'Contract Number',
    type: 'text',
  });
  assert.equal(parseQuickProperty('Name:', [])?.type, 'text');
});

test('parseQuickProperty rejects empty input and keeps ids unique', () => {
  assert.equal(parseQuickProperty('   ', []), null);
  assert.equal(parseQuickProperty(': a, b', []), null);
  assert.equal(parseQuickProperty('Channel: A', ['channel'])?.id, 'channel_2');
  assert.equal(parseQuickProperty('Channel: A', ['channel', 'channel_2'])?.id, 'channel_3');
});

test('every template is usable: unique field ids, options on selects, one filter', () => {
  const names = new Set<string>();
  for (const t of DEPARTMENT_TEMPLATES) {
    assert.ok(!names.has(t.name), `duplicate template ${t.name}`);
    names.add(t.name);
    assert.ok(t.code.length > 0 && t.code.length <= 5, `${t.name} code`);
    const ids = t.customFields.map((f) => f.id);
    assert.equal(new Set(ids).size, ids.length, `${t.name} has duplicate field ids`);
    for (const f of t.customFields) {
      if (f.type === 'select') assert.ok((f.options?.length ?? 0) > 0, `${t.name}.${f.id} options`);
    }
    assert.equal(
      t.customFields.filter((f) => f.showAsFilter).length,
      1,
      `${t.name} should expose exactly one filter`
    );
  }
});

const dept = (id: string, name: string, code: string): Department => ({ id, name, code });

test('findDuplicateDepartment matches name or code case-insensitively and can ignore itself', () => {
  const all = [dept('a', 'HR', 'HRD'), dept('b', 'Sales', 'SLS')];
  assert.equal(findDuplicateDepartment(all, 'hr', 'X')?.id, 'a');
  assert.equal(findDuplicateDepartment(all, 'New', 'sls')?.id, 'b');
  assert.equal(findDuplicateDepartment(all, 'New', 'NEW'), undefined);
  assert.equal(findDuplicateDepartment(all, 'HR', 'HRD', 'a'), undefined);
  assert.equal(findDuplicateDepartment(all, '', ''), undefined);
});

test('withStandardIssueTypes adds Update and Adjustment to an old Bug/Feature field', () => {
  const old: Department = {
    id: 'e',
    name: 'Engineering',
    code: 'DEV',
    customFields: [
      { id: 'issueType', name: 'Issue Type', type: 'select', options: ['Bug', 'Feature'] },
      { id: 'environment', name: 'Env', type: 'select', options: ['LOCAL'] },
    ],
  };
  const fixed = withStandardIssueTypes(old);
  assert.deepEqual(fixed.customFields?.[0].options, ['Bug', 'Feature', 'Update', 'Adjustment']);
  assert.deepEqual(fixed.customFields?.[1].options, ['LOCAL']);
  // idempotent, and custom extras are kept
  const extra = withStandardIssueTypes({
    ...old,
    customFields: [{ id: 'issueType', name: 'Issue Type', type: 'select', options: ['Bug', 'Chore', 'Update'] }],
  });
  assert.deepEqual(extra.customFields?.[0].options, ['Bug', 'Chore', 'Update', 'Feature', 'Adjustment']);
  assert.deepEqual(withStandardIssueTypes(fixed), fixed);
});
