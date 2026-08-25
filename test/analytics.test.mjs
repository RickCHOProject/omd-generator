import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAnalyticsPayload,
  collectPaginatedRows,
  encodeEventReferrer,
  getRowEventType,
  summarizeAnalyticsRows
} from '../lib/analytics.mjs';

test('analytics pagination reads beyond the first 1,000 rows', async () => {
  const source = Array.from({ length: 2590 }, (_, index) => ({ id: index + 1 }));
  const calls = [];
  const rows = await collectPaginatedRows(async ({ offset, limit }) => {
    calls.push(offset);
    return source.slice(offset, offset + limit);
  });

  assert.equal(rows.length, 2590);
  assert.deepEqual(calls, [0, 1000, 2000]);
});

test('page views and buyer clicks are counted separately', () => {
  const rows = [
    { deal_slug: 'deal-a', visitor_id: 'v1', referrer: null },
    { deal_slug: 'deal-a', visitor_id: 'v1', referrer: 'https://facebook.com' },
    { deal_slug: 'deal-a', visitor_id: 'v2', referrer: null },
    { deal_slug: 'deal-a', visitor_id: 'v1', referrer: encodeEventReferrer('call') },
    { deal_slug: 'deal-a', visitor_id: 'v1', referrer: encodeEventReferrer('text') },
    { deal_slug: 'deal-a', visitor_id: 'v2', referrer: encodeEventReferrer('interested') },
    { deal_slug: 'deal-b', visitor_id: 'v3', referrer: null }
  ];

  const summary = summarizeAnalyticsRows(rows);
  assert.equal(summary.totals.views, 4);
  assert.equal(summary.totals.totalClicks, 3);
  assert.deepEqual(summary.byDeal['deal-a'], {
    views: 3,
    uniqueVisitors: 2,
    repeatVisitors: 1,
    viewsPerVisitor: 1.5,
    callClicks: 1,
    textClicks: 1,
    interestedClicks: 1,
    totalClicks: 3
  });
});

test('detail payload returns every view and labeled engagement event', () => {
  const rows = [
    { deal_slug: 'deal-a', visitor_id: 'v1', referrer: null },
    { deal_slug: 'deal-a', visitor_id: 'v1', referrer: encodeEventReferrer('text') }
  ];
  const payload = buildAnalyticsPayload(rows, 'deal-a');

  assert.equal(payload.pageViews.length, 1);
  assert.equal(payload.events.length, 1);
  assert.equal(payload.events[0].eventType, 'text');
  assert.equal(getRowEventType(payload.pageViews[0]), 'view');
});

test('unknown marker values remain page views for backward compatibility', () => {
  assert.equal(getRowEventType({ referrer: 'omd:event:unknown' }), 'view');
  assert.equal(getRowEventType({ referrer: 'https://google.com' }), 'view');
});
