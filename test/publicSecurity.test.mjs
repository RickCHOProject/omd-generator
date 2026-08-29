commit 45707606608fad97b0e669a036b0ad6790b86d79
Author: Rick Vasquez <rickvasquez@Mac-mini.local>
Date:   Fri Aug 28 18:46:25 2026 -0500

    Automate deal contact routing and retain marketing packages

diff --git a/test/publicSecurity.test.mjs b/test/publicSecurity.test.mjs
index 62dd95b..d4c1f1e 100644
--- a/test/publicSecurity.test.mjs
+++ b/test/publicSecurity.test.mjs
@@ -69,6 +69,8 @@ test('buyer page uses same-origin server endpoints instead of direct database ac
 
   assert.match(pageSource, /\/api\/public\/deals\//);
   assert.match(pageSource, /\/api\/public\/leads/);
+  assert.match(pageSource, /getApprovedPhoneForState\(deal\.state, deal\.phone\)/);
+  assert.doesNotMatch(pageSource, /480-266-3864/);
   assert.doesNotMatch(pageSource, /supabase\.co\/rest\/v1/);
   assert.doesNotMatch(layoutSource, /supabase\.co\/rest\/v1/);
 });
