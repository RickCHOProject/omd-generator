commit 45707606608fad97b0e669a036b0ad6790b86d79
Author: Rick Vasquez <rickvasquez@Mac-mini.local>
Date:   Fri Aug 28 18:46:25 2026 -0500

    Automate deal contact routing and retain marketing packages

diff --git a/test/photoOrder.test.mjs b/test/photoOrder.test.mjs
new file mode 100644
index 0000000..9e2242c
--- /dev/null
+++ b/test/photoOrder.test.mjs
@@ -0,0 +1,16 @@
+import test from 'node:test';
+import assert from 'node:assert/strict';
+
+import { reorderItems } from '../lib/photoOrder.mjs';
+
+test('photos can be moved directly to a new position', () => {
+  assert.deepEqual(reorderItems(['front', 'kitchen', 'damage'], 2, 0), ['damage', 'front', 'kitchen']);
+  assert.deepEqual(reorderItems(['front', 'kitchen', 'damage'], 0, 2), ['kitchen', 'damage', 'front']);
+});
+
+test('invalid photo moves leave the original order intact', () => {
+  const original = ['front', 'kitchen'];
+  assert.deepEqual(reorderItems(original, -1, 1), original);
+  assert.deepEqual(reorderItems(original, 0, 4), original);
+  assert.deepEqual(original, ['front', 'kitchen']);
+});
