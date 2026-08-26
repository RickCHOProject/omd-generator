import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_OWNER_EMAIL, getOMDAccess, isOwner } from '../lib/staffAccess.mjs';

const user = (overrides = {}) => ({
  id: 'user-1',
  email: 'person@example.com',
  app_metadata: {},
  user_metadata: {},
  ...overrides
});

test('the configured owner receives owner access regardless of metadata', () => {
  const session = getOMDAccess(user({
    email: DEFAULT_OWNER_EMAIL.toUpperCase(),
    user_metadata: { display_name: 'Rick' }
  }));

  assert.equal(session.role, 'owner');
  assert.equal(session.name, 'Rick');
  assert.equal(isOwner(session), true);
});

test('an existing Supabase user is denied unless explicitly approved for OMD', () => {
  assert.equal(getOMDAccess(user()), null);
  assert.equal(getOMDAccess(user({ app_metadata: { omd_role: 'owner' } })), null);
});

test('active OMD staff are allowed and retain their individual identity', () => {
  const session = getOMDAccess(user({
    email: 'mark@example.com',
    app_metadata: { omd_role: 'staff', omd_active: true },
    user_metadata: { display_name: 'Mark' }
  }));

  assert.equal(session.role, 'staff');
  assert.equal(session.name, 'Mark');
  assert.equal(session.email, 'mark@example.com');
});

test('deactivated staff are denied', () => {
  assert.equal(getOMDAccess(user({
    app_metadata: { omd_role: 'staff', omd_active: false }
  })), null);
});
