commit 45707606608fad97b0e669a036b0ad6790b86d79
Author: Rick Vasquez <rickvasquez@Mac-mini.local>
Date:   Fri Aug 28 18:46:25 2026 -0500

    Automate deal contact routing and retain marketing packages

diff --git a/test/operationalUi.test.mjs b/test/operationalUi.test.mjs
new file mode 100644
index 0000000..4c1c3b5
--- /dev/null
+++ b/test/operationalUi.test.mjs
@@ -0,0 +1,26 @@
+import assert from 'node:assert/strict';
+import { readFile } from 'node:fs/promises';
+import test from 'node:test';
+
+const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8');
+
+test('the generator uses automatic contact numbers and clear photo controls', async () => {
+  const source = await readSource('../app/page.js');
+
+  assert.match(source, /Contact Phone \(automatic\)/);
+  assert.match(source, /getPhoneChoicesForState\(formData\.state\)/);
+  assert.match(source, /draggable/);
+  assert.match(source, /Cover photo/);
+  assert.match(source, /Delete photo/);
+});
+
+test('Admin keeps marketing copy available after publishing', async () => {
+  const source = await readSource('../app/admin/page.js');
+
+  assert.match(source, /Marketing Package/);
+  assert.match(source, /Copy Text Blast/);
+  assert.match(source, /Copy Facebook Post/);
+  assert.match(source, /openMarketingPackage\(deal\)/);
+  assert.match(source, /getPhoneChoicesForState\(editData\.state\)/);
+  assert.match(source, /draggable/);
+});
