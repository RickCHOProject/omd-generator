import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('the generator uses automatic contact numbers and clear photo controls', async () => {
  const source = await readSource('../app/page.js');

  assert.match(source, /Contact Phone \(automatic\)/);
  assert.match(source, /getPhoneChoicesForState\(formData\.state\)/);
  assert.match(source, /draggable/);
  assert.match(source, /Cover photo/);
  assert.match(source, /Delete photo/);
});

test('Admin keeps marketing copy available after publishing', async () => {
  const source = await readSource('../app/admin/page.js');

  assert.match(source, /Marketing Package/);
  assert.match(source, /Copy Text Blast/);
  assert.match(source, /Copy Facebook Post/);
  assert.match(source, /Copy Messenger Reply/);
  assert.match(source, /packageOutput\.messengerReply/);
  assert.match(source, /openMarketingPackage\(deal\)/);
  assert.match(source, /getPhoneChoicesForState\(editData\.state\)/);
  assert.match(source, /draggable/);
});
