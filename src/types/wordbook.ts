export type ItemType = 'word' | 'phrase' | 'sentence'
export type ItemStatus = 'new' | 'review' | 'mastered' | 'difficult'
export type ReviewResult = 'easy' | 'hard' | 'forgot'

export type WordbookItem = {
  id: string
  user_id: string
  text: string
  meaning: string
  type: ItemType
  source: 'Diary' | 'Practice' | 'AI Rewrite'
  scene: 'Shopping' | 'Work' | 'Travel' | 'Daily Life'
  status: ItemStatus
  original: string | null
  review_count: number
  correct_count: number
  wrong_count: number
  last_reviewed_at: string | null
  next_review_at: string | null
  created_at: string
  updated_at: string
}