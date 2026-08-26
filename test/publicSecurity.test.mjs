import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildPublicLeadRecord, normalizeDealSlug, sanitizePublicDealData } from '../lib/publicDeal.mjs';
import { createRateLimiter } from '../lib/publicRateLimit.mjs';
import { isJpegBytes } from '../lib/imageValidation.mjs';

test('public deal payload includes buyer fields but excludes internal audit data', () => {
  const result = sanitizePublicDealData({
    address: '123 Main St',
    city: 'Phoenix',
    phone: '480-555-0100',
    photos: [{ url: 'https://example.com/front.jpg', label: 'Front' }],
    audit: { createdBy: 'Staff Member', createdById: 'private-user-id' },
    internalNotes: 'Never expose this',
    omdStatus: 'published'
  });

  assert.equal(result.address, '123 Main St');
  assert.equal(result.phone, '480-555-0100');
  assert.deepEqual(result.photos, [{ url: 'https://example.com/front.jpg', label: 'Front' }]);
  assert.equal(result.audit, undefined);
  assert.equal(result.internalNotes, undefined);
});

test('tracking-only and archived deals never receive a public payload', () => {
  assert.equal(sanitizePublicDealData({ omdStatus: 'tracking-only' }), null);
  assert.equal(sanitizePublicDealData({ audit: { archived: true } }), null);
});

test('public slugs and lead submissions are normalized and validated', () => {
  assert.equal(normalizeDealSlug(' 2202-van-wert-st-hc0j '), '2202-van-wert-st-hc0j');
  assert.equal(normalizeDealSlug('../admin'), '');

  assert.deepEqual(buildPublicLeadRecord({
    dealSlug: '2202-van-wert-st-hc0j',
    visitorId: ' visitor-1 ',
    name: ' Buyer Name ',
    email: 'BUYER@EXAMPLE.COM',
    phone: ' 480-555-0100 '
  }), {
    deal_slug: '2202-van-wert-st-hc0j',
    visitor_id: 'visitor-1',
    name: 'Buyer Name',
    email: 'buyer@example.com',
    phone: '480-555-0100'
  });
  assert.equal(buildPublicLeadRecord({ dealSlug: 'valid-slug', email: 'not-an-email' }), null);
});

test('public endpoint rate limiter blocks requests beyond the configured window', () => {
  const allow = createRateLimiter();
  assert.equal(allow({ key: 'lead:one', limit: 2, windowMs: 1000, now: 0 }), true);
  assert.equal(allow({ key: 'lead:one', limit: 2, windowMs: 1000, now: 1 }), true);
  assert.equal(allow({ key: 'lead:one', limit: 2, windowMs: 1000, now: 2 }), false);
  assert.equal(allow({ key: 'lead:one', limit: 2, windowMs: 1000, now: 1000 }), true);
});

test('photo validation rejects renamed non-JPEG data', () => {
  assert.equal(isJpegBytes(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), true);
  assert.equal(isJpegBytes(new TextEncoder().encode('<script>alert(1)</script>')), false);
});

test('buyer page uses same-origin server endpoints instead of direct database access', async () => {
  const [pageSource, layoutSource] = await Promise.all([
    readFile(new URL('../app/d/[slug]/page.js', import.meta.url), 'utf8'),
    readFile(new URL('../app/d/[slug]/layout.js', import.meta.url), 'utf8')
  ]);

  assert.match(pageSource, /\/api\/public\/deals\//);
  assert.match(pageSource, /\/api\/public\/leads/);
  assert.doesNotMatch(pageSource, /supabase\.co\/rest\/v1/);
  assert.doesNotMatch(layoutSource, /supabase\.co\/rest\/v1/);
});
