import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTextBlast } from '../lib/textBlast.mjs';

const deal = {
  address: '1160 Example Drive',
  city: 'Chandler',
  state: 'AZ',
  zip: '85224',
  askingPrice: '250000',
  arv: '340000',
  beds: '3',
  baths: '2.5',
  sqft: '1543',
  yearBuilt: '1998',
  occupancy: 'Owner occupied',
  access: 'By appointment',
  coe: '09/30/2026',
  emd: '7000',
  conditionNotes: 'These notes must not appear in the text blast.'
};

test('text blast contains deal facts and the Google Drive photo link', () => {
  const output = buildTextBlast(deal, {
    dealUrl: 'https://deals.offmarketdaily.com/d/example',
    photoLink: 'https://drive.google.com/drive/folders/example'
  });

  assert.match(output, /1160 Example Drive/);
  assert.match(output, /\$250,000/);
  assert.match(output, /1,543/);
  assert.match(output, /Deal Link: https:\/\/deals\.offmarketdaily\.com\/d\/example/);
  assert.match(output, /Google Drive Photos: https:\/\/drive\.google\.com\/drive\/folders\/example/);
});

test('text blast excludes spread, notes, and reply language', () => {
  const output = buildTextBlast(deal, { photoLink: 'https://drive.google.com/example' });

  assert.doesNotMatch(output, /spread/i);
  assert.doesNotMatch(output, /notes/i);
  assert.doesNotMatch(output, /reply if interested/i);
  assert.doesNotMatch(output, /These notes must not appear/);
});

test('text blast shows a photo-link placeholder until staff paste one', () => {
  const output = buildTextBlast(deal);
  assert.match(output, /Google Drive Photos: \[Paste Google Drive photo link\]/);
});
