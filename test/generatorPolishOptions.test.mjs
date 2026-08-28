import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('the generator lets staff choose among three buyer-friendly condition-note versions', async () => {
  const source = await readFile(new URL('../app/page.js', import.meta.url), 'utf8');

  assert.match(source, /Create Buyer-Friendly Options/);
  assert.match(source, /Use This Version/);
  assert.match(source, /buildConditionNoteOptions/);
  assert.match(source, /polishOptions\.map/);
  assert.match(source, /three relaxed versions/);
});
