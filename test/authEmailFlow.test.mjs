import test from 'node:test';
import assert from 'node:assert/strict';
import { getEmailFlowNext, getEmailOtpType, safeNextPath } from '../lib/authEmailFlow.mjs';

test('accepts only the email link types used by OMD', () => {
  assert.equal(getEmailOtpType('invite'), 'invite');
  assert.equal(getEmailOtpType('RECOVERY'), 'recovery');
  assert.equal(getEmailOtpType('signup'), 'signup');
  assert.equal(getEmailOtpType('magiclink'), null);
  assert.equal(getEmailOtpType(''), null);
});

test('email setup links default to the password screen', () => {
  assert.equal(getEmailFlowNext('invite'), '/reset-password');
  assert.equal(getEmailFlowNext('recovery'), '/reset-password');
  assert.equal(getEmailFlowNext('signup'), '/reset-password');
});

test('redirects stay on OMD and reject protocol-relative paths', () => {
  assert.equal(safeNextPath('/admin'), '/admin');
  assert.equal(safeNextPath('//outside.example', '/login'), '/login');
  assert.equal(safeNextPath('https://outside.example', '/login'), '/login');
});
