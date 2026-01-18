import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request) {
  try {
    const body = await request.json();
    const rawText = body.rawText;

    const prompt = `Extract deal info from this real estate text. Return ONLY valid JSON, no explanation.

TEXT:
${rawText}

EXTRACTION RULES:
- askingPrice: Look for "asking", "price", "list" followed by dollar amount. Convert "350k" to "350000"
- arv: Look for "ARV", "after repair value". Convert "500k" to "500000"
- beds/baths: Look for "4/3" format, or "4bd/3ba", or "4 bed 3 bath", or "beds: 4"
- sqft: Look for number followed by "sqft", "sq ft", "sf"
- coe: Look for "close by", "COE", "closing" followed by date
- emd: Look for "EMD", "earnest money". Convert "5k" to "5000"
- hoa: Look for "HOA" followed by amount or "N/A"
- access: Look for "lockbox", "lock box", "access". Include lockbox code if present
- notes: Everything about condition - HVAC, roof, kitchen, bath, foundation, pool, repairs, etc.
- occupancy: Look for "vacant", "occupied", "tenant"
- yearBuilt: Look for "year built", "built in" followed by year
- address, city, state, zip: Extract if present

Return this exact JSON structure (use empty string "" for missing fields):
{
  "address": "",
  "city": "",
  "state": "",
  "zip": "",
  "askingPrice": "",
  "arv": "",
  "beds": "",
  "baths": "",
  "sqft": "",
  "yearBuilt": "",
  "lotSize": "",
  "occupancy": "",
  "access": "",
  "coe": "",
  "emd": "",
  "hoa": "",
  "notes": ""
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = message.content[0].text;
    const match = text.match(/\{[\s\S]*\}/);

    if (match) {
      return Response.json(JSON.parse(match[0]));
    }

    return Response.json({ error: 'No JSON' }, { status: 500 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
