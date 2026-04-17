import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const USER_ID = 'test_user'

export async function GET() {
  try {
    const { data: reviewedRows, error: reviewedError } = await supabase
      .from('reviews')
      .select('phrase_id')
      .eq('user_id', USER_ID)

    if (reviewedError) {
      return NextResponse.json(
        { error: reviewedError.message },
        { status: 500 }
      )
    }

    const reviewedIds = (reviewedRows || []).map((row: any) => row.phrase_id)

    let query = supabase
      .from('phrases')
      .select('*')
      .eq('user_id', USER_ID)
      .order('created_at', { ascending: false })

    if (reviewedIds.length > 0) {
      query = query.not('id', 'in', `(${reviewedIds.join(',')})`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ items: data || [] })
  } catch (e) {
    return NextResponse.json(
      { error: '读取复习内容失败' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { phrase_id, input, basic, keywords } = body

    if (!phrase_id) {
      return NextResponse.json(
        { error: '缺少 phrase_id' },
        { status: 400 }
      )
    }

    const { error: reviewError } = await supabase.from('reviews').insert([
      {
        user_id: USER_ID,
        phrase_id,
        status: 'done'
      }
    ])

    if (reviewError) {
      return NextResponse.json(
        { error: reviewError.message },
        { status: 500 }
      )
    }

    const graphRows = [
      {
        user_id: USER_ID,
        node_type: 'phrase',
        node_value: input,
        source_phrase_id: phrase_id
      },
      {
        user_id: USER_ID,
        node_type: 'basic',
        node_value: basic,
        source_phrase_id: phrase_id
      }
    ]

    for (const keyword of keywords || []) {
      graphRows.push({
        user_id: USER_ID,
        node_type: 'keyword',
        node_value: keyword,
        source_phrase_id: phrase_id
      })
    }

    const { error: graphError } = await supabase.from('user_graph').insert(graphRows)

    if (graphError) {
      return NextResponse.json(
        { error: graphError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: '提交复习失败' },
      { status: 500 }
    )
  }
}