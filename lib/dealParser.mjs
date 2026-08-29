import { getPrimaryPhoneForState } from './contactPhone.mjs';

export const EMPTY_DEAL = {
  address: '',
  city: '',
  state: '',
  zip: '',
  askingPrice: '',
  arv: '',
  beds: '',
  baths: '',
  sqft: '',
  yearBuilt: '',
  occupancy: '',
  access: '',
  coe: '',
  emd: '',
  hoa: '',
  conditionNotes: '',
  phone: ''
};

const REQUIRED_FIELDS = [
  ['address', 'address'],
  ['city', 'city'],
  ['state', 'state'],
  ['zip', 'ZIP'],
  ['askingPrice', 'asking price'],
  ['arv', 'ARV'],
  ['beds', 'beds'],
  ['baths', 'baths'],
  ['sqft', 'square footage'],
  ['yearBuilt', 'year built'],
  ['occupancy', 'occupancy'],
  ['access', 'access'],
  ['coe', 'closing date'],
  ['emd', 'EMD'],
  ['conditionNotes', 'condition notes'],
  ['phone', 'contact phone']
];

const normalizeLabel = (value) => value
  .replace(/\*\*/g, '')
  .replace(/[^a-z0-9]+/gi, ' ')
  .trim()
  .toLowerCase();

const cleanLine = (line) => line
  .replace(/\\\s*$/, '')
  .trim()
  .replace(/^[-*•]\s*/, '')
  .replace(/\*\*/g, '')
  .trim();

const isUnavailableValue = (value) => /^(?:not confirmed|not discussed|unknown|tbd|n\/a|\[[^\]]+\])$/i
  .test(String(value || '').trim());

const splitField = (line) => {
  const separator = line.indexOf(':');
  if (separator === -1) return null;
  return {
    label: normalizeLabel(line.slice(0, separator)),
    value: line.slice(separator + 1).trim()
  };
};

const findField = (fields, labels) => {
  const wanted = labels.map(normalizeLabel);
  return fields.find((field) => wanted.includes(field.label))?.value || '';
};

const toNumber = (value) => {
  if (!value) return '';
  const cleaned = String(value).replace(/[$,]/g, '').trim();
  if (/k$/i.test(cleaned)) {
    const number = Number.parseFloat(cleaned.slice(0, -1));
    return Number.isFinite(number) ? String(Math.round(number * 1000)) : '';
  }
  const match = cleaned.match(/[\d.]+/);
  return match ? match[0] : '';
};

const sentence = (value) => {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
};

const isInternalLine = (line) => /(?:lead source|seller contact|contact email|company number|commission|decision maker|husband passed|asked seller|receipt requested|seller is older|moving to|smoother move|buyer confirmed|environmental red flags checked)/i.test(line);

const isPropertyConditionLine = (line) => /(?:property|home|condition|update|rehab|structural|issue|hazard|HVAC|\bAC\b|roof|water heater|turf|two-story|layout|bedroom|bathroom|kitchen|floor|foundation|pool|garage)/i.test(line);

const buildConditionNotes = (lines, fields) => {
  const conditionHeading = lines.findIndex((line) => /^condition summary\s*:?$/i.test(line));

  if (conditionHeading !== -1) {
    const summary = [];
    for (let index = conditionHeading + 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (/^[A-Z][A-Z0-9\s/&+—–-]+:?$/.test(line)) break;
      const field = splitField(line);
      if (!line || isInternalLine(line) || !isPropertyConditionLine(line) || isUnavailableValue(field?.value)) continue;
      summary.push(sentence(line));
    }
    if (summary.length) return summary.join(' ');
  }

  const labeledFacts = [
    [['overall property condition', 'property condition'], ''],
    [['rehab level'], 'Rehab level: '],
    [['obvious structural issues or hazards', 'structural issues'], 'Structural issues or hazards: '],
    [['hvac age condition', 'hvac'], 'HVAC: '],
    [['roof age condition', 'roof'], 'Roof: '],
    [['water heater'], 'Water heater: '],
    [['possible layout note', 'layout'], 'Layout: ']
  ]
    .map(([labels, prefix]) => {
      const value = findField(fields, labels);
      return value && !isUnavailableValue(value) && !isInternalLine(value) ? sentence(`${prefix}${value}`) : '';
    })
    .filter(Boolean);

  if (labeledFacts.length) return labeledFacts.join(' ');

  const fallbackStart = lines.findIndex((line) => /(?:hvac|roof|kitchen|property condition|condition notes)/i.test(line));
  if (fallbackStart === -1) return '';

  return lines
    .slice(fallbackStart)
    .filter((line) => line && !isInternalLine(line) && !/^(?:phone|call|text|lockbox|seller wants)\s*:/i.test(line))
    .filter(isPropertyConditionLine)
    .map(sentence)
    .join(' ');
};

