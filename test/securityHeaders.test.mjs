import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

import { escapeHtml, safeHtmlTemplate } from '../lib/htmlSecurity.mjs';
import { isSameOriginRequest } from '../lib/requestSecurity.mjs';

const require = createRequire(import.meta.url);
const nextConfig = require('../next.config.js');

test('HTML email previews escape staff-entered values', () => {
  const attack = '<img src=x onerror="alert(1)">';
  assert.equal(escapeHtml(attack), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(safeHtmlTemplate`<p>${attack}</p>`, '<p>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</p>');
});

test('every route receives the required browser security headers', async () => {
  const rules = await nextConfig.headers();
  const headers = Object.fromEntries(rules[0].headers.map(({ key, value }) => [key, value]));

  assert.equal(nextConfig.poweredByHeader, false);
  assert.equal(rules[0].source, '/(.*)');
  assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.match(headers['Content-Security-Policy'], /object-src 'none'/);
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
});

const fakeRequest = ({ origin, fetchSite } = {}) => ({
  url: 'https://deals.offmarketdaily.com/api/admin/deals',
  headers: { get: (name) => name === 'origin' ? origin || null : name === 'sec-fetch-site' ? fetchSite || null : null }
});

test('browser writes accept same-origin requests and reject cross-site requests', () => {
  assert.equal(isSameOriginRequest(fakeRequest({ origin: 'https://deals.offmarketdaily.com', fetchSite: 'same-origin' })), true);
  assert.equal(isSameOriginRequest(fakeRequest({ origin: 'https://evil.example' })), false);
  assert.equal(isSameOriginRequest(fakeRequest({ fetchSite: 'cross-site' })), false);
  assert.equal(isSameOriginRequest(fakeRequest()), true);
});
