import test from 'node:test';
import assert from 'node:assert/strict';

import { getPublicDealUrl, PUBLIC_DEAL_ORIGIN } from '../lib/dealLinks.mjs';

test('public deal links always use the canonical production origin', () => {
  assert.equal(PUBLIC_DEAL_ORIGIN, 'https://deals.offmarketdaily.com');
  assert.equal(
    getPublicDealUrl('mark-created-deal-abc1'),
    'https://deals.offmarketdaily.com/d/mark-created-deal-abc1'
  );
});

test('public deal links safely encode the slug without inheriting the admin host', () => {
  assert.equal(
    getPublicDealUrl('deal with spaces'),
    'https://deals.offmarketdaily.com/d/deal%20with%20spaces'
  );
});
