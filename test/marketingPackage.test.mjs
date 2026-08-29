commit 45707606608fad97b0e669a036b0ad6790b86d79
Author: Rick Vasquez <rickvasquez@Mac-mini.local>
Date:   Fri Aug 28 18:46:25 2026 -0500

    Automate deal contact routing and retain marketing packages

diff --git a/test/marketingPackage.test.mjs b/test/marketingPackage.test.mjs
new file mode 100644
index 0000000..67176fd
--- /dev/null
+++ b/test/marketingPackage.test.mjs
@@ -0,0 +1,47 @@
+import test from 'node:test';
+import assert from 'node:assert/strict';
+
+import { buildMarketingPackage, getMarketingSettings } from '../lib/marketingPackage.mjs';
+
+const deal = {
+  address: '101 Test Lane',
+  city: 'Acworth',
+  state: 'GA',
+  askingPrice: '329900',
+  arv: '550000',
+  beds: '4',
+  baths: '2.5',
+  sqft: '3000',
+  phone: '470-664-5752',
+  marketing: {
+    textBlastPhotoLink: 'https://drive.google.com/drive/folders/example',
+    facebookVariantOffset: 2
+  }
+};
+
+test('a saved deal can always rebuild its text and Facebook packages', () => {
+  const output = buildMarketingPackage({ data: deal, slug: '101-test-lane-abcd' });
+
+  assert.equal(output.dealUrl, 'https://deals.offmarketdaily.com/d/101-test-lane-abcd');
+  assert.match(output.textBlast, /https:\/\/drive\.google\.com\/drive\/folders\/example/);
+  assert.match(output.textBlast, /https:\/\/deals\.offmarketdaily\.com\/d\/101-test-lane-abcd/);
+  assert.match(output.facebookPost, /470-664-5752/);
+  assert.match(output.facebookPost, /https:\/\/deals\.offmarketdaily\.com\/d\/101-test-lane-abcd/);
+});
+
+test('older deals without saved marketing settings remain usable', () => {
+  assert.deepEqual(getMarketingSettings({}), {
+    textBlastPhotoLink: '',
+    facebookVariantOffset: 0
+  });
+});
+
+test('saved marketing copy replaces an unapproved legacy phone from the state map', () => {
+  const output = buildMarketingPackage({
+    data: { ...deal, phone: '999-999-9999' },
+    slug: '101-test-lane-abcd'
+  });
+
+  assert.match(output.facebookPost, /470-664-5752/);
+  assert.doesNotMatch(output.facebookPost, /999-999-9999/);
+});
