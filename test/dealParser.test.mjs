import test from 'node:test';
import assert from 'node:assert/strict';

import { extractTextBlastPhotoLink, getMissingDealFields, parseDealInput, polishConditionNotes } from '../lib/dealParser.mjs';

const acquisitionsPackage = `MANDATORY Property Package:

- Address: 1160 Bull Moose Drive
- Lead Source: Agent / realtor contact
- Seller Contact: Casey Walag
- Seller Contact Email: caseyw@serhant.com, based on call confirmation
- Company Number Used: Not confirmed
- Commission agreed to: Casey stated commission is 3%
- Bed/Bath count: 3 bedrooms / 2.5 bathrooms
- Possible Layout Note: Three bedrooms upstairs, two full bathrooms upstairs, one half bathroom downstairs
- Sqft: 1543
- Lot Size: 4,278 sq ft
- Property Type: Single-family home
- Occupancy: Owner occupied
- Decision Makers: Seller only; husband passed away
- HVAC age/condition: Seller believes AC is less than 10 years old; receipt requested
- Roof age/condition: Seller believes roof is about 10 years old
- Water Heater: Not sure
- Overall property condition: Well cared for and well lived in; not fully updated to current standards, but some updates have been done
- Rehab level: Light-to-moderate cosmetic updates
- Obvious structural issues or hazards: No major issues mentioned
- Environmental red flags checked: Not confirmed
- HOA cost and what it covers: Not discussed
- Age restricted / 55+: Current property not confirmed as age restricted; seller is moving to an active 55+ community

CONDITION SUMMARY:

- Property is not updated to today’s standards
- Seller has completed some updates inside the home
- Home is described as well cared for and well lived in
- No major issues with the home were mentioned
- Roof is believed to be about 10 years old
- AC is believed to be less than 10 years old
- Casey asked seller to locate receipt for AC
- Seller recently installed new turf in the backyard
- Property is a two-story home
- Layout: 3 bedrooms upstairs, 2 full bathrooms upstairs, 1 half bathroom downstairs
- Seller is older and can no longer comfortably handle stairs
- Seller wants a smoother move and may leave items behind
- Buyer confirmed they are okay with seller leaving items behind and can help make the move easier`;

test('messy acquisitions packages extract only buyer-facing deal fields', () => {
  const deal = parseDealInput(acquisitionsPackage);

  assert.equal(deal.address, '1160 Bull Moose Drive');
  assert.equal(deal.beds, '3');
  assert.equal(deal.baths, '2.5');
  assert.equal(deal.sqft, '1543');
  assert.equal(deal.occupancy, 'Owner occupied');
  assert.equal(deal.hoa, '');
  assert.doesNotMatch(deal.conditionNotes, /Casey|husband|older|moving|receipt|commission|contact email/i);
  assert.match(deal.conditionNotes, /Roof is believed to be about 10 years old/);
  assert.match(deal.conditionNotes, /new turf in the backyard/);
  assert.match(deal.conditionNotes, /3 bedrooms upstairs/);
});

test('lot size can never replace living-area square footage', () => {
  const deal = parseDealInput(acquisitionsPackage);
  assert.equal(deal.sqft, '1543');
  assert.notEqual(deal.sqft, '4278');
});

test('address can follow the mandatory package heading on the same line', () => {
  const deal = parseDealInput(`MANDATORY Property Package: 1160 N Bullmoose Dr, Chandler, AZ 85224
- Bed/Bath count: 3 bedrooms / 2.5 bathrooms
- Sqft: 1543
- Lot Size: 4,278 sq ft`);

  assert.equal(deal.address, '1160 N Bullmoose Dr');
  assert.equal(deal.city, 'Chandler');
  assert.equal(deal.state, 'AZ');
  assert.equal(deal.zip, '85224');
  assert.equal(deal.sqft, '1543');
});

