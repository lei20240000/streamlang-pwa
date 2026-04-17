import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { text, basic, natural, native, keywords } = await req.json()

  const content = `
${text}

${basic}
${natural}
${native}

关键词：${keywords.join(' / ')}

Learn Chinese Free
`

  return NextResponse.json({ content })
}