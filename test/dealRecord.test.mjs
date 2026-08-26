import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPublishedDealRecord,
  buildTrackingOnlyDealRecord,
  createDealSlug,
  DEAL_STATUS,
  isArchivedDeal,
  isPublicDeal,
  isTrackingOnlyDeal
} from '../lib/dealRecord.mjs';

test('published records keep the full package and receive a public status', () => {
  const record = buildPublishedDealRecord({
    formData: { address: '2202 Van Wert St', askingPrice: '134000' },
    photos: [{ url: 'https://example.com/photo.jpg', label: 'Exterior' }],
    suffix: 'abcd'
  });

  assert.equal(record.slug, '2202-van-wert-st-abcd');
  assert.equal(record.data.omdStatus, DEAL_STATUS.PUBLISHED);
  assert.equal(record.data.askingPrice, '134000');
  assert.equal(record.data.photos.length, 1);
  assert.equal(isPublicDeal(record.data), true);
});

test('tracking-only records require only an address and never carry a public package', () => {
  const record = buildTrackingOnlyDealRecord({
    formData: {
      address: '1160 Bull Moose Drive',
      city: 'Chandler',
      state: 'AZ',
      zip: '85224',
      askingPrice: '250000',
      conditionNotes: 'Private working notes'
    },
    suffix: 'vip1'
  });

  assert.equal(record.slug, 'internal-1160-bull-moose-drive-vip1');
  assert.deepEqual(record.data, {
    address: '1160 Bull Moose Drive',
    city: 'Chandler',
    state: 'AZ',
    zip: '85224',
    photos: [],
    omdStatus: DEAL_STATUS.TRACKING_ONLY
  });
  assert.equal(isTrackingOnlyDeal(record.data), true);
  assert.equal(isPublicDeal(record.data), false);
});

test('tracking-only records reject an empty address before any database write', () => {
  assert.throws(
    () => buildTrackingOnlyDealRecord({ formData: {}, suffix: 'test' }),
    /Address is required/
  );
});

test('legacy records without a status remain public', () => {
  assert.equal(isPublicDeal({ address: 'Existing Deal' }), true);
  assert.equal(isPublicDeal(null), false);
  assert.equal(createDealSlug('', 'safe'), 'deal-safe');
});

test('archived deals are retained internally but no longer public', () => {
  const data = {
    address: 'Archived Deal',
    omdStatus: DEAL_STATUS.PUBLISHED,
    audit: { archived: true }
  };

  assert.equal(isArchivedDeal(data), true);
  assert.equal(isPublicDeal(data), false);
});
