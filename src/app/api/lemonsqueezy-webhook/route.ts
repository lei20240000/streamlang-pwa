import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const event = body.meta?.event_name

    if (event === 'order_created') {
      const email = body.data?.attributes?.user_email

      if (email) {
        // 👉 这里你后面可以改成真实用户ID
        await supabase
          .from('users')
          .update({ is_vip: true })
          .eq('email', email)
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'webhook error' }, { status: 500 })
  }
}