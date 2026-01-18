import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { images, count } = await request.json();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              ...images,
              {
                type: 'text',
                text: `You are labeling real estate property photos. For each of the ${count} images, identify what part of the property it shows.

Use ONLY these exact labels:
- Exterior - Front (front of house, curb appeal shot)
- Exterior - Back (backyard view of house)
- Exterior - Side (side of house)
- Living Room
- Kitchen
- Dining Room
- Master Bedroom
- Bedroom 2
- Bedroom 3
- Bathroom 1
- Bathroom 2
- Basement
- Garage
- Backyard (yard without house visible)
- Pool
- Roof
- HVAC
- Water Heater
- Damage
- Other

Respond with ONLY a JSON array of labels in order, like: ["Exterior - Front", "Kitchen", "Bathroom 1"]

No explanation, just the JSON array.`
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error('Anthropic API error');
    }

    const data = await response.json();
    const text = data.content[0].text;
    
    // Parse the JSON array from response
    const labels = JSON.parse(text);

    return NextResponse.json({ labels });
  } catch (error) {
    console.error('Label error:', error);
    return NextResponse.json({ labels: [] }, { status: 500 });
  }
}
