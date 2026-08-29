commit 45707606608fad97b0e669a036b0ad6790b86d79
Author: Rick Vasquez <rickvasquez@Mac-mini.local>
Date:   Fri Aug 28 18:46:25 2026 -0500

    Automate deal contact routing and retain marketing packages

diff --git a/app/d/[slug]/page.js b/app/d/[slug]/page.js
index 922d932..2fa9fcb 100644
--- a/app/d/[slug]/page.js
+++ b/app/d/[slug]/page.js
@@ -2,6 +2,7 @@
 import { useEffect, useState, useRef } from 'react';
 import { useParams } from 'next/navigation';
 import { removeUnexpectedContactActions } from '../../../lib/contactActions.mjs';
+import { getApprovedPhoneForState } from '../../../lib/contactPhone.mjs';
 const HouseIcon = () => (
   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
     <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
@@ -324,6 +325,7 @@ export default function DealPage() {
   }
   const photos = deal.photos || [];
   const heroPhoto = photos[selectedPhotoIndex] || photos[0];
+  const contactPhone = getApprovedPhoneForState(deal.state, deal.phone) || '480-685-8477';
   const maxThumbnails = 5;
   const remainingPhotos = photos.length - maxThumbnails;
   const sidePhotoIndexes = [1, 2]
@@ -635,8 +637,8 @@ export default function DealPage() {
                 flexWrap: 'wrap'
               }}>
                 <a
-                  href={`sms:${deal.phone || '480-266-3864'}`}
-                  onClick={(event) => handleContactClick(event, 'text', `sms:${deal.phone || '480-266-3864'}`)}
+                  href={`sms:${contactPhone}`}
+                  onClick={(event) => handleContactClick(event, 'text', `sms:${contactPhone}`)}
                   style={{
                     display: 'inline-block',
                     background: 'linear-gradient(135deg, #00b894, #00cec9)',
@@ -651,8 +653,8 @@ export default function DealPage() {
                   📱 Text Now
                 </a>
                 <a
-                  href={`tel:${deal.phone || '480-266-3864'}`}
-                  onClick={(event) => handleContactClick(event, 'call', `tel:${deal.phone || '480-266-3864'}`)}
+                  href={`tel:${contactPhone}`}
+                  onClick={(event) => handleContactClick(event, 'call', `tel:${contactPhone}`)}
                   style={{
                     display: 'inline-block',
                     background: 'rgba(255,255,255,0.15)',