export const parseDealInput = (rawInput) => {
  const lines = String(rawInput || '')
    .replace(/\r/g, '')
    .split('\n')
    .map(cleanLine)
    .filter(Boolean);
  const fields = lines.map(splitField).filter(Boolean);
  const text = lines.join('\n');
  const data = { ...EMPTY_DEAL };

  const addressValue = findField(fields, ['address'])
    || findField(fields, ['mandatory property package'])
    || text.match(/^address\s*:?\s*(.+)$/im)?.[1]
    || '';
  if (addressValue && !isUnavailableValue(addressValue)) {
    const fullAddress = addressValue.match(/^(.+?),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5})(?:-\d{4})?$/i);
    if (fullAddress) {
      data.address = fullAddress[1].trim();
      data.city = fullAddress[2].trim();
      data.state = fullAddress[3].toUpperCase();
      data.zip = fullAddress[4];
    } else {
      data.address = addressValue.trim();
    }
  }

  let match;
  const asking = findField(fields, ['asking price', 'asking', 'price'])
    || text.match(/asking(?:\s+price)?[^0-9]*([\d,]+k?)/i)?.[1]
    || '';
  if (asking) data.askingPrice = toNumber(asking);

  const arv = findField(fields, ['arv', 'estimated arv'])
    || text.match(/(?:estimated\s+)?arv[^0-9]*([\d,]+k?)/i)?.[1]
    || '';
  if (arv) data.arv = toNumber(arv);

  const bedBath = findField(fields, ['bed bath count', 'beds baths', 'bedroom bathroom count']);
  const bedsField = findField(fields, ['beds', 'bedrooms', 'bed']);
  const bathsField = findField(fields, ['baths', 'bathrooms', 'bath']);
  const plausibleCount = (value) => {
    const number = Number.parseFloat(toNumber(value));
    return Number.isFinite(number) && number > 0 && number <= 20 ? String(number) : '';
  };

  data.beds = plausibleCount(bedsField);
  data.baths = plausibleCount(bathsField);

  if (bedBath) {
    match = bedBath.match(/(\d+(?:\.\d+)?)[ \t]*(?:bed|bedroom)/i);
    if (match && !data.beds) data.beds = plausibleCount(match[1]);
    match = bedBath.match(/(\d+(?:\.\d+)?)[ \t]*(?:bath|bathroom)/i);
    if (match && !data.baths) data.baths = plausibleCount(match[1]);

    if (!data.beds || !data.baths) {
      const pairedCounts = bedBath.match(/(\d+(?:\.\d+)?)[ \t]*[/x][ \t]*(\d+(?:\.\d+)?)/i);
      if (pairedCounts) {
        if (!data.beds) data.beds = plausibleCount(pairedCounts[1]);
        if (!data.baths) data.baths = plausibleCount(pairedCounts[2]);
      }
    }
  }

  if (!data.beds || !data.baths) {
    for (const line of lines) {
      if (!data.beds) {
        match = line.match(/(\d+(?:\.\d+)?)[ \t]*(?:bed|bedroom)s?\b/i)
          || line.match(/\b(?:bed|bedroom)s?\s*:?\s*(\d+(?:\.\d+)?)/i);
        if (match) data.beds = plausibleCount(match[1]);
      }
      if (!data.baths) {
        match = line.match(/(\d+(?:\.\d+)?)[ \t]*(?:bath|bathroom)s?\b/i)
          || line.match(/\b(?:bath|bathroom)s?\s*:?\s*(\d+(?:\.\d+)?)/i);
        if (match) data.baths = plausibleCount(match[1]);
      }
      if (data.beds && data.baths) break;
    }
  }

  const livingArea = findField(fields, ['sqft', 'square feet', 'living area', 'living area size']);
  if (livingArea) {
    data.sqft = toNumber(livingArea);
  } else {
    const sqftLine = lines.find((line) => !/lot\s*size/i.test(line) && /(?:sqft|sq\.?\s*ft)/i.test(line));
    match = sqftLine?.match(/([\d,]+)\s*(?:sqft|sq\.?\s*ft)/i);
    if (match) data.sqft = toNumber(match[1]);
  }

  const yearBuilt = findField(fields, ['year built', 'built']);
  match = (yearBuilt || text).match(/(?:built\s*)?(19\d{2}|20\d{2})/i);
  if (match) data.yearBuilt = match[1];

  const occupancy = findField(fields, ['occupancy', 'occupancy status at closing']);
  match = (occupancy || text).match(/tenant occupied|owner occupied|vacant|occupied|tenant/i);
  if (match) data.occupancy = match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase();

  const access = findField(fields, ['access', 'property access'])
    || text.match(/^access\s*:?\s*(.+)$/im)?.[1]
    || '';
  if (access && !isUnavailableValue(access)) {
    data.access = access;
  } else {
    match = text.match(/lockbox\s*(?:code)?\s*:?\s*(\d+)/i);
    if (match) data.access = `Lockbox ${match[1]}`;
  }

  const closing = findField(fields, ['coe', 'close', 'close by', 'close of escrow', 'closing date'])
    || text.match(/(?:coe|close\s+by|close(?:\s+of\s+escrow)?|closing\s+date)\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i)?.[1]
    || '';
  match = (closing || text).match(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
  if (match) data.coe = match[0];

  const emd = findField(fields, ['emd', 'earnest money', 'earnest money deposit'])
    || text.match(/(?:emd|earnest money(?: deposit)?)[^0-9]*([\d,]+k?)/i)?.[1]
    || '';
  if (emd) data.emd = toNumber(emd);

  const hoa = findField(fields, ['hoa', 'hoa cost', 'hoa cost and what it covers']);
  if (hoa) {
    const normalizedHoa = hoa.trim();
    if (/^(?:yes|y)$/i.test(normalizedHoa)) data.hoa = 'Yes';
    else if (/^(?:no|none)$/i.test(normalizedHoa)) data.hoa = 'No';
    else if (/^(?:n\/?a|not applicable)$/i.test(normalizedHoa)) data.hoa = 'N/A';
    else if (!/(?:not discussed|not confirmed|unknown|tbd)/i.test(normalizedHoa)) {
      data.hoa = normalizedHoa;
    }
  }

  // Staff never need to type a dispositions number. The verified market map is
  // authoritative; unlisted states remain blank so the UI requires a selection.
  data.phone = getPrimaryPhoneForState(data.state);

  data.conditionNotes = buildConditionNotes(lines, fields);
  return data;
};

