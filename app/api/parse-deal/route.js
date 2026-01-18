import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request) {
  try {
    const body = await request.json();
    const rawText = body.rawText;

    const prompt = "Extract deal info from this messy text. Return ONLY valid JSON.\n\nTEXT:\n" + rawText + "\n\nFields: address, city, state, zip, askingPrice, arv, beds, baths, sqft, yearBuilt, occupancy, coe, emd, hoa, conditionNotes. Return JSON only.";

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
