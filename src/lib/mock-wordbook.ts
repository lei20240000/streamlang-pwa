export type ItemType = 'word' | 'phrase' | 'sentence'
export type ItemStatus = 'new' | 'review' | 'mastered' | 'difficult'

export type WordbookItem = {
  id: string
  text: string
  meaning: string
  type: ItemType
  source: 'Diary' | 'Practice' | 'AI Rewrite'
  scene: 'Shopping' | 'Work' | 'Travel' | 'Daily Life'
  status: ItemStatus
  original?: string
}

export const mockWordbookItems: WordbookItem[] = [
  {
    id: '1',
    text: 'receipt',
    meaning: '收据，小票',
    type: 'word',
    source: 'Diary',
    scene: 'Shopping',
    status: 'review',
    original: 'Could I have the receipt, please?',
  },
  {
    id: '2',
    text: 'pick it up',
    meaning: '取走；领取',
    type: 'phrase',
    source: 'Practice',
    scene: 'Daily Life',
    status: 'new',
    original: 'I will pick it up tomorrow after work.',
  },
  {
    id: '3',
    text: 'Could you say that again?',
    meaning: '你能再说一遍吗？',
    type: 'sentence',
    source: 'AI Rewrite',
    scene: 'Daily Life',
    status: 'review',
    original: 'Could you say that again? I didn’t catch it.',
  },
  {
    id: '4',
    text: 'I’m just looking around.',
    meaning: '我只是随便看看。',
    type: 'sentence',
    source: 'Diary',
    scene: 'Shopping',
    status: 'difficult',
    original: 'I’m just looking around. I’ll decide later.',
  },
  {
    id: '5',
    text: 'schedule',
    meaning: '日程；安排',
    type: 'word',
    source: 'Practice',
    scene: 'Work',
    status: 'mastered',
    original: 'My schedule is full this week.',
  },
  {
    id: '6',
    text: 'follow up',
    meaning: '跟进',
    type: 'phrase',
    source: 'AI Rewrite',
    scene: 'Work',
    status: 'review',
    original: 'I will follow up with the client tomorrow.',
  },
]