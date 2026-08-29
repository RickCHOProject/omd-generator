const FACEBOOK_VARIANTS = [
  {
    opening: ({ city, state }) => `${city} investors, here is a new off market opportunity worth reviewing.`,
    intro: ({ beds, baths, sqft }) => `This property has ${beds} bedrooms, ${baths} bathrooms and ${sqft} square feet.`,
    order: ['price', 'arv', 'occupancy', 'closing'],
    cta: ({ phone }) => `Interested? Send me a message or text me at ${phone}.`
  },
  {
    opening: ({ city, state }) => `We just added another property in ${city}, ${state} to the board.`,
    intro: ({ beds, baths, sqft }) => `It is a ${beds} bedroom, ${baths} bathroom property with ${sqft} square feet.`,
    order: ['occupancy', 'price', 'arv', 'closing'],
    cta: ({ phone }) => `Want to take a closer look? Send me a message or text me at ${phone}.`
  },
  {
    opening: ({ city, state }) => `New investment opportunity available in ${city}, ${state}.`,
    intro: ({ beds, baths, sqft }) => `The property offers ${beds} bedrooms, ${baths} bathrooms and ${sqft} square feet.`,
    order: ['price', 'closing', 'arv', 'occupancy'],
    cta: ({ phone }) => `For details or showing availability, send me a message or text me at ${phone}.`
  },
  {
    opening: ({ city, state }) => `If you are buying in ${city}, take a look at this one.`,
    intro: ({ beds, baths, sqft }) => `${beds} bedrooms, ${baths} bathrooms and ${sqft} square feet of potential.`,
    order: ['arv', 'price', 'occupancy', 'closing'],
    cta: ({ phone }) => `If you are interested, send me a message or text me at ${phone}.`
  },
  {
    opening: ({ city, state }) => `Sharing a new off market property in ${city}, ${state}.`,
    intro: ({ beds, baths, sqft }) => `This one is a ${beds} bedroom, ${baths} bathroom property with ${sqft} square feet.`,
    order: ['price', 'arv', 'closing', 'occupancy'],
    cta: ({ phone }) => `If it fits what you are buying, send me a message or text me at ${phone}.`
  },
  {
    opening: ({ city, state }) => `A new ${city} deal is ready for review.`,
    intro: ({ beds, baths, sqft }) => `The property has ${beds} bedrooms, ${baths} bathrooms and ${sqft} square feet.`,
    order: ['occupancy', 'closing', 'price', 'arv'],
    cta: ({ phone }) => `Questions about the opportunity? Send me a message or text me at ${phone}.`
  }
];

const normalizeText = (value, fallback = 'TBD') => {
  const cleaned = String(value ?? '')
    .replace(/[\u2013\u2014]/g, ',')
    .replace(/\s+,/g, ',')
    .replace(/,{2,}/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
};

const formatPrice = (value) => {
  const number = Number(String(value ?? '').replace(/[$,]/g, ''));
  return Number.isFinite(number) && number > 0 ? number.toLocaleString('en-US') : 'TBD';
};

const formatSqft = (value) => {
  const number = Number(String(value ?? '').replace(/[,]/g, ''));
  return Number.isFinite(number) && number > 0 ? number.toLocaleString('en-US') : 'TBD';
};

const conditionSummary = (notes) => {
  const cleaned = normalizeText(notes, '');
  if (!cleaned) return '';

  const firstTwoSentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(' ');

  if (firstTwoSentences.length <= 260) return firstTwoSentences;
  return `${firstTwoSentences.slice(0, 257).trimEnd()}...`;
};

const createFactLines = (deal) => ({
  price: `Asking price: $${formatPrice(deal.askingPrice)}`,
  arv: `Estimated ARV: $${formatPrice(deal.arv)}`,
  occupancy: `Occupancy: ${normalizeText(deal.occupancy)}`,
  closing: `Closing: ${normalizeText(deal.coe)}`
});

export const FACEBOOK_VARIANT_COUNT = FACEBOOK_VARIANTS.length;

export const getFacebookVariantIndex = (deal) => {
  const seed = [deal.address, deal.city, deal.state, deal.askingPrice]
    .map((value) => normalizeText(value, ''))
    .join('|');

  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return hash % FACEBOOK_VARIANTS.length;
};

export const buildFacebookPost = (deal, options = {}) => {
  const variantIndex = Math.abs(Number(options.variantIndex) || 0) % FACEBOOK_VARIANTS.length;
  const variant = FACEBOOK_VARIANTS[variantIndex];
  const normalizedDeal = {
    city: normalizeText(deal.city, 'Local'),
    state: normalizeText(deal.state, ''),
    beds: normalizeText(deal.beds),
    baths: normalizeText(deal.baths),
    sqft: formatSqft(deal.sqft),
    phone: normalizeText(deal.phone, 'the number listed in the deal package')
  };
  const facts = createFactLines(deal);
  const notes = conditionSummary(deal.conditionNotes);
  const sections = [
    variant.opening(normalizedDeal),
    variant.intro(normalizedDeal),
    variant.order.map((key) => facts[key]).join('\n')
  ];

  if (notes) sections.push(notes);

  sections.push(variant.cta(normalizedDeal));
  sections.push('Buyer is responsible for verifying all property information and completing their own due diligence.');

  return sections.join('\n\n').replace(/[\u2013\u2014]/g, ',');
};

export const buildMessengerReply = (dealUrl) => {
  const normalizedUrl = normalizeText(dealUrl, '');
  if (!normalizedUrl) {
    return 'Publish the OMD page first. The Messenger reply will then include the live deal link.';
  }

  return [
    'Here you go. You can see the photos and full deal details here:',
    normalizedUrl,
    'Let me know if you have any questions or want to take a closer look.'
  ].join('\n\n');
};
