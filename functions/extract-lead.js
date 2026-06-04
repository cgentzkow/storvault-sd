export async function onRequestPost({ request, env }) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  }

  try {
    const { text, image } = await request.json()

    const msgContent = [
      ...(image ? [{
        type: 'image',
        source: {
          type: 'base64',
          media_type: image.split(';')[0].split(':')[1],
          data: image.split(',')[1],
        }
      }] : []),
      {
        type: 'text',
        text: `Extract commercial real estate property details from this content. Return ONLY a valid JSON object with these exact keys (use empty string "" if not found):
{ "name": "", "address": "", "city": "", "sf": "", "acres": "", "zoning": "", "askingPrice": "", "owner": "", "ownerPhone": "", "broker": "", "brokerPhone": "", "description": "" }

Content:
${text || '(see attached image)'}`
      }
    ]

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: msgContent }],
      }),
    })

    const data = await res.json()
    const raw = data.content?.[0]?.text || '{}'
    const match = raw.match(/\{[\s\S]*\}/)
    const extracted = match ? JSON.parse(match[0]) : {}

    return new Response(JSON.stringify(extracted), { headers: cors })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors })
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}
