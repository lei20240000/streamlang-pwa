'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AppTopNav from '@/components/AppTopNav'
import SpeakButton from '@/components/SpeakButton'

type AnswerStatus = 'idle' | 'remembered' | 'forgot' | 'difficult'

function getParam(searchParams: URLSearchParams, keys: string[]) {
  for (const key of keys) {
    const value = searchParams.get(key)
    if (value && value.trim()) return value.trim()
  }

  return ''
}

export default function ReviewSessionClient() {
  const searchParams = useSearchParams()

  const item = useMemo(() => {
    const text = getParam(searchParams, [
      'text',
      'word',
      'phrase',
      'sentence',
      'target',
    ])
    const meaning = getParam(searchParams, ['meaning', 'translation', 'answer'])
    const original = getParam(searchParams, ['original', 'source', 'sourceText'])
    const type = getParam(searchParams, ['type']) || 'sentence'
    const id = getParam(searchParams, ['id', 'itemId'])

    return {
      id,
      text,
      meaning,
      original,
      type,
    }
  }, [searchParams])

  const [showAnswer, setShowAnswer] = useState(false)
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>('idle')
  const [notice, setNotice] = useState('')

  const hasItem = !!item.text

  function handleRemembered() {
    setAnswerStatus('remembered')
    setNotice('已标记为：记住了。现在可以返回复习列表继续下一条。')
  }

  function handleForgot() {
    setAnswerStatus('forgot')
    setNotice('已标记为：还没记住。建议再听一遍并跟读。')
  }

  function handleDifficult() {
    setAnswerStatus('difficult')
    setNotice('已标记为：困难项。后续可以优先复习这条。')
  }

  function resetRecall() {
    setShowAnswer(false)
    setAnswerStatus('idle')
    setNotice('')
  }

  function getStatusText() {
    if (answerStatus === 'remembered') return '记住了'
    if (answerStatus === 'forgot') return '还没记住'
    if (answerStatus === 'difficult') return '困难项'
    return '未检查'
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <AppTopNav isLoggedIn />

      <div className="mx-auto max-w-5xl px-3 py-4 md:px-6 md:py-8">
        <div className="space-y-4 md:space-y-5">
          <section className="app-card p-4 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-[var(--fg-muted)]">
                  REVIEW SESSION
                </p>

                <h1 className="mt-2 text-2xl font-extrabold md:text-4xl">
                  复习
                </h1>

                <p className="mt-2 text-sm leading-6 text-[var(--fg-muted)] md:mt-3 md:leading-7">
                  先回忆，再看答案。重复比一次记住更重要。
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/review"
                  className="inline-flex items-center justify-center rounded-2xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium hover:bg-[var(--soft)]"
                >
                  返回复习
                </Link>

                <Link
                  href="/wordbook"
                  className="inline-flex items-center justify-center rounded-2xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium hover:bg-[var(--soft)]"
                >
                  返回单词本
                </Link>
              </div>
            </div>
          </section>

          {!hasItem ? (
            <section className="app-card p-6 text-center">
              <h2 className="text-xl font-bold">没有复习内容</h2>

              <p className="mt-3 text-sm leading-7 text-[var(--fg-muted)]">
                当前链接里没有带入复习条目。请从单词本或复习页点击“练习这条”进入。
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Link
                  href="/wordbook"
                  className="inline-flex items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white"
                >
                  去单词本
                </Link>

                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-2xl border border-[var(--border)] px-5 py-3 text-sm font-medium hover:bg-[var(--soft)]"
                >
                  去训练台
                </Link>
              </div>
            </section>
          ) : (
            <>
              <section className="app-card p-4 md:p-8">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-medium text-[var(--fg-muted)]">
                    {item.type}
                  </span>

                  <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-medium text-[var(--fg-muted)]">
                    状态：{getStatusText()}
                  </span>
                </div>

                <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-5">
                  <div className="mb-3 text-sm text-[var(--fg-muted)]">
                    请先回忆
                  </div>

                  {!showAnswer ? (
                    <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white p-5">
                      <div className="text-xl font-extrabold leading-relaxed text-[var(--fg)] md:text-3xl">
                        答案已隐藏
                      </div>

                      <p className="mt-3 text-sm leading-6 text-[var(--fg-muted)]">
                        先在脑子里想 3 秒，再点击“显示答案”。
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-extrabold leading-relaxed md:text-4xl">
                        {item.text}
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <SpeakButton text={item.text} label="播放" />

                        {item.original ? (
                          <SpeakButton text={item.original} label="原句发音" />
                        ) : null}
                      </div>
                    </>
                  )}
                </div>

                {showAnswer && item.original ? (
                  <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white p-4">
                    <div className="mb-2 text-sm text-[var(--fg-muted)]">
                      原句
                    </div>
                    <div className="text-sm leading-7 text-[var(--fg)]">
                      {item.original}
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowAnswer(true)}
                    className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white"
                  >
                    显示答案
                  </button>

                  <button
                    type="button"
                    onClick={resetRecall}
                    className="rounded-2xl border border-[var(--border)] px-5 py-3 text-sm font-medium hover:bg-[var(--soft)]"
                  >
                    重新回忆
                  </button>
                </div>
              </section>

              {showAnswer ? (
                <section className="app-card p-4 md:p-8">
                  <div className="mb-3 text-sm text-[var(--fg-muted)]">
                    参考意思
                  </div>

                  <div className="rounded-3xl border border-[var(--border)] bg-white p-5 text-base leading-8 md:text-lg">
                    {item.meaning || '这条内容暂时没有 meaning 字段。'}
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2 md:gap-3">
                    <button
                      type="button"
                      onClick={handleRemembered}
                      className={`rounded-2xl border px-2 py-3 text-xs font-medium md:px-4 md:text-sm ${
                        answerStatus === 'remembered'
                          ? 'border-green-300 bg-green-50 text-green-700'
                          : 'border-[var(--border)] bg-white hover:bg-[var(--soft)]'
                      }`}
                    >
                      我记住了
                    </button>

                    <button
                      type="button"
                      onClick={handleForgot}
                      className={`rounded-2xl border px-2 py-3 text-xs font-medium md:px-4 md:text-sm ${
                        answerStatus === 'forgot'
                          ? 'border-orange-300 bg-orange-50 text-orange-700'
                          : 'border-[var(--border)] bg-white hover:bg-[var(--soft)]'
                      }`}
                    >
                      还没记住
                    </button>

                    <button
                      type="button"
                      onClick={handleDifficult}
                      className={`rounded-2xl border px-2 py-3 text-xs font-medium md:px-4 md:text-sm ${
                        answerStatus === 'difficult'
                          ? 'border-red-300 bg-red-50 text-red-700'
                          : 'border-[var(--border)] bg-white hover:bg-[var(--soft)]'
                      }`}
                    >
                      困难项
                    </button>
                  </div>

                  {notice ? (
                    <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                      {notice}
                    </div>
                  ) : null}

                  <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                    <Link
                      href="/review"
                      className="inline-flex items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white"
                    >
                      返回复习
                    </Link>

                    <Link
                      href="/wordbook"
                      className="inline-flex items-center justify-center rounded-2xl border border-[var(--border)] px-5 py-3 text-sm font-medium hover:bg-[var(--soft)]"
                    >
                      单词本
                    </Link>
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </main>
  )
}