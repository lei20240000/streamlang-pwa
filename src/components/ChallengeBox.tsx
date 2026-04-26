'use client'

import { useEffect, useMemo, useState } from 'react'

type ChallengePayload = {
  mode: 'single_blank_zh' | 'multi_blank'
  challenge_sentence: string
  masked_sentence_parts: string[]
  blanks_count: number
  choices: string[]
  answers: string[]
  tip: string
}

type Props = {
  sourceText: string
  sourceLang: string
  targetLang: string
}

export default function ChallengeBox({
  sourceText,
  sourceLang,
  targetLang,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [payload, setPayload] = useState<ChallengePayload | null>(null)
  const [selectedWords, setSelectedWords] = useState<string[]>([])
  const [checked, setChecked] = useState(false)

  async function loadChallenge() {
    if (!sourceText.trim()) return

    setLoading(true)
    setError('')
    setPayload(null)
    setSelectedWords([])
    setChecked(false)

    try {
      const res = await fetch('/api/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceText, sourceLang, targetLang }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || '挑战生成失败')
      }

      const blanksCount = Math.max(1, Number(json.blanks_count || 1))

      setPayload({
        mode: json.mode || (targetLang === 'zh' ? 'single_blank_zh' : 'multi_blank'),
        challenge_sentence: json.challenge_sentence || '',
        masked_sentence_parts: Array.isArray(json.masked_sentence_parts)
          ? json.masked_sentence_parts
          : ['', ''],
        blanks_count: blanksCount,
        choices: Array.isArray(json.choices) ? json.choices : [],
        answers: Array.isArray(json.answers) ? json.answers : [],
        tip: json.tip || '先看句子整体意思，再填关键词。',
      })

      setSelectedWords(Array(blanksCount).fill(''))
    } catch (err) {
      setError(err instanceof Error ? err.message : '挑战生成失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadChallenge()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceText, sourceLang, targetLang])

  const usedWordCountMap = useMemo(() => {
    const map = new Map<string, number>()

    for (const word of selectedWords) {
      if (!word) continue
      map.set(word, (map.get(word) || 0) + 1)
    }

    return map
  }, [selectedWords])

  const allCorrect = useMemo(() => {
    if (!payload) return false
    if (selectedWords.length !== payload.answers.length) return false

    return selectedWords.every((word, index) => {
      return word === payload.answers[index]
    })
  }, [payload, selectedWords])

  const hasEmptyBlank = selectedWords.some((item) => !item)

  function handlePick(word: string) {
    if (!payload) return

    const emptyIndex = selectedWords.findIndex((item) => !item)
    if (emptyIndex === -1) return

    const next = [...selectedWords]
    next[emptyIndex] = word

    setSelectedWords(next)
    setChecked(false)
  }

  function handleClearBlank(index: number) {
    const next = [...selectedWords]
    next[index] = ''

    setSelectedWords(next)
    setChecked(false)
  }

  function handleCheck() {
    setChecked(true)
  }

  function isCorrectAt(index: number) {
    if (!payload) return false
    return selectedWords[index] === payload.answers[index]
  }

  function resetCurrent() {
    if (!payload) return

    setSelectedWords(Array(payload.blanks_count).fill(''))
    setChecked(false)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
        <div className="text-sm font-medium text-[var(--fg)]">情景挑战</div>

        <div className="mt-1 text-sm leading-7 text-[var(--fg-muted)]">
          {targetLang === 'zh'
            ? '从一个自然中文句子里找回缺失短语，训练你对表达结构的记忆。'
            : 'Choose the missing keywords and rebuild the sentence in the right order.'}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-4 text-sm text-[var(--fg-muted)]">
          正在生成挑战...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {payload ? (
        <>
          <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
            <div className="mb-3 text-sm text-[var(--fg-muted)]">填空句子</div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4 text-lg leading-9 text-[var(--fg)]">
              {payload.masked_sentence_parts.map((part, index) => (
                <span key={`part-${index}`}>
                  <span>{part}</span>

                  {index < payload.blanks_count ? (
                    <button
                      type="button"
                      onClick={() => handleClearBlank(index)}
                      className={`mx-1 inline-flex min-h-[36px] min-w-[96px] items-center justify-center rounded-xl border px-3 py-1 text-base font-medium transition ${
                        checked
                          ? isCorrectAt(index)
                            ? 'border-green-300 bg-green-50 text-green-700'
                            : 'border-red-300 bg-red-50 text-red-700'
                          : selectedWords[index]
                            ? 'border-black bg-white text-[var(--fg)]'
                            : 'border-dashed border-gray-300 bg-white text-gray-400'
                      }`}
                    >
                      {selectedWords[index] || '____'}
                    </button>
                  ) : null}
                </span>
              ))}
            </div>

            <div className="mt-3 text-sm text-[var(--fg-muted)]">
              {payload.tip}
            </div>

            {checked ? (
              <div
                className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${
                  allCorrect
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-orange-200 bg-orange-50 text-orange-700'
                }`}
              >
                {allCorrect
                  ? '正确。这个表达可以进入下一轮复习。'
                  : '还差一点。看参考答案后，再重新填一遍。'}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
            <div className="text-sm text-[var(--fg-muted)]">可选项</div>

            <div className="mt-3 flex flex-wrap gap-2">
              {payload.choices.map((choice, index) => {
                const usedCount = usedWordCountMap.get(choice) || 0
                const answerNeedCount = payload.answers.filter((a) => a === choice).length
                const maxAllowed = Math.max(answerNeedCount, 1)
                const disabled = usedCount >= maxAllowed

                return (
                  <button
                    key={`${choice}-${index}`}
                    type="button"
                    onClick={() => handlePick(choice)}
                    disabled={disabled}
                    className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--fg)] transition hover:bg-[var(--soft)] disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    {choice}
                  </button>
                )
              })}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCheck}
                disabled={hasEmptyBlank}
                className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                检查答案
              </button>

              <button
                type="button"
                onClick={resetCurrent}
                className="rounded-2xl border border-[var(--border)] px-5 py-3 text-sm font-medium hover:bg-[var(--soft)]"
              >
                清空填空
              </button>

              <button
                type="button"
                onClick={loadChallenge}
                className="rounded-2xl border border-[var(--border)] px-5 py-3 text-sm font-medium hover:bg-[var(--soft)]"
              >
                换一题
              </button>
            </div>
          </div>

          {checked ? (
            <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <div className="text-sm text-[var(--fg-muted)]">参考答案</div>

              <div className="mt-2 text-base leading-8 text-[var(--fg)]">
                {payload.challenge_sentence}
              </div>

              {payload.answers.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {payload.answers.map((answer, index) => (
                    <span
                      key={`${answer}-${index}`}
                      className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-700"
                    >
                      {answer}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}