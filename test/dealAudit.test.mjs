import test from 'node:test';
import assert from 'node:assert/strict';
import { auditNewDealData, auditUpdatedDealData } from '../lib/dealAudit.mjs';

test('new deals record who created the profile', () => {
  const data = auditNewDealData(
    { address: '123 Main St' },
    { sub: 'mark', name: 'Mark' },
    '2026-08-25T12:00:00.000Z'
  );

  assert.equal(data.audit.createdBy, 'Mark');
  assert.equal(data.audit.lastUpdatedBy, 'Mark');
});

test('deal updates preserve the creator and record the editor', () => {
  const existing = auditNewDealData(
    { address: '123 Main St' },
    { sub: 'mark', name: 'Mark' },
    '2026-08-25T12:00:00.000Z'
  );
  const updated = auditUpdatedDealData(
    { ...existing, askingPrice: '100000' },
    existing,
    { sub: 'mariel', name: 'Mariel' },
    '2026-08-25T13:00:00.000Z'
  );

  assert.equal(updated.audit.createdBy, 'Mark');
  assert.equal(updated.audit.lastUpdatedBy, 'Mariel');
});
