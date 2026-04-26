import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type SaveBody = {
  original?: string
  basic?: string
  natural?: string
  native?: string
  keywords?: string[] | string
  pinyin?: string
  source?: string
  scene?: string
}

function normalizeKeywords(input: string[] | string | undefined): string[] {
  if (!input) return []

  if (Array.isArray(input)) {
    return input
      .map((item) => String(item).trim())
      .filter(Boolean)
  }

  return String(input)
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function pickBestSentence(body: SaveBody) {
  return (
    body.native?.trim() ||
    body.natural?.trim() ||
    body.basic?.trim() ||
    ''
  )
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = (await req.json()) as SaveBody

    const original = body.original?.trim() || ''
    const bestSentence = pickBestSentence(body)
    const keywords = normalizeKeywords(body.keywords)

    const rows: any[] = []

    if (bestSentence) {
      rows.push({
        user_id: user.id,
        text: bestSentence,
        meaning: original || body.basic || '',
        type: 'sentence',
        status: 'new',
        source: body.source || 'dashboard',
        scene: body.scene || null,
        original: original || null,
      })
    }

    for (const keyword of keywords) {
      rows.push({
        user_id: user.id,
        text: keyword,
        meaning: original || bestSentence || '',
        type: 'word',
        status: 'new',
        source: body.source || 'dashboard',
        scene: body.scene || null,
        original: original || null,
      })
    }

    if (rows.length === 0) {
      return NextResponse.json({
        ok: true,
        inserted: 0,
        message: 'Nothing to save',
      })
    }

    const { data, error } = await supabase
      .from('wordbook_items')
      .insert(rows)
      .select('id, text, type')

    if (error) {
      console.error('[api/save] insert error:', error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      inserted: data?.length || 0,
      items: data || [],
    })
  } catch (error) {
    console.error('[api/save] unexpected error:', error)
    return NextResponse.json(
      { ok: false, error: 'Save failed' },
      { status: 500 }
    )
  }
}