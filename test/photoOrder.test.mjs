import test from 'node:test';
import assert from 'node:assert/strict';

import { reorderItems } from '../lib/photoOrder.mjs';

test('photos can be moved directly to a new position', () => {
  assert.deepEqual(reorderItems(['front', 'kitchen', 'damage'], 2, 0), ['damage', 'front', 'kitchen']);
  assert.deepEqual(reorderItems(['front', 'kitchen', 'damage'], 0, 2), ['kitchen', 'damage', 'front']);
});

test('invalid photo moves leave the original order intact', () => {
  const original = ['front', 'kitchen'];
  assert.deepEqual(reorderItems(original, -1, 1), original);
  assert.deepEqual(reorderItems(original, 0, 4), original);
  assert.deepEqual(original, ['front', 'kitchen']);
});
