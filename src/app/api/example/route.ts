import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { word } = await req.json()

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      input: `用“${word}”造一个简单中文句子，并给英文翻译`
    })
  })

  const data = await res.json()

  const text =
    data?.output?.[0]?.content?.[0]?.text ||
    data?.output_text ||
    ''

  return NextResponse.json({ example: text })
}