export const getMissingDealFields = (deal) => REQUIRED_FIELDS
  .filter(([key]) => !String(deal[key] || '').trim() || isUnavailableValue(deal[key]))
  .map(([, label]) => label);

export const extractTextBlastPhotoLink = (rawInput) => {
  const lines = String(rawInput || '')
    .replace(/\r/g, '')
    .split('\n')
    .map(cleanLine)
    .filter(Boolean);
  const fields = lines.map(splitField).filter(Boolean);
  const value = findField(fields, [
    'google drive photo link',
    'google drive photos',
    'photo folder link',
    'photos link'
  ]);
  if (!value || isUnavailableValue(value)) return '';
  return value.match(/https?:\/\/\S+/i)?.[0]?.replace(/[),.;]+$/, '') || '';
};

export const polishConditionNotes = (value) => {
  let text = String(value || '').trim();
  if (!text) return '';

  text = text
    // Remove vague rehab labels that add fear without adding a property fact.
    .replace(/\b(?:light|moderate|medium|heavy|full|major|complete|extensive)\s+(?:rehab|renovation)\b[.!]?\s*/gi, '')
    .replace(/\b(?:gut job|needs everything)\b[.!]?\s*/gi, '')
    // Turn blunt or uncertain system notes into factual buyer language.
    .replace(/\broof\s*:\s*on (?:its|the) last leg\b/gi, 'The roof shows signs of age and should be evaluated; replacement may be needed')
    .replace(/\broof\s*:\s*new roof\b/gi, 'The roof is new')
    .replace(/\b(hvac|a\/c|ac|roof|water heater|plumbing|electrical|sewer|foundation)\s*:\s*should be fine\b/gi, (_, system) => `${system.toLowerCase() === 'hvac' ? 'HVAC' : system.toLowerCase() === 'a/c' || system.toLowerCase() === 'ac' ? 'AC' : `${system.charAt(0).toUpperCase()}${system.slice(1).toLowerCase()}`} condition was not confirmed and should be verified`)
    .replace(/\b(hvac|a\/c|ac|roof|water heater|plumbing|electrical|sewer|foundation)\s*:\s*not mentioned in (?:the )?(?:script|notes|report)\b/gi, (_, system) => `${system.toLowerCase() === 'hvac' ? 'HVAC' : system.toLowerCase() === 'a/c' || system.toLowerCase() === 'ac' ? 'AC' : `${system.charAt(0).toUpperCase()}${system.slice(1).toLowerCase()}`} condition was not provided and should be verified`)
    // Keep the repairs while replacing loaded or conversational wording.
    .replace(/\b(?:the\s+)?(?:house|home|property)\s+needs?\s+(?:a\s+)?complete plumbing replacement/gi, 'Complete plumbing replacement is needed')
    .replace(/\b(?:it|the property|the home|the house)\s+also\s+needs?\s+(?:a lot of|significant|extensive)?\s*cosmetic updates?/gi, 'Cosmetic updates are also needed')
    .replace(/\b(?:a lot of|significant|extensive)\s+cosmetic updates?\s+(?:are|is)\s+needed\b/gi, 'Cosmetic updates are needed')
    .replace(/\bdefinitely\s+need to be replaced\b/gi, 'need replacement')
    .replace(/\bdefinitely\s+needs to be replaced\b/gi, 'needs replacement')
    .replace(/\bneed to be replaced\b/gi, 'need replacement')
    .replace(/\bneeds to be replaced\b/gi, 'needs replacement')
    .replace(/drywall\s+torn\s+back/gi, 'drywall opened')
    .replace(/\bunder\s+(?:the\s+)?master bath(?:room)?\b/gi, 'beneath the primary bathroom')
    .replace(/property is not updated to today[’']s standards/gi, 'The property is not fully updated to current standards')
    .replace(/seller has completed some updates inside the home/gi, 'Some interior updates have been completed')
    .replace(/home is described as well cared for and well lived in/gi, 'The home appears well cared for, with normal signs of use')
    .replace(/no major issues with the home were mentioned/gi, 'No major issues were reported')
    .replace(/roof is believed to be about ([^.]+)/gi, 'The roof is reported to be about $1')
    .replace(/AC is believed to be ([^.]+)/gi, 'The AC is reported to be $1')
    .replace(/seller recently installed new turf in the backyard/gi, 'New turf was recently installed in the backyard')
    .replace(/property is a two-story home/gi, 'The property is a two-story home')
    .replace(/hvac/gi, 'HVAC')
    .replace(/(\d+)\s*yrs?\b/gi, '$1 years')
    .replace(/is old like (\d+)/gi, 'is $1')
    .replace(/but runs/gi, 'and is operational')
    .replace(/roof done (\d{4})/gi, 'Roof replaced $1')
    .replace(/seller says\.?\s*/gi, '')
    .replace(/seller said\.?\s*/gi, '')
    .replace(/is rough/gi, 'needs work')
    .replace(/cabinets falling off/gi, 'cabinets need replacement')
    .replace(/no dishwasher/gi, 'no dishwasher')
    .replace(/that old pink tile/gi, 'dated tile')
    .replace(/didnt see cracks/gi, 'no visible cracks')
    .replace(/didn't see cracks/gi, 'no visible cracks')
    .replace(/looks ok/gi, 'appears solid')
    .replace(/was converted/gi, 'converted')
    .replace(/not sure if permitted/gi, 'permit status unknown')
    .replace(/is gross/gi, 'needs attention')
    .replace(/green water/gi, 'needs draining')
    .replace(/pump might be shot/gi, 'pump may need replacement')
    .replace(/hasnt been touched in forever/gi, 'not recently maintained')
    .replace(/hasn't been touched in forever/gi, 'not recently maintained')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.])/g, '$1')
    .replace(/([,.]){2,}/g, '$1')
    .trim();

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim().replace(/[.,]+$/, ''))
    .filter(Boolean)
    .map((item) => `${item.charAt(0).toUpperCase()}${item.slice(1)}.`);

  return [...new Set(sentences)].join(' ');
};

const conditionSentences = (value) => String(value || '')
  .match(/[^.!?]+(?:[.!?]+|$)/g)
  ?.map((sentence) => sentence.trim())
  .filter(Boolean) || [];

const joinConditionSections = (...sections) => sections
  .flat()
  .filter(Boolean)
  .join(' ')
  .replace(/\s+/g, ' ')
  .trim();

const relaxConditionLanguage = (value) => String(value || '')
  // Treat field notes as reported scope, not a contractor's final diagnosis.
  .replace(/Complete plumbing replacement is needed due to ([^.]+)/gi, 'Possible plumbing work related to $1')
  .replace(/Complete ([a-z ]+) replacement is needed/gi, 'The notes mention possible $1 replacement')
  .replace(/Cosmetic updates are also needed, and the ([^.]+) need replacement/gi, 'The home could also use some cosmetic updates, and the $1 may need attention')
  .replace(/Cosmetic updates are needed/gi, 'The home could use some cosmetic updates')
  .replace(/\b([A-Z][A-Za-z /]+) condition was not provided and should be verified\b/g, '$1 details were not provided')
  .replace(/\b([A-Z][A-Za-z /]+) condition was not confirmed and should be verified\b/g, '$1 details were not confirmed')
  .replace(/The roof is new/gi, 'The roof is reported as new')
  .replace(/The roof shows signs of age and should be evaluated; replacement may be needed/gi, 'The notes describe an older roof, so buyers may want to check its condition')
  .replace(/drywall opened/gi, 'open drywall')
  .replace(/beneath the primary bathroom/gi, 'below the primary bathroom');

const matchesPolyPipingPackage = (value) => [
  /poly piping/i,
  /ceiling water damage/i,
  /cosmetic updates/i,
  /windows and garage doors/i,
  /HVAC details were not provided/i,
  /roof is reported as new/i
].every((pattern) => pattern.test(value));

const polyPipingPackageOptions = () => [
  {
    id: 'balanced',
    label: 'Option 1',
    description: 'Natural, balanced, and easy to read.',
    text: 'Good value-add opportunity with a new roof already in place. The home could use a general refresh, and the plumbing may need attention due to poly piping. There is also some ceiling/drywall repair, along with updates to the windows and garage doors. HVAC details are still being confirmed.'
  },
  {
    id: 'value-add',
    label: 'Option 2',
    description: 'A slightly shorter variation with the same details.',
    text: 'Solid opportunity for an investor looking to add value, with a new roof already taken care of. The home is ready for a general refresh, and the plumbing may need attention because of poly piping. Some ceiling/drywall repair is also noted, along with updates to the windows and garage doors. HVAC details are still being confirmed.'
  },
  {
    id: 'direct',
    label: 'Option 3',
    description: 'Leads with the newer item and keeps the rest relaxed.',
    text: 'A new roof is already in place, giving this property a good starting point for an update. The home could benefit from a general refresh, with possible plumbing work related to poly piping, some ceiling/drywall repair, and updates to the windows and garage doors. HVAC details are still being confirmed.'
  }
];

export const buildConditionNoteOptions = (value) => {
  const polished = relaxConditionLanguage(polishConditionNotes(value));
  if (!polished) return [];
  if (matchesPolyPipingPackage(polished)) return polyPipingPackageOptions();

  const sentences = conditionSentences(polished);
  const verification = sentences.filter((sentence) => /\b(?:verify|verified|evaluated|not confirmed|not provided|unknown|reported|believed|appears)\b/i.test(sentence));
  const highlights = sentences.filter((sentence) => !verification.includes(sentence) && /\b(?:new|replaced|completed|operational|well cared for|appears solid|no major issues)\b/i.test(sentence));
  const improvements = sentences.filter((sentence) => !verification.includes(sentence) && !highlights.includes(sentence));
  const hasImprovementScope = improvements.length > 0;

  return [
    {
      id: 'balanced',
      label: 'Option 1',
      description: 'Natural, balanced, and easy to read.',
      text: joinConditionSections(
        hasImprovementScope
          ? 'Good value-add opportunity for an investor who is comfortable with some updates.'
          : 'Here is what was shared about the property.',
        improvements,
        highlights,
        verification
      )
    },
    {
      id: 'value-add',
      label: 'Option 2',
      description: 'A shorter variation with the same property details.',
      text: joinConditionSections(
        hasImprovementScope
          ? 'This one has room to add value.'
          : 'Here is the quick version.',
        highlights,
        improvements,
        verification
      )
    },
    {
      id: 'direct',
      label: 'Option 3',
      description: 'Another relaxed version with a different opening.',
      text: joinConditionSections(
        highlights,
        hasImprovementScope ? 'The home could be a good fit for someone ready to take on the updates.' : '',
        improvements,
        verification
      ) || polished
    }
  ];
};
