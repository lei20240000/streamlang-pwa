import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const LANGUAGE_NAME_MAP: Record<string, string> = {
  en: 'English',
  zh: 'Chinese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  hi: 'Hindi',
  ar: 'Arabic',
  id: 'Indonesian',
  vi: 'Vietnamese',
  th: 'Thai',
  fil: 'Filipino',
  tr: 'Turkish',
  it: 'Italian',
  nl: 'Dutch',
  sw: 'Swahili',
  ms: 'Malay',
}

type ChallengeResult = {
  mode: 'single_blank_zh' | 'multi_blank'
  challenge_sentence: string
  masked_sentence_parts: string[]
  blanks_count: number
  choices: string[]
  answers: string[]
  tip: string
}

function safeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function uniq(list: string[]) {
  const seen = new Set<string>()
  const result: string[] = []

  for (const item of list) {
    const text = item.trim()
    if (!text) continue
    if (seen.has(text)) continue
    seen.add(text)
    result.push(text)
  }

  return result
}

function shuffle<T>(array: T[]) {
  const next = [...array]

  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = next[i]
    next[i] = next[j]
    next[j] = temp
  }

  return next
}

function buildSingleBlankFromSentence(sentence: string, answer: string) {
  const index = sentence.indexOf(answer)

  if (index < 0) {
    return null
  }

  return [
    sentence.slice(0, index),
    sentence.slice(index + answer.length),
  ]
}

