import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, hashPassword, verifySessionToken } from '../lib/auth.js';

test('staff session tokens verify only with the signing secret', async () => {
  const token = await createSessionToken('omd-team', 'a-long-preview-secret-used-only-in-tests');
  const session = await verifySessionToken(token, 'a-long-preview-secret-used-only-in-tests');

  assert.equal(session.sub, 'omd-team');
  assert.ok(session.exp > Math.floor(Date.now() / 1000));
  assert.equal(await verifySessionToken(token, 'the-wrong-signing-secret'), null);
});

test('malformed staff sessions are rejected', async () => {
  assert.equal(await verifySessionToken('', 'a-long-preview-secret-used-only-in-tests'), null);
  assert.equal(await verifySessionToken('not-a-session', 'a-long-preview-secret-used-only-in-tests'), null);
});

test('password hashing is deterministic without storing the password', async () => {
  const first = await hashPassword('example-password');
  const second = await hashPassword('example-password');

  assert.equal(first, second);
  assert.equal(first.length, 64);
  assert.notEqual(first, 'example-password');
});
