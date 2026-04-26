import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ReviewResult, WordbookItem } from '@/types/wordbook'

type SubmitBody = {
  itemId: string
  result: ReviewResult
}

function getNextStatus(item: Pick<WordbookItem, 'status' | 'correct_count'>, result: ReviewResult) {
  if (result === 'forgot') return 'difficult'
  if (result === 'hard') return 'review'
  if (result === 'easy') {
    if (item.status === 'difficult') return 'review'
    if ((item.correct_count ?? 0) + 1 >= 2) return 'mastered'
    return 'review'
  }
  return item.status
}

function getNextReviewAt(result: ReviewResult) {
  const now = new Date()
  if (result === 'forgot') {
    now.setDate(now.getDate() + 1)
    return now.toISOString()
  }
  if (result === 'hard') {
    now.setDate(now.getDate() + 2)
    return now.toISOString()
  }
  now.setDate(now.getDate() + 5)
  return now.toISOString()
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as SubmitBody
    const { itemId, result } = body

    if (!itemId || !['easy', 'hard', 'forgot'].includes(result)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { data: item, error: itemError } = await supabase
      .from('wordbook_items')
      .select('*')
      .eq('id', itemId)
      .eq('user_id', user.id)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const nextStatus = getNextStatus(item, result)
    const nextReviewAt = getNextReviewAt(result)

    const updatePayload = {
      review_count: (item.review_count ?? 0) + 1,
      correct_count: result === 'easy' ? (item.correct_count ?? 0) + 1 : item.correct_count ?? 0,
      wrong_count: result === 'forgot' ? (item.wrong_count ?? 0) + 1 : item.wrong_count ?? 0,
      status: nextStatus,
      last_reviewed_at: new Date().toISOString(),
      next_review_at: nextReviewAt,
    }

    const { error: logError } = await supabase.from('review_logs').insert({
      user_id: user.id,
      wordbook_item_id: itemId,
      result,
    })

    if (logError) {
      return NextResponse.json({ error: logError.message }, { status: 500 })
    }

    const { data: updatedItem, error: updateError } = await supabase
      .from('wordbook_items')
      .update(updatePayload)
      .eq('id', itemId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      item: updatedItem,
    })
  } catch (error) {
    console.error('review submit error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}