import test from 'node:test';
import assert from 'node:assert/strict';

import { removeUnexpectedContactActions } from '../lib/contactActions.mjs';

test('buyer contact actions retain only Text Now and Call', () => {
  const removals = [];
  const action = (label) => ({ remove: () => removals.push(label) });
  const container = {
    children: [action('Text Now'), action('Call'), action('Send Text')]
  };

  assert.equal(removeUnexpectedContactActions(container), 1);
  assert.deepEqual(removals, ['Send Text']);
});

test('buyer contact actions require no cleanup when only two actions exist', () => {
  const container = {
    children: [{ remove: () => assert.fail('Text Now was removed') }, { remove: () => assert.fail('Call was removed') }]
  };

  assert.equal(removeUnexpectedContactActions(container), 0);
});
