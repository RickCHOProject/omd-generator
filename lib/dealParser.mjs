commit 45707606608fad97b0e669a036b0ad6790b86d79
Author: Rick Vasquez <rickvasquez@Mac-mini.local>
Date:   Fri Aug 28 18:46:25 2026 -0500

    Automate deal contact routing and retain marketing packages

diff --git a/lib/dealParser.mjs b/lib/dealParser.mjs
index 7e94dd1..f8c5452 100644
--- a/lib/dealParser.mjs
+++ b/lib/dealParser.mjs
@@ -1,4 +1,4 @@
-const DEFAULT_PHONE = '480-266-3864';
+import { getPrimaryPhoneForState } from './contactPhone.mjs';
 
 export const EMPTY_DEAL = {
   address: '',
@@ -17,7 +17,7 @@ export const EMPTY_DEAL = {
   emd: '',
   hoa: '',
   conditionNotes: '',
-  phone: DEFAULT_PHONE
+  phone: ''
 };
 
 const REQUIRED_FIELDS = [
@@ -252,19 +252,19 @@ export const parseDealInput = (rawInput) => {
   if (emd) data.emd = toNumber(emd);
 
   const hoa = findField(fields, ['hoa', 'hoa cost', 'hoa cost and what it covers']);
-  if (hoa && !/(?:not discussed|not confirmed|unknown|n\/a)/i.test(hoa)) {
-    match = hoa.match(/\$?([\d,]+(?:\.\d+)?(?:\/mo)?)/i);
-    if (match) data.hoa = match[1];
+  if (hoa) {
+    const normalizedHoa = hoa.trim();
+    if (/^(?:yes|y)$/i.test(normalizedHoa)) data.hoa = 'Yes';
+    else if (/^(?:no|none)$/i.test(normalizedHoa)) data.hoa = 'No';
+    else if (/^(?:n\/?a|not applicable)$/i.test(normalizedHoa)) data.hoa = 'N/A';
+    else if (!/(?:not discussed|not confirmed|unknown|tbd)/i.test(normalizedHoa)) {
+      data.hoa = normalizedHoa;
+    }
   }
 
-  const phone = findField(fields, ['phone', 'contact phone', 'call', 'text', 'dispositions phone'])
-    || text.match(/(?:phone|call|text)\s*:?\s*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i)?.[1]
-    || '';
-  match = phone.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
-  if (match) {
-    const digits = match[0].replace(/\D/g, '');
-    data.phone = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
-  }
+  // Staff never need to type a dispositions number. The verified market map is
+  // authoritative; unlisted states remain blank so the UI requires a selection.
+  data.phone = getPrimaryPhoneForState(data.state);
 
   data.conditionNotes = buildConditionNotes(lines, fields);
   return data;
