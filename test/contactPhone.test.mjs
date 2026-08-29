commit 45707606608fad97b0e669a036b0ad6790b86d79
Author: Rick Vasquez <rickvasquez@Mac-mini.local>
Date:   Fri Aug 28 18:46:25 2026 -0500

    Automate deal contact routing and retain marketing packages

diff --git a/test/contactPhone.test.mjs b/test/contactPhone.test.mjs
new file mode 100644
index 0000000..b9c7628
--- /dev/null
+++ b/test/contactPhone.test.mjs
@@ -0,0 +1,30 @@
+import test from 'node:test';
+import assert from 'node:assert/strict';
+
+import { applyStatePhone, getApprovedPhoneForState, getPhoneChoicesForState, getPrimaryPhoneForState } from '../lib/contactPhone.mjs';
+
+test('each active market receives its approved phone number automatically', () => {
+  assert.equal(getPrimaryPhoneForState('FL'), '904-664-8890');
+  assert.equal(getPrimaryPhoneForState('Arizona'), '480-685-8477');
+  assert.equal(getPrimaryPhoneForState('GA'), '470-664-5752');
+  assert.equal(getPrimaryPhoneForState('TX'), '214-612-5707');
+  assert.equal(getPrimaryPhoneForState('North Carolina'), '980-351-1529');
+  assert.equal(getPrimaryPhoneForState('CO'), '719-563-8369');
+});
+
+test('Arizona defaults to 480 and exposes 928 only as its backup', () => {
+  assert.deepEqual(
+    getPhoneChoicesForState('AZ').map((entry) => entry.phone),
+    ['480-685-8477', '928-938-3822']
+  );
+  assert.equal(applyStatePhone({ state: 'AZ', phone: '999-999-9999' }).phone, '480-685-8477');
+});
+
+test('an unlisted state never receives a guessed phone number', () => {
+  assert.equal(getPrimaryPhoneForState('CA'), '');
+});
+
+test('an old wrong number is corrected while the Arizona backup remains allowed', () => {
+  assert.equal(getApprovedPhoneForState('GA', '999-999-9999'), '470-664-5752');
+  assert.equal(getApprovedPhoneForState('AZ', '928-938-3822'), '928-938-3822');
+});
