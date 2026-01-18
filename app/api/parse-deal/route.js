import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request) {
  try {
    const { rawText } = await request.json();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Extract deal info from this messy text. Return ONLY valid JSON, no other text.

TEXT:
${rawText}

Extract these fields (use empty string if not found):
- address (street address only, no city/state/zip)
- city
- state (2 letter code)
- zip
- askingPrice (numbers only, no $ or commas)
- arv (numbers only, no $ or commas, look for ARV or "after repair value" or estimated value)
- beds (number only)
- baths (number only)
- sqft (numbers only)
- yearBuilt (4 digit year)
- occupancy (vacant, occupied, tenant, etc)
- coe (close of escrow date)
- emd (earnest money, numbers o