test('missing buyer-facing fields are reported instead of invented', () => {
  const missing = getMissingDealFields(parseDealInput(acquisitionsPackage));

  assert.ok(missing.includes('city'));
  assert.ok(missing.includes('asking price'));
  assert.ok(missing.includes('ARV'));
  assert.ok(missing.includes('closing date'));
  assert.ok(missing.includes('EMD'));
});

test('compact deal notes still parse into a complete package', () => {
  const deal = parseDealInput(`Address: 2202 Van Wert St, Greensboro, NC 27403
Asking 134k
ARV 220k
3 bed 1 bath
1,108 sq ft
Built 1955
Tenant occupied
Access: By appointment
Close by 09/13/2026
EMD 7k
HVAC and water heater need review. Kitchen needs a full refresh.
Phone 9803511529`);

  assert.deepEqual({
    address: deal.address,
    city: deal.city,
    state: deal.state,
    zip: deal.zip,
    askingPrice: deal.askingPrice,
    arv: deal.arv,
    beds: deal.beds,
    baths: deal.baths,
    sqft: deal.sqft,
    yearBuilt: deal.yearBuilt,
    occupancy: deal.occupancy,
    access: deal.access,
    coe: deal.coe,
    emd: deal.emd,
    phone: deal.phone
  }, {
    address: '2202 Van Wert St',
    city: 'Greensboro',
    state: 'NC',
    zip: '27403',
    askingPrice: '134000',
    arv: '220000',
    beds: '3',
    baths: '1',
    sqft: '1108',
    yearBuilt: '1955',
    occupancy: 'Tenant occupied',
    access: 'By appointment',
    coe: '09/13/2026',
    emd: '7000',
    phone: '980-351-1529'
  });
  assert.equal(deal.conditionNotes, 'HVAC and water heater need review. Kitchen needs a full refresh.');
});

test('parsing a new deal resets absent values instead of keeping stale facts', () => {
  const first = parseDealInput('Address: 1 Main St, Raleigh, NC 27601\nAsking: $100,000');
  const second = parseDealInput('Address: 2 Oak Ave');

  assert.equal(first.askingPrice, '100000');
  assert.equal(second.askingPrice, '');
  assert.equal(second.city, '');
});

test('polish rewrites acquisition-style notes into buyer-facing language', () => {
  const raw = 'Property is not updated to today’s standards. Seller has completed some updates inside the home. Home is described as well cared for and well lived in. No major issues with the home were mentioned. Roof is believed to be about 10 years old. AC is believed to be less than 10 years old. Seller recently installed new turf in the backyard.';
  const polished = polishConditionNotes(raw);

  assert.match(polished, /not fully updated to current standards/);
  assert.match(polished, /Some interior updates have been completed/);
  assert.match(polished, /No major issues were reported/);
  assert.match(polished, /The roof is reported to be about 10 years old/);
  assert.match(polished, /New turf was recently installed in the backyard/);
  assert.doesNotMatch(polished, /Seller/);
  assert.notEqual(polished, raw);
});

test('polish still cleans rough field notes', () => {
  const polished = polishConditionNotes('hvac is old like 15 yrs but runs. roof done 2019. kitchen is rough cabinets falling off no dishwasher.');

  assert.equal(polished, 'HVAC is 15 years and is operational. Roof replaced 2019. Kitchen needs work cabinets need replacement no dishwasher.');
});

test('polish removes loaded rehab labels while preserving every concrete repair fact', () => {
  const polished = polishConditionNotes('Heavy rehab. The house needs a complete plumbing replacement due to poly piping and ceiling water damage (drywall torn back in family room under master bath). It also needs a lot of cosmetic updates, and the windows and garage doors definitely need to be replaced. HVAC: Not mentioned in the script. Roof: New roof.');

  assert.doesNotMatch(polished, /heavy rehab|definitely|not mentioned in the script/i);
  assert.match(polished, /Complete plumbing replacement is needed due to poly piping/);
  assert.match(polished, /ceiling water damage \(drywall opened in family room beneath the primary bathroom\)/);
  assert.match(polished, /Cosmetic updates are also needed/);
  assert.match(polished, /windows and garage doors need replacement/);
  assert.match(polished, /HVAC condition was not provided and should be verified/);
  assert.match(polished, /The roof is new/);
});

