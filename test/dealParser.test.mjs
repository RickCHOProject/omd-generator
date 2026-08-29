commit 45707606608fad97b0e669a036b0ad6790b86d79
Author: Rick Vasquez <rickvasquez@Mac-mini.local>
Date:   Fri Aug 28 18:46:25 2026 -0500

    Automate deal contact routing and retain marketing packages

diff --git a/test/dealParser.test.mjs b/test/dealParser.test.mjs
index 631154b..0c4e21d 100644
--- a/test/dealParser.test.mjs
+++ b/test/dealParser.test.mjs
@@ -153,6 +153,18 @@ Year Built: 1989`);
   assert.notEqual(deal.beds, deal.arv);
 });
 
+test('HOA yes, no, N/A, and fee details are preserved', () => {
+  assert.equal(parseDealInput('Address: 1 Main St, Atlanta, GA 30303\nHOA: Yes').hoa, 'Yes');
+  assert.equal(parseDealInput('Address: 1 Main St, Atlanta, GA 30303\nHOA: No').hoa, 'No');
+  assert.equal(parseDealInput('Address: 1 Main St, Atlanta, GA 30303\nHOA: N/A').hoa, 'N/A');
+  assert.equal(parseDealInput('Address: 1 Main St, Atlanta, GA 30303\nHOA: $175/month, includes landscaping').hoa, '$175/month, includes landscaping');
+});
+
+test('a typed phone number can never override the approved state number', () => {
+  const deal = parseDealInput('Address: 1 Main St, Atlanta, GA 30303\nPhone: 999-999-9999');
+  assert.equal(deal.phone, '470-664-5752');
+});
+
 test('parsing a new deal resets absent values instead of keeping stale facts', () => {
   const first = parseDealInput('Address: 1 Main St, Raleigh, NC 27601\nAsking: $100,000');
   const second = parseDealInput('Address: 2 Oak Ave');
