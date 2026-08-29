commit 45707606608fad97b0e669a036b0ad6790b86d79
Author: Rick Vasquez <rickvasquez@Mac-mini.local>
Date:   Fri Aug 28 18:46:25 2026 -0500

    Automate deal contact routing and retain marketing packages

diff --git a/lib/photoOrder.mjs b/lib/photoOrder.mjs
new file mode 100644
index 0000000..f9e5676
--- /dev/null
+++ b/lib/photoOrder.mjs
@@ -0,0 +1,16 @@
+export const reorderItems = (items, fromIndex, toIndex) => {
+  const copy = Array.isArray(items) ? [...items] : [];
+  if (
+    !Number.isInteger(fromIndex)
+    || !Number.isInteger(toIndex)
+    || fromIndex < 0
+    || toIndex < 0
+    || fromIndex >= copy.length
+    || toIndex >= copy.length
+    || fromIndex === toIndex
+  ) return copy;
+
+  const [moved] = copy.splice(fromIndex, 1);
+  copy.splice(toIndex, 0, moved);
+  return copy;
+};
