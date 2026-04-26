import type { WordbookItem } from '@/types/wordbook'

export type ReviewSessionItem = {
  id: string
  prompt: string
  answer: string
  tip: string
}

export function toReviewSessionItem(item: WordbookItem): ReviewSessionItem {
  return {
    id: item.id,
    prompt: item.meaning,
    answer: item.text,
    tip: item.original || `${item.scene} · ${item.source}`,
  }
}

export function buildSinglePracticeHref(item: WordbookItem) {
  const params = new URLSearchParams({
    mode: 'single',
    itemId: item.id,
    prompt: item.meaning,
    answer: item.text,
    tip: item.original || `${item.scene} · ${item.source}`,
  })

  return `/review/session?${params.toString()}`
}

export function buildBatchPracticeHref(items: WordbookItem[]) {
  const sessionItems = items.map((item) => ({
    id: item.id,
    prompt: item.meaning,
    answer: item.text,
    tip: item.original || `${item.scene} · ${item.source}`,
  }))

  const encoded = encodeURIComponent(JSON.stringify(sessionItems))
  return `/review/session?mode=batch&items=${encoded}`
}