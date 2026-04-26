'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AppTopNav from '@/components/AppTopNav'
import SpeakButton from '@/components/SpeakButton'
import type { ReviewResult } from '@/types/wordbook'

type SessionItem = {
  id: string
  prompt: string
  answer: string
  tip: string
}

const fallbackItems: SessionItem[] = [
  {
    id: 'fallback-1',
    prompt: '你能再说一遍吗？',
    answer: 'Could you say that again?',
    tip: '没听清楚时非常常用。',
  },
]

function parseSessionItems(
  mode: string | null,
  singleItemId: string | null,
  singlePrompt: string | null,
  singleAnswer: string | null,
  singleTip: string | null,
  batchItems: string | null
): SessionItem[] {
  if (mode === 'single' && singleItemId && singlePrompt && singleAnswer) {
    return [
      {
        id: singleItemId,
        prompt: singlePrompt,
        answer: singleAnswer,
        tip: singleTip || '来自单词本',
      },
    ]
  }

  if (mode === 'batch' && batchItems) {
    try {
      const decoded = decodeURIComponent(batchItems)
      const parsed = JSON.parse(decoded)

      if (Array.isArray(parsed)) {
        const validItems = parsed.filter(
          (item) =>
            item &&
            typeof item.id === 'string' &&
            typeof item.prompt === 'string' &&
            typeof item.answer === 'string' &&
            typeof item.tip === 'string'
        )

        if (validItems.length > 0) {
          return validItems
        }
      }
    } catch (error) {
      console.error('Failed to parse batch items:', error)
    }
  }

  return fallbackItems
}

