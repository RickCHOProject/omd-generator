import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request) {
  try {
    const { rawText } = await request.json();

    const prompt = "Extract deal info from this messy text. Return ONLY valid JSON, no other text.\n\nTEXT:\n" + rawText + "\n\nExtract these fields (use empty string if not found): address (street address only), city, state (2 letter code), zip, askingPrice (numbers only), arv (numbers only), beds (number only), baths (number only), sqft (numbers only), yearBuilt (4 digit year), occupancy, coe (close of escrow date), emd (numbers only), hoa (full text), conditionNotes (all property condition info in one paragraph).\n\nReturn JSON like: {\"address\":\"123 Main St\",\"city\":\"Atlanta\",\"state\":\"GA\",\"zip\":\"30301\",\"askingPrice\":\"285000\",\"arv\":\"410000\",\"beds\":\"3\",\"baths\":\"2\",\"sqft\":\"1847\",\"yearBuilt\":\"1987\",\"occupancy\":\"Vacant\",\"coe\":\"02/15/2026\",\"emd\":\"5000\",\"hoa\":\"$45/mo\",\"conditionNotes\":\"HVAC is old...\"}";

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return Response.json(parsed);
    }
    
    return Response.json({ error: 'No JSON found' }, { status: 500 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
