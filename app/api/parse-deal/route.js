import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request) {
  try {
    const { rawText } = await request.json();

    const prompt = `Extract deal info from this messy text. Return ONLY valid JSON, no other text.

TEXT:
${rawText}

Extract these fields (use empty string if not found):
- address (street address only, no city/state/zip)
- city
- state (2 letter code)
- zip
- askingPrice (numbers only, no $ or commas)
- arv (numbers only, no $ or commas)
- beds (number only)
- baths (number only)
- sqft (numbers only)
- yearBuilt (4 digit year)
- occupancy (vacant, occupied, tenant, etc)
- coe (close of escrow date)
- emd (earnest money, numbers only)
- hoa (keep the full text)
- conditionNotes (everything about property condition combined into one paragraph)

Return JSON like:
{"address":"123 Main St","city":"Atlanta","state":"GA","zip":"30301","askingPrice":"285000","arv":"410000","beds":"3","baths":"2","sqft":"1847","yearBuilt":"1987","occupancy":"Vacant","coe":"02/15/2026","emd":"5000","hoa":"$45/mo","conditionNotes":"HVAC is 12 years old..."}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].text;
    
    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(responseText);
      }
    } catch (e) {
      return Response.json({ error: 'Failed to parse' }, { status: 500 });
    }

    return Response.json(parsed);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
