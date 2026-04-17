import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const { input, basic, natural_text, native_text, keywords, pinyin } = body

    if (!input || !basic) {
      return NextResponse.json(
        { error: '缺少必要字段 input 或 basic' },
        { status: 400 }
      )
    }

    console.log('SAVE 收到的数据 =', {
      input,
      basic,
      natural_text,
      native_text,
      keywords,
      pinyin
    })

    const { data, error: phraseError } = await supabase
      .from('phrases')
      .insert([
        {
          user_id: 'test_user',
          input,
          basic,
          natural_text,
          native_text,
          keywords,
          pinyin
        }
      ])
      .select()

    if (phraseError) {
      console.error('phrases 保存失败:', phraseError)
      return NextResponse.json(
        { error: 'phrases 保存失败', detail: phraseError.message },
        { status: 500 }
      )
    }

    if (Array.isArray(keywords) && keywords.length > 0) {
      const wordRows = keywords.map((word: string) => ({
        user_id: 'test_user',
        word,
        meaning: basic
      }))

      const { error: wordsError } = await supabase.from('words').insert(wordRows)

      if (wordsError) {
        console.error('words 保存失败:', wordsError)
        return NextResponse.json(
          { error: 'words 保存失败', detail: wordsError.message },
          { status: 500 }
        )
      }
    }

    console.log('SAVE 写入后的返回 =', data)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('save route error:', e)
    return NextResponse.json(
      { error: '保存失败' },
      { status: 500 }
    )
  }
}