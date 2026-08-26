import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, hashPassword, parseStaffUsers, verifySessionToken } from '../lib/auth.js';

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

test('individual staff accounts keep their display names', async () => {
  const passwordHash = await hashPassword('example-password');
  const users = parseStaffUsers(JSON.stringify({
    mark: { displayName: 'Mark', passwordHash },
    mariel: { displayName: 'Mariel', passwordHash }
  }));

  assert.equal(users.mark.displayName, 'Mark');
  assert.equal(users.mariel.displayName, 'Mariel');
});

test('staff session includes the signed-in person name', async () => {
  const secret = 'a-long-preview-secret-used-only-in-tests';
  const token = await createSessionToken('mark', secret, { name: 'Mark' });
  const session = await verifySessionToken(token, secret);

  assert.equal(session.sub, 'mark');
  assert.equal(session.name, 'Mark');
});
