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
    .limit(1)
    .order('created_at', { ascending: false })

  return new Response(JSON.stringify({ item: data?.[0] }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  })
}