function guessChineseAnswer(sentence: string) {
  const candidates = [
    '更好的结果',
    '再尝试一次',
    '有更好的结果',
    '取得更好的结果',
    '顺利完成',
    '继续努力',
  ]

  for (const item of candidates) {
    if (sentence.includes(item)) return item
  }

  const clean = sentence
    .replace(/[。！？!?，,]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (clean.length > 0) {
    return clean[Math.max(0, clean.length - 1)]
  }

  return ''
}

function normalizeChineseChallenge(parsed: any, sourceText: string): ChallengeResult {
  let challengeSentence = safeString(parsed?.challenge_sentence)

  if (!challengeSentence) {
    challengeSentence = sourceText
  }

  const rawAnswers = Array.isArray(parsed?.answers)
    ? parsed.answers.map(safeString).filter(Boolean)
    : []

  let answer = rawAnswers[0] || ''

  if (!answer || !challengeSentence.includes(answer)) {
    answer = guessChineseAnswer(challengeSentence)
  }

  if (!answer || !challengeSentence.includes(answer)) {
    challengeSentence = sourceText
    answer = guessChineseAnswer(challengeSentence)
  }

  if (!answer || !challengeSentence.includes(answer)) {
    challengeSentence = '我希望能再尝试一次，这次能有更好的结果。'
    answer = '有更好的结果'
  }

  const maskedParts =
    buildSingleBlankFromSentence(challengeSentence, answer) ||
    ['我希望能再尝试一次，这次能', '。']

  const aiChoices = Array.isArray(parsed?.choices)
    ? parsed.choices.map(safeString).filter(Boolean)
    : []

  const fallbackDistractors = [
    '取得好成绩',
    '有更大的进步',
    '更顺利',
    '更好地完成',
    '继续努力',
    '减少错误',
  ]

  const choices = shuffle(
    uniq([answer, ...aiChoices, ...fallbackDistractors]).filter(
      (item) => item !== challengeSentence
    )
  ).slice(0, 4)

  if (!choices.includes(answer)) {
    choices[0] = answer
  }

  return {
    mode: 'single_blank_zh',
    challenge_sentence: challengeSentence,
    masked_sentence_parts: maskedParts,
    blanks_count: 1,
    choices: shuffle(uniq(choices)).slice(0, 4),
    answers: [answer],
    tip: safeString(parsed?.tip) || '先看整句话的意思，再选择最自然的短语。',
  }
}

function normalizeMultiBlankChallenge(parsed: any, sourceText: string): ChallengeResult {
  const challengeSentence = safeString(parsed?.challenge_sentence) || sourceText

  const rawAnswers = Array.isArray(parsed?.answers)
    ? uniq(parsed.answers.map(safeString).filter(Boolean))
    : []

  let answers = rawAnswers.slice(0, 4)

  if (answers.length < 2) {
    const words = challengeSentence
      .replace(/[.,!?;:，。！？；：]/g, ' ')
      .split(/\s+/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 3)

    answers = uniq(words).slice(0, 3)
  }

  if (answers.length < 1) {
    answers = ['practice']
  }

  let maskedParts: string[] = []
  let cursorText = challengeSentence

  const parts: string[] = []
  let valid = true

  for (const answer of answers) {
    const index = cursorText.indexOf(answer)

    if (index < 0) {
      valid = false
      break
    }

    parts.push(cursorText.slice(0, index))
    cursorText = cursorText.slice(index + answer.length)
  }

  if (valid) {
    parts.push(cursorText)
    maskedParts = parts
  } else if (
    Array.isArray(parsed?.masked_sentence_parts) &&
    parsed.masked_sentence_parts.length === answers.length + 1
  ) {
    maskedParts = parsed.masked_sentence_parts.map(safeString)
  } else {
    maskedParts = [challengeSentence, '']
    answers = ['']
  }

  const aiChoices = Array.isArray(parsed?.choices)
    ? parsed.choices.map(safeString).filter(Boolean)
    : []

  const choices = shuffle(uniq([...answers, ...aiChoices])).slice(0, 8)

  for (const answer of answers) {
    if (answer && !choices.includes(answer)) {
      choices.push(answer)
    }
  }

  return {
    mode: 'multi_blank',
    challenge_sentence: challengeSentence,
    masked_sentence_parts: maskedParts,
    blanks_count: answers.length,
    choices: shuffle(uniq(choices)).slice(0, 8),
    answers,
    tip: safeString(parsed?.tip) || '注意词序和句子整体意思。',
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const sourceText = safeString(body?.sourceText)
    const sourceLang = safeString(body?.sourceLang) || 'en'
    const targetLang = safeString(body?.targetLang) || 'zh'

    if (!sourceText) {
      return NextResponse.json({ error: '缺少参考句子' }, { status: 400 })
    }

    const sourceLangName = LANGUAGE_NAME_MAP[sourceLang] || sourceLang
    const targetLangName = LANGUAGE_NAME_MAP[targetLang] || targetLang

    const prompt =
      targetLang === 'zh'
        ? `
你是语言学习产品 StreamLang 的中文出题助手。

请根据参考表达，生成一道稳定的“中文单空选择题”。

严格要求：
1. challenge_sentence 必须是一句自然中文。
2. challenge_sentence 可以轻微改写参考表达，但不要大幅改变意思。
3. 只挖掉 1 个连续短语。
4. answers[0] 必须是 challenge_sentence 中真实存在的连续短语。
5. masked_sentence_parts 必须由 challenge_sentence 按 answers[0] 切成前后两段。
6. choices 必须有 4 个，包含 answers[0]。
7. 干扰项必须是中文短语，长度和正确答案接近。
8. 不要把整句话当选项。
9. 不要生成跨句、跨标点的答案。
10. 不要返回 markdown，不要解释，只返回 JSON。

返回格式必须是：
{
  "mode": "single_blank_zh",
  "challenge_sentence": "完整中文句子",
  "masked_sentence_parts": ["答案前面的文本", "答案后面的文本"],
  "blanks_count": 1,
  "choices": ["正确短语", "干扰短语1", "干扰短语2", "干扰短语3"],
  "answers": ["正确短语"],
  "tip": "一句简短提示"
}

示例：
参考表达：我希望能再尝试一次，这次能有更好的结果。
正确输出思路：
challenge_sentence: "我希望能再尝试一次，这次能有更好的结果。"
answers: ["有更好的结果"]
masked_sentence_parts: ["我希望能再尝试一次，这次能", "。"]

原始语言：${sourceLangName}
目标语言：${targetLangName}
参考表达：
${sourceText}
`
        : `
You are a strict exercise generator for a language learning product.

Create one stable fill-in-the-blank exercise in ${targetLangName}.

Rules:
1. Create one natural sentence in ${targetLangName}.
2. The sentence should be close in meaning to the reference expression.
3. Remove 2 to 4 continuous keywords or short phrases from the sentence.
4. Every answer must appear exactly inside challenge_sentence as a continuous substring.
5. masked_sentence_parts length must equal blanks_count + 1.
6. choices must include all answers plus distractors.
7. Do not return markdown. Return JSON only.

Return this JSON:
{
  "mode": "multi_blank",
  "challenge_sentence": "complete sentence",
  "masked_sentence_parts": ["part before blank 1", "part between blank 1 and 2", "part after last blank"],
  "blanks_count": 3,
  "choices": ["...", "...", "..."],
  "answers": ["...", "...", "..."],
  "tip": "short hint"
}

Source language: ${sourceLangName}
Target language: ${targetLangName}
Reference expression:
${sourceText}
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a strict language exercise generator. Return valid JSON only. Answers must be exact substrings of the challenge sentence.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const content = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)

    const normalized =
      targetLang === 'zh'
        ? normalizeChineseChallenge(parsed, sourceText)
        : normalizeMultiBlankChallenge(parsed, sourceText)

    return NextResponse.json(normalized)
  } catch (error) {
    console.error('challenge error:', error)
    return NextResponse.json({ error: '挑战生成失败' }, { status: 500 })
  }
}