test('polish replaces blunt and uncertain system descriptions with professional language', () => {
  const polished = polishConditionNotes('Roof: On its last leg. Water heater: Should be fine.');

  assert.equal(polished, 'The roof shows signs of age and should be evaluated; replacement may be needed. Water heater condition was not confirmed and should be verified.');
  assert.doesNotMatch(polished, /last leg|should be fine/i);
});

test('extractTextBlastPhotoLink reads the dedicated Google Drive field', () => {
  assert.equal(
    extractTextBlastPhotoLink('Google Drive Photo Link: https://drive.google.com/drive/folders/abc123'),
    'https://drive.google.com/drive/folders/abc123'
  );
  assert.equal(extractTextBlastPhotoLink('Google Drive Photo Link: Not confirmed'), '');
});

test('not confirmed values remain missing and stay out of condition notes', () => {
  const deal = parseDealInput(`
Address: Not confirmed
Access: Not confirmed
CONDITION SUMMARY:
- Overall Property Condition: Not confirmed
- HVAC Age/Condition: Replaced in 2022
- Roof Age/Condition: Not confirmed
  `);

  assert.equal(deal.address, '');
  assert.equal(deal.access, '');
  assert.equal(deal.conditionNotes, 'HVAC Age/Condition: Replaced in 2022.');
  assert.ok(getMissingDealFields(deal).includes('address'));
  assert.ok(getMissingDealFields(deal).includes('access'));
});

test('a structured property package maps into OMD without internal handoff leakage', () => {
  const input = `OMD INPUT — PASTE THIS ENTIRE COMPLETED PACKAGE INTO OMD
Address: 1160 Example Drive, Chandler, AZ 85224
Asking Price: $250,000
Estimated ARV: $340,000
Bed/Bath Count: 3 bedrooms / 2.5 bathrooms
Sqft: 1543
Year Built: 1998
Occupancy: Owner occupied
Access: By appointment
Close of Escrow: 09/30/2026
EMD: $7,000
HOA: N/A
Google Drive Photo Link: https://drive.google.com/drive/folders/abc123

CONDITION SUMMARY
Overall Property Condition: Light cosmetic updates needed
HVAC Age/Condition: Replaced in 2022
Roof Age/Condition: About 10 years old

INTERNAL HANDOFF — DO NOT PUBLISH ON THE BUYER DEAL PAGE
Seller Contact: Private Seller
Commission Agreed To: 3%
Additional Negotiated Terms: Seller may leave personal property

FINAL QA BEFORE HANDOFF
The deal thread title is the full property address.`;

  const deal = parseDealInput(input);
  assert.deepEqual({
    address: deal.address,
    city: deal.city,
    state: deal.state,
    zip: deal.zip,
    askingPrice: deal.askingPrice,
    arv: deal.arv,
    beds: deal.beds,
    baths: deal.baths,
    sqft: deal.sqft,
    yearBuilt: deal.yearBuilt,
    occupancy: deal.occupancy,
    access: deal.access,
    coe: deal.coe,
    emd: deal.emd
  }, {
    address: '1160 Example Drive',
    city: 'Chandler',
    state: 'AZ',
    zip: '85224',
    askingPrice: '250000',
    arv: '340000',
    beds: '3',
    baths: '2.5',
    sqft: '1543',
    yearBuilt: '1998',
    occupancy: 'Owner occupied',
    access: 'By appointment',
    coe: '09/30/2026',
    emd: '7000'
  });
  assert.equal(extractTextBlastPhotoLink(input), 'https://drive.google.com/drive/folders/abc123');
  assert.match(deal.conditionNotes, /Light cosmetic updates needed/);
  assert.doesNotMatch(deal.conditionNotes, /Private Seller|3%|personal property|thread title/i);
});
