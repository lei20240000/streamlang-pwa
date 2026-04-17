import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data } = await supabase
    .from('phrases')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)

  const item = data?.[0]

  if (!item) {
    return NextResponse.json({ error: 'no data' })
  }

  const content = `
${item.input}

${item.basic}
${item.natural_text}
${item.native_text}

关键词：${item.keywords.join(' / ')}

👉 Learn Chinese Free
👉 Link in bio
`

  return NextResponse.json({
    text: content,
    keywords: item.keywords
  })
}