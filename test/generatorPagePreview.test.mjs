import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('the internal OMD Page preview mirrors the locked buyer-page gallery and contact actions', async () => {
  const source = await readFile(new URL('../app/page.js', import.meta.url), 'utf8');
  const preview = source
    .split('// OMD PAGE PREVIEW')[1]
    .split("if (previewMode === 'facebook')")[0];

  assert.match(preview, /className="deal-hero-grid"/);
  assert.match(preview, /className="deal-hero-main"/);
  assert.match(preview, /className="deal-hero-side"/);
  assert.match(preview, /className="deal-hero-image"/);
  assert.match(preview, /className="deal-details"/);
  assert.match(preview, /className="deal-stats-grid"/);
  assert.match(preview, /photos\.slice\(0, previewMaxThumbnails\)/);
  assert.match(preview, /\+\{previewRemainingPhotos\} more/);
  assert.match(preview, /data-omd-preview-contact-actions="approved"/);
  assert.match(preview, /📱 Text Now/);
  assert.match(preview, /📞 Call/);
  assert.doesNotMatch(preview, /I'm Interested - Text Now/);
  assert.doesNotMatch(preview, /height:\s*400/);
});
