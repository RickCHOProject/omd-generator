import test from 'node:test';
import assert from 'node:assert/strict';

import { buildMarketingPackage, getMarketingSettings } from '../lib/marketingPackage.mjs';

const deal = {
  address: '101 Test Lane',
  city: 'Acworth',
  state: 'GA',
  askingPrice: '329900',
  arv: '550000',
  beds: '4',
  baths: '2.5',
  sqft: '3000',
  phone: '470-664-5752',
  marketing: {
    textBlastPhotoLink: 'https://drive.google.com/drive/folders/example',
    facebookVariantOffset: 2
  }
};

test('a saved deal can always rebuild its text and Facebook packages', () => {
  const output = buildMarketingPackage({ data: deal, slug: '101-test-lane-abcd' });

  assert.equal(output.dealUrl, 'https://deals.offmarketdaily.com/d/101-test-lane-abcd');
  assert.match(output.textBlast, /https:\/\/drive\.google\.com\/drive\/folders\/example/);
  assert.doesNotMatch(output.textBlast, /deals\.offmarketdaily\.com/);
  assert.match(output.facebookPost, /470-664-5752/);
  assert.match(output.facebookPost, /send me a message/i);
  assert.doesNotMatch(output.facebookPost, /https?:\/\//);
  assert.match(output.messengerReply, /https:\/\/deals\.offmarketdaily\.com\/d\/101-test-lane-abcd/);
});

test('older deals without saved marketing settings remain usable', () => {
  assert.deepEqual(getMarketingSettings({}), {
    textBlastPhotoLink: '',
    facebookVariantOffset: 0
  });
});

test('saved marketing copy replaces an unapproved legacy phone from the state map', () => {
  const output = buildMarketingPackage({
    data: { ...deal, phone: '999-999-9999' },
    slug: '101-test-lane-abcd'
  });

  assert.match(output.facebookPost, /470-664-5752/);
  assert.doesNotMatch(output.facebookPost, /999-999-9999/);
  assert.match(output.messengerReply, /https:\/\/deals\.offmarketdaily\.com\/d\/101-test-lane-abcd/);
});
