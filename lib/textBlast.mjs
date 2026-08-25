const formatNumber = (value) => {
  const number = Number(String(value || '').replace(/[$,]/g, ''));
  return Number.isFinite(number) && number > 0 ? number.toLocaleString('en-US') : '';
};

export const buildTextBlast = (deal, options = {}) => {
  const dealUrl = String(options.dealUrl || '').trim();
  const photoLink = String(options.photoLink || '').trim();
  const lines = [
    `New Deal - ${deal.city || ''}, ${deal.state || ''}`,
    '',
    `Address: ${deal.address || ''}, ${deal.city || ''}, ${deal.state || ''} ${deal.zip || ''}`,
    `Asking Price: $${formatNumber(deal.askingPrice)}`,
    `Estimated ARV: $${formatNumber(deal.arv)}`,
    `Beds/Baths: ${deal.beds || ''}/${deal.baths || ''}`,
    `Living Area Size: ${formatNumber(deal.sqft)} (Sq. Ft)`,
    `Year Built: ${deal.yearBuilt || ''}`,
    `Occupancy Status at Closing: ${deal.occupancy || 'TBD'}`,
    `Access: ${deal.access || 'Easy Access'}`,
    `COE: ${deal.coe || ''}`,
    `EMD: $${formatNumber(deal.emd)}`
  ];

  if (dealUrl) lines.push(`Deal Link: ${dealUrl}`);
  lines.push(`Google Drive Photos: ${photoLink || '[Paste Google Drive photo link]'}`);

  return lines.join('\n');
};
