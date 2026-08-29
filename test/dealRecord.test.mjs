commit 45707606608fad97b0e669a036b0ad6790b86d79
Author: Rick Vasquez <rickvasquez@Mac-mini.local>
Date:   Fri Aug 28 18:46:25 2026 -0500

    Automate deal contact routing and retain marketing packages

diff --git a/test/dealRecord.test.mjs b/test/dealRecord.test.mjs
index 435a05c..d6a0d69 100644
--- a/test/dealRecord.test.mjs
+++ b/test/dealRecord.test.mjs
@@ -15,6 +15,10 @@ test('published records keep the full package and receive a public status', () =
   const record = buildPublishedDealRecord({
     formData: { address: '2202 Van Wert St', askingPrice: '134000' },
     photos: [{ url: 'https://example.com/photo.jpg', label: 'Exterior' }],
+    marketing: {
+      textBlastPhotoLink: ' https://drive.google.com/example ',
+      facebookVariantOffset: 2
+    },
     suffix: 'abcd'
   });
 
@@ -22,6 +26,10 @@ test('published records keep the full package and receive a public status', () =
   assert.equal(record.data.omdStatus, DEAL_STATUS.PUBLISHED);
   assert.equal(record.data.askingPrice, '134000');
   assert.equal(record.data.photos.length, 1);
+  assert.deepEqual(record.data.marketing, {
+    textBlastPhotoLink: 'https://drive.google.com/example',
+    facebookVariantOffset: 2
+  });
   assert.equal(isPublicDeal(record.data), true);
 });
 
