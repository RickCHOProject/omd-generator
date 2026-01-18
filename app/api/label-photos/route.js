import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Handle buyer teaser generation
    if (body.generateTeaser) {
      const { city, state, beds, baths } = body;
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 150,
          messages: [
            {
              role: 'user',
              content: `Generate a short, casual text message teaser for a real estate deal. The message should:
- Be 1-2 sentences max
- Mention the city (${city}, ${state}) and beds/baths (${beds}/${baths})
- NOT include any link, price, address, or detailed info
- End with a casual question like "Still buying?", "You active?", "Interested?", "Want details?", "Still in the market?"
- Sound natural and conversational, not salesy
- Vary the opening - could start with "Hey!", "New deal", "Off-market", "Fresh one", "Solid opportunity", etc.

Just respond with the message text, nothing else.`
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('Anthropic API error');
      }

      const data = await response.json();
      const teaser = data.content[0].text.trim();
      return NextResponse.json({ teaser });
    }
    
    // Handle photo labeling
    const { images, count } = body;

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
    console.error('API error:', error);
    return NextResponse.json({ labels: [], teaser: null }, { status: 500 });
  }
}