export default function ReviewSessionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const mode = searchParams.get('mode')
  const singleItemId = searchParams.get('itemId')
  const singlePrompt = searchParams.get('prompt')
  const singleAnswer = searchParams.get('answer')
  const singleTip = searchParams.get('tip')
  const batchItems = searchParams.get('items')

  const sessionItems = useMemo(
    () =>
      parseSessionItems(
        mode,
        singleItemId,
        singlePrompt,
        singleAnswer,
        singleTip,
        batchItems
      ),
    [mode, singleItemId, singlePrompt, singleAnswer, singleTip, batchItems]
  )

  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [finished, setFinished] = useState(false)
  const [results, setResults] = useState<ReviewResult[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentItem = sessionItems[currentIndex]
  const total = sessionItems.length
  const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0

  const summary = useMemo(() => {
    return {
      easy: results.filter((r) => r === 'easy').length,
      hard: results.filter((r) => r === 'hard').length,
      forgot: results.filter((r) => r === 'forgot').length,
    }
  }, [results])

  const handleFeedback = async (feedback: ReviewResult) => {
    if (!currentItem?.id) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/review/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: currentItem.id, result: feedback }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '提交失败')
      }

      const newResults = [...results, feedback]
      setResults(newResults)
      setRevealed(false)

      if (currentIndex === total - 1) {
        setFinished(true)
      } else {
        setCurrentIndex((prev) => prev + 1)
      }

      router.refresh()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (!currentItem) {
    return (
      <main className="min-h-screen bg-[#efeff1]">
        <AppTopNav isLoggedIn />
        <div className="mx-auto max-w-6xl px-3 py-6">
          <div className="rounded-[28px] border-2 border-[#1f2430] bg-[#f7f7f8] p-8 text-center">
            <h1 className="text-2xl font-bold text-[#111827]">没有可练习内容</h1>
            <p className="mt-2 text-[#6b7280]">请先从单词本或复习页进入。</p>
            <Link
              href="/wordbook"
              className="mt-4 inline-flex rounded-full border-2 border-black bg-black px-5 py-2.5 text-sm font-semibold text-white"
            >
              去单词本
            </Link>
          </div>
        </div>
      </main>
    )
  }

  if (finished) {
    return (
      <main className="min-h-screen bg-[#efeff1]">
        <AppTopNav isLoggedIn />

        <div className="mx-auto max-w-6xl px-3 py-4 md:px-6 md:py-6">
          <section className="rounded-[28px] border-2 border-[#1f2430] bg-[#f7f7f8] p-6 text-center md:rounded-[36px] md:p-10">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#6b7280] md:text-sm">
              REVIEW COMPLETE
            </p>
            <h1 className="mt-2 text-2xl font-extrabold text-[#111827] md:mt-3 md:text-4xl">
              本轮复习完成
            </h1>
            <p className="mt-3 text-sm text-[#6b7280] md:text-lg">
              结果已保存。
            </p>

            <div className="mt-6 grid gap-3 md:mt-8 md:grid-cols-3 md:gap-4">
              <SummaryCard title="简单" value={summary.easy} />
              <SummaryCard title="较难" value={summary.hard} />
              <SummaryCard title="忘记了" value={summary.forgot} />
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2 md:mt-8 md:gap-3">
              <Link
                href="/review"
                className="rounded-full border-2 border-black bg-black px-5 py-2.5 text-sm font-semibold text-white"
              >
                返回复习页
              </Link>
              <Link
                href="/wordbook"
                className="rounded-full border-2 border-[#1f2430] bg-white px-5 py-2.5 text-sm font-semibold text-[#111827]"
              >
                返回单词本
              </Link>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#efeff1]">
      <AppTopNav isLoggedIn />

      <div className="mx-auto max-w-6xl px-3 py-4 md:px-6 md:py-6">
        <div className="space-y-4 md:space-y-6">
          <section className="rounded-[28px] border-2 border-[#1f2430] bg-[#f7f7f8] p-5 md:rounded-[36px] md:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-[#6b7280] md:text-sm">
                  MEMORY REVIEW
                </p>
                <h1 className="mt-2 text-2xl font-extrabold text-[#111827] md:text-3xl">
                  记忆复习
                </h1>
                <p className="mt-2 text-sm text-[#6b7280] md:text-base">
                  根据中文回忆英文表达，再判断掌握程度。
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/review"
                  className="rounded-full border-2 border-[#1f2430] bg-white px-4 py-2 text-sm font-semibold text-[#111827]"
                >
                  返回复习页
                </Link>
                <Link
                  href="/wordbook"
                  className="rounded-full border-2 border-[#1f2430] bg-white px-4 py-2 text-sm font-semibold text-[#111827]"
                >
                  打开单词本
                </Link>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border-2 border-[#1f2430] bg-[#f7f7f8] p-4 md:rounded-[36px] md:p-6">
            <div className="flex items-center justify-between">
              <p className="text-base font-bold text-[#111827] md:text-lg">
                进度：{currentIndex + 1} / {total}
              </p>
              <p className="text-xs font-semibold text-[#6b7280] md:text-sm">
                当前模式：记忆复习
              </p>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full border-2 border-[#1f2430] bg-white md:mt-4 md:h-4">
              <div
                className="h-full rounded-full bg-black transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </section>

          <section className="rounded-[28px] border-2 border-[#1f2430] bg-[#f7f7f8] p-5 md:rounded-[36px] md:p-8">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#6b7280] md:text-sm">
              回忆下面这句表达
            </p>

            <div className="mt-5 rounded-[24px] border-2 border-[#1f2430] bg-white p-6 text-center md:mt-6 md:rounded-[32px] md:p-10">
              <p className="text-2xl font-extrabold text-[#111827] md:text-5xl">
                {currentItem.prompt}
              </p>
            </div>

            {!revealed ? (
              <div className="mt-6 flex justify-center md:mt-8">
                <button
                  onClick={() => setRevealed(true)}
                  className="rounded-full border-2 border-black bg-black px-6 py-3 text-sm font-semibold text-white md:px-8 md:text-base"
                >
                  显示答案
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-4 md:mt-8 md:space-y-5">
                <div className="rounded-[24px] border-2 border-[#1f2430] bg-white p-5 md:rounded-[32px] md:p-6">
                  <p className="text-xs font-semibold text-[#6b7280] md:text-sm">答案</p>
                  <p className="mt-2 text-2xl font-extrabold text-[#111827] md:mt-3 md:text-3xl">
                    {currentItem.answer}
                  </p>
                  <p className="mt-3 text-sm text-[#6b7280] md:mt-4 md:text-base">
                    {currentItem.tip}
                  </p>

                  <div className="mt-4">
                    <SpeakButton text={currentItem.answer} label="播放答案" />
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border-2 border-[#b91c1c] bg-[#fee2e2] px-4 py-3 text-sm font-medium text-[#b91c1c]">
                    {error}
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-3 md:gap-4">
                  <button
                    onClick={() => handleFeedback('easy')}
                    disabled={submitting}
                    className="rounded-[22px] border-2 border-[#166534] bg-[#dcfce7] px-5 py-3 text-sm font-semibold text-[#166534] disabled:opacity-60"
                  >
                    {submitting ? '提交中...' : '简单'}
                  </button>
                  <button
                    onClick={() => handleFeedback('hard')}
                    disabled={submitting}
                    className="rounded-[22px] border-2 border-[#b45309] bg-[#fef3c7] px-5 py-3 text-sm font-semibold text-[#b45309] disabled:opacity-60"
                  >
                    {submitting ? '提交中...' : '较难'}
                  </button>
                  <button
                    onClick={() => handleFeedback('forgot')}
                    disabled={submitting}
                    className="rounded-[22px] border-2 border-[#b91c1c] bg-[#fee2e2] px-5 py-3 text-sm font-semibold text-[#b91c1c] disabled:opacity-60"
                  >
                    {submitting ? '提交中...' : '忘记了'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-[24px] border-2 border-[#1f2430] bg-white p-5 md:rounded-[32px] md:p-6">
      <p className="text-xs font-semibold text-[#6b7280] md:text-sm">{title}</p>
      <p className="mt-2 text-2xl font-extrabold text-[#111827] md:mt-3 md:text-4xl">{value}</p>
    </div>
  )
}
