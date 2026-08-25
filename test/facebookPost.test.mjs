import test from 'node:test';
import assert from 'node:assert/strict';

import { buildFacebookPost, FACEBOOK_VARIANT_COUNT, getFacebookVariantIndex } from '../lib/facebookPost.mjs';

const sampleDeal = {
  address: '2202 Van Wert St',
  city: 'Greensboro',
  state: 'NC',
  askingPrice: '134000',
  arv: '220000',
  beds: '3',
  baths: '1',
  sqft: '1108',
  occupancy: 'Tenant occupied',
  coe: '09/13/2026',
  conditionNotes: 'Needs work — likely a full interior refresh. Water heater needs replacement.',
  phone: '980-351-1529'
};

const dealUrl = 'https://deals.offmarketdaily.com/d/2202-van-wert-st-hc0j';

test('every Facebook variation preserves the important deal facts', () => {
  for (let variantIndex = 0; variantIndex < FACEBOOK_VARIANT_COUNT; variantIndex += 1) {
    const post = buildFacebookPost(sampleDeal, { variantIndex, dealUrl });

    assert.match(post, /Greensboro/);
    assert.match(post, /\$134,000/);
    assert.match(post, /\$220,000/);
    assert.match(post, /980-351-1529/);
    assert.match(post, /https:\/\/deals\.offmarketdaily\.com\/d\/2202-van-wert-st-hc0j/);
    assert.doesNotMatch(post, /2202 Van Wert St/);
  }
});

test('generated Facebook copy never contains em dashes or en dashes', () => {
  for (let variantIndex = 0; variantIndex < FACEBOOK_VARIANT_COUNT; variantIndex += 1) {
    const post = buildFacebookPost(sampleDeal, { variantIndex, dealUrl });
    assert.doesNotMatch(post, /[\u2013\u2014]/);
  }
});

test('refreshing produces genuinely different openings and ordering', () => {
  const posts = Array.from({ length: FACEBOOK_VARIANT_COUNT }, (_, variantIndex) => (
    buildFacebookPost(sampleDeal, { variantIndex, dealUrl })
  ));

  assert.equal(new Set(posts).size, FACEBOOK_VARIANT_COUNT);
});

test('an unpublished deal explains that the live link is still pending', () => {
  const post = buildFacebookPost(sampleDeal, { variantIndex: 0 });
  assert.match(post, /link will be added automatically after the property is published/i);
});

test('the default wording can rotate automatically from one deal to another', () => {
  const indexes = [
    sampleDeal,
    { ...sampleDeal, address: '10 Oak Ave', city: 'Charlotte' },
    { ...sampleDeal, address: '88 Pine Rd', city: 'Raleigh' },
    { ...sampleDeal, address: '5 Main St', city: 'Durham' }
  ].map(getFacebookVariantIndex);

  assert.ok(new Set(indexes).size > 1);
});
