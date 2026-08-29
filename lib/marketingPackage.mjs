commit 45707606608fad97b0e669a036b0ad6790b86d79
Author: Rick Vasquez <rickvasquez@Mac-mini.local>
Date:   Fri Aug 28 18:46:25 2026 -0500

    Automate deal contact routing and retain marketing packages

diff --git a/lib/marketingPackage.mjs b/lib/marketingPackage.mjs
new file mode 100644
index 0000000..e757d75
--- /dev/null
+++ b/lib/marketingPackage.mjs
@@ -0,0 +1,38 @@
+import { buildFacebookPost, getFacebookVariantIndex } from './facebookPost.mjs';
+import { getPublicDealUrl } from './dealLinks.mjs';
+import { buildTextBlast } from './textBlast.mjs';
+import { getApprovedPhoneForState } from './contactPhone.mjs';
+
+export const getMarketingSettings = (data) => ({
+  textBlastPhotoLink: String(data?.marketing?.textBlastPhotoLink || '').trim(),
+  facebookVariantOffset: Number.isInteger(Number(data?.marketing?.facebookVariantOffset))
+    ? Number(data.marketing.facebookVariantOffset)
+    : 0
+});
+
+export const buildMarketingPackage = ({ data, slug, settings = getMarketingSettings(data) }) => {
+  const dealUrl = getPublicDealUrl(slug);
+  const approvedData = {
+    ...data,
+    phone: getApprovedPhoneForState(data?.state, data?.phone)
+  };
+  const normalizedSettings = {
+    textBlastPhotoLink: String(settings?.textBlastPhotoLink || '').trim(),
+    facebookVariantOffset: Number.isInteger(Number(settings?.facebookVariantOffset))
+      ? Number(settings.facebookVariantOffset)
+      : 0
+  };
+
+  return {
+    dealUrl,
+    settings: normalizedSettings,
+    textBlast: buildTextBlast(approvedData, {
+      dealUrl,
+      photoLink: normalizedSettings.textBlastPhotoLink
+    }),
+    facebookPost: buildFacebookPost(approvedData, {
+      dealUrl,
+      variantIndex: getFacebookVariantIndex(data) + normalizedSettings.facebookVariantOffset
+    })
+  };
+};
