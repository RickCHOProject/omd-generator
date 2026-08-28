import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('the package generator provides a direct return to Admin', async () => {
  const source = await readFile(new URL('../app/page.js', import.meta.url), 'utf8');

  assert.match(source, /href="\/admin"/);
  assert.match(source, /← Back to Admin/);
});
