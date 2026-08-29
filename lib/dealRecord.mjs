commit 45707606608fad97b0e669a036b0ad6790b86d79
Author: Rick Vasquez <rickvasquez@Mac-mini.local>
Date:   Fri Aug 28 18:46:25 2026 -0500

    Automate deal contact routing and retain marketing packages

diff --git a/lib/dealRecord.mjs b/lib/dealRecord.mjs
index ab90d52..dff9d85 100644
--- a/lib/dealRecord.mjs
+++ b/lib/dealRecord.mjs
@@ -14,11 +14,17 @@ export const createDealSlug = (address, suffix = Math.random().toString(36).subs
   return `${normalizedAddress || 'deal'}-${suffix}`;
 };
 
-export const buildPublishedDealRecord = ({ formData, photos, suffix }) => ({
+export const buildPublishedDealRecord = ({ formData, photos, suffix, marketing }) => ({
   slug: createDealSlug(formData?.address, suffix),
   data: {
     ...formData,
     photos: photos || [],
+    marketing: {
+      textBlastPhotoLink: String(marketing?.textBlastPhotoLink || '').trim(),
+      facebookVariantOffset: Number.isInteger(Number(marketing?.facebookVariantOffset))
+        ? Number(marketing.facebookVariantOffset)
+        : 0
+    },
     omdStatus: DEAL_STATUS.PUBLISHED
   }
 });
