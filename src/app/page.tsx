'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import AppTopNav from '@/components/AppTopNav'

const ShadowingPlayer = dynamic(() => import('@/components/ShadowingPlayer'), {
  ssr: false,
})
const ChallengeBox = dynamic(() => import('@/components/ChallengeBox'), {
  ssr: false,
})

type ResultType = {
  basic?: string
  natural?: string
  native?: string
  keywords?: string[]
  pinyin?: string
  mode?: 'full' | 'limited'
  paywall?: {
    title: string
    message: string
    cta: string
  } | null
}

type TrainingMode = 'shadowing' | 'challenge'

const SOURCE_LANGUAGE_OPTIONS = [
  { label: 'English', value: 'en' },
  { label: '中文', value: 'zh' },
  { label: 'Español', value: 'es' },
  { label: 'Français', value: 'fr' },
  { label: 'Deutsch', value: 'de' },
  { label: 'Português', value: 'pt' },
  { label: 'Русский', value: 'ru' },
  { label: '日本語', value: 'ja' },
  { label: '한국어', value: 'ko' },
  { label: 'हिन्दी', value: 'hi' },
  { label: 'العربية', value: 'ar' },
  { label: 'Bahasa Indonesia', value: 'id' },
  { label: 'Tiếng Việt', value: 'vi' },
  { label: 'ไทย', value: 'th' },
  { label: 'Filipino', value: 'fil' },
  { label: 'Türkçe', value: 'tr' },
  { label: 'Italiano', value: 'it' },
  { label: 'Nederlands', value: 'nl' },
  { label: 'Polski', value: 'pl' },
  { label: 'Українська', value: 'uk' },
  { label: 'Kiswahili', value: 'sw' },
  { label: 'Bahasa Melayu', value: 'ms' },
  { label: 'বাংলা', value: 'bn' },
  { label: 'اردو', value: 'ur' },
  { label: 'தமிழ்', value: 'ta' },
  { label: 'తెలుగు', value: 'te' },
  { label: 'मराठी', value: 'mr' },
  { label: 'ਪੰਜਾਬੀ', value: 'pa' },
  { label: 'فارسی', value: 'fa' },
  { label: 'עברית', value: 'he' },
  { label: 'Română', value: 'ro' },
  { label: 'Ελληνικά', value: 'el' },
  { label: 'Čeština', value: 'cs' },
  { label: 'Magyar', value: 'hu' },
  { label: 'Svenska', value: 'sv' },
  { label: 'Dansk', value: 'da' },
  { label: 'Suomi', value: 'fi' },
  { label: 'Norsk', value: 'no' },
  { label: 'Slovenčina', value: 'sk' },
  { label: 'Български', value: 'bg' },
  { label: 'Català', value: 'ca' },
  { label: 'Hrvatski', value: 'hr' },
  { label: 'Srpski', value: 'sr' },
  { label: 'Slovenščina', value: 'sl' },
  { label: 'Lietuvių', value: 'lt' },
  { label: 'Latviešu', value: 'lv' },
  { label: 'Eesti', value: 'et' },
  { label: 'Македонски', value: 'mk' },
  { label: 'ქართული', value: 'ka' },
  { label: 'Shqip', value: 'sq' },
]

const TARGET_LANGUAGE_OPTIONS = [
  { label: '中文', value: 'zh' },
  { label: 'English', value: 'en' },
  { label: '日本語', value: 'ja' },
  { label: '한국어', value: 'ko' },
  { label: 'Español', value: 'es' },
  { label: 'Français', value: 'fr' },
  { label: 'Deutsch', value: 'de' },
  { label: 'Português', value: 'pt' },
  { label: 'Русский', value: 'ru' },
  { label: 'العربية', value: 'ar' },
  { label: 'हिन्दी', value: 'hi' },
  { label: 'Bahasa Indonesia', value: 'id' },
  { label: 'Tiếng Việt', value: 'vi' },
  { label: 'ไทย', value: 'th' },
  { label: 'Filipino', value: 'fil' },
  { label: 'Kiswahili', value: 'sw' },
  { label: 'Türkçe', value: 'tr' },
  { label: 'Italiano', value: 'it' },
  { label: 'Bahasa Melayu', value: 'ms' },
  { label: 'Nederlands', value: 'nl' },
]

const SHADOWING_RATES = [0.6, 0.6, 0.8, 0.8, 1.0, 1.0]
const CHALLENGE_PREP_RATES = [0.6, 0.8, 1.0]

function getBestSentence(result: ResultType | null) {
  if (!result) return ''
  return result.native || result.natural || result.basic || ''
}

export default function HomePage() {
  const [input, setInput] = useState('')
  const [sourceLang, setSourceLang] = useState('en')
  const [targetLang, setTargetLang] = useState('zh')
  const [result, setResult] = useState<ResultType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showResultModal, setShowResultModal] = useState(false)
  const [trainingMode, setTrainingMode] = useState<TrainingMode>('shadowing')
  const [challengePrepDone, setChallengePrepDone] = useState(false)

  const canSubmit = useMemo(() => input.trim().length > 0 && !loading, [input, loading])
  const displaySentence = useMemo(() => getBestSentence(result), [result])

  async function handleTranslate() {
    if (!input.trim()) {
      setError('请输入一句外语')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)
    setChallengePrepDone(false)

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: input.trim(),
          sourceLang,
          targetLang,
          entry: 'landing_guest',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || '请求失败，请稍后再试')
        return
      }

      setResult(data)
      setTrainingMode('shadowing')
      setShowResultModal(true)
    } catch {
      setError('网络错误，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  function clearAll() {
    setInput('')
    setResult(null)
    setError('')
    setShowResultModal(false)
    setChallengePrepDone(false)
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <AppTopNav isLoggedIn={false} />

      <div className="mx-auto flex max-w-6xl flex-col px-3 py-3 md:px-5 md:py-5">
        <section className="grid gap-3 lg:grid-cols-[1.55fr_0.75fr]">
          <div className="app-card p-4 sm:p-5">
            <div className="mb-3">
              <div className="mb-3 inline-flex rounded-full bg-[var(--trial-bg)] px-3 py-1 text-xs font-semibold text-[var(--trial-fg)]">
                先试 1 次，再决定是否注册
              </div>

              <h1 className="text-[30px] font-extrabold leading-[1.05] tracking-tight sm:text-[38px]">
                不是翻译器，是训练入口
              </h1>
              <p className="mt-2 text-sm text-[var(--fg-muted)] sm:text-[15px]">
                输入一句外语，先试一次完整学习体验。
              </p>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--fg-muted)]">
                  原始语言
                </label>
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-black"
                >
                  {SOURCE_LANGUAGE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--fg-muted)]">
                  目标语言
                </label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-black"
                >
                  {TARGET_LANGUAGE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入一句英文"
                className="min-h-[220px] w-full resize-none rounded-[28px] border border-[var(--border)] bg-[var(--card-2)] px-5 py-4 text-[20px] font-medium text-[var(--fg)] outline-none transition placeholder:text-[#98a2b3] focus:border-black"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleTranslate}
                disabled={!canSubmit}
                className="app-btn-primary px-6 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? '生成中...' : '免费试一次'}
              </button>

              <Link
                href="/signup"
                className="app-btn-secondary px-6 py-3 text-sm font-semibold hover:bg-[var(--soft)]"
              >
                注册领 7 天试用
              </Link>

              <Link
                href="/pricing"
                className="app-btn-secondary px-6 py-3 text-sm font-semibold hover:bg-[var(--soft)]"
              >
                解锁 AI 全功能
              </Link>
            </div>

            {error ? (
              <div className="mt-3 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
                {error}
              </div>
            ) : null}
          </div>

          <aside className="grid gap-3">
            <div className="app-card p-5">
              <h2 className="text-xl font-extrabold sm:text-2xl">注册后有什么</h2>
              <div className="mt-4 space-y-3 text-sm text-[var(--fg-muted)]">
                <div>7 天试用期</div>
                <div>保存训练记录</div>
                <div>继续跟读和挑战</div>
                <div>进入完整训练台</div>
              </div>

              <Link
                href="/signup"
                className="mt-5 inline-flex rounded-full bg-[var(--fg)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                立即注册
              </Link>
            </div>

            <div className="app-card p-5">
              <h2 className="text-lg font-extrabold">一句话说明</h2>
              <div className="mt-3 space-y-2 text-sm text-[var(--fg-muted)]">
                <div>先试一次，再决定是否注册。</div>
                <div>完整训练在 dashboard 中继续进行。</div>
                <div>刷新页面不会增加试用次数。</div>
              </div>

              <Link
                href="/pricing"
                className="mt-5 inline-flex rounded-full border border-[var(--border)] px-5 py-3 text-sm font-semibold hover:bg-[var(--soft)]"
              >
                查看 VIP
              </Link>
            </div>
          </aside>
        </section>
      </div>

      {showResultModal && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3">
          <div className="relative flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 sm:px-6">
              <div>
                <h3 className="text-xl font-extrabold">试用结果</h3>
                <p className="mt-1 text-sm text-[var(--fg-muted)]">
                  先听、再跟读、再挑战。想保存记录，请注册进入完整训练台。
                </p>
              </div>

              <button
                onClick={() => setShowResultModal(false)}
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--soft)]"
              >
                关闭
              </button>
            </div>

            <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[0.95fr_1.05fr]">
              <div className="overflow-y-auto border-b border-[var(--border)] p-4 lg:border-b-0 lg:border-r lg:p-6">
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-2)] p-4">
                    <div className="mb-2 text-sm font-semibold text-[var(--fg-muted)]">基础表达</div>
                    <div className="text-lg leading-8">{result.basic || '-'}</div>
                  </div>

                  <div className="rounded-[24px] border border-[var(--border)] bg-white p-4">
                    <div className="mb-2 text-sm font-semibold text-[var(--fg-muted)]">更自然表达</div>
                    <div className="text-lg leading-8">{result.natural || '-'}</div>
                  </div>

                  <div className="rounded-[24px] border border-[var(--border)] bg-white p-4">
                    <div className="mb-2 text-sm font-semibold text-[var(--fg-muted)]">更地道表达</div>
                    <div className="text-lg leading-8">{result.native || '-'}</div>
                  </div>

                  <div className="rounded-[24px] border border-[var(--border)] bg-white p-4">
                    <div className="mb-2 text-sm font-semibold text-[var(--fg-muted)]">关键词</div>
                    {result.keywords?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {result.keywords.map((item, idx) => (
                          <span
                            key={`${item}-${idx}`}
                            className="rounded-full border border-[var(--border)] bg-[var(--card-2)] px-3 py-1.5 text-sm"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div>-</div>
                    )}
                  </div>

                  {targetLang === 'zh' ? (
                    <div className="rounded-[24px] border border-[var(--border)] bg-white p-4">
                      <div className="mb-2 text-sm font-semibold text-[var(--fg-muted)]">拼音</div>
                      <div className="text-base leading-7">{result.pinyin || '-'}</div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex min-h-0 flex-col overflow-hidden p-4 lg:p-6">
                <div className="mb-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      setTrainingMode('shadowing')
                      setChallengePrepDone(false)
                    }}
                    className={`rounded-full px-5 py-2.5 text-sm font-semibold ${
                      trainingMode === 'shadowing'
                        ? 'bg-black text-white'
                        : 'border border-[var(--border)] bg-white text-[var(--fg)]'
                    }`}
                  >
                    影子跟读
                  </button>

                  <button
                    onClick={() => {
                      setTrainingMode('challenge')
                      setChallengePrepDone(false)
                    }}
                    className={`rounded-full px-5 py-2.5 text-sm font-semibold ${
                      trainingMode === 'challenge'
                        ? 'bg-black text-white'
                        : 'border border-[var(--border)] bg-white text-[var(--fg)]'
                    }`}
                  >
                    情景挑战
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto rounded-[24px] border border-[var(--border)] bg-[var(--card-2)] p-4">
                  {trainingMode === 'shadowing' ? (
                    <ShadowingPlayer
                      text={displaySentence}
                      lang={targetLang}
                      rates={SHADOWING_RATES}
                    />
                  ) : null}

                  {trainingMode === 'challenge' ? (
                    !challengePrepDone ? (
                      <div className="space-y-4">
                        <div className="text-sm text-[var(--fg-muted)]">
                          先热身 3 次，再进入关键词挑战。
                        </div>
                        <ShadowingPlayer
                          text={displaySentence}
                          lang={targetLang}
                          rates={CHALLENGE_PREP_RATES}
                          onComplete={() => setChallengePrepDone(true)}
                        />
                      </div>
                    ) : (
                      <ChallengeBox
                        sourceText={displaySentence}
                        sourceLang={sourceLang}
                        targetLang={targetLang}
                      />
                    )
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/signup"
                    className="rounded-full bg-[var(--fg)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
                  >
                    注册领 7 天试用
                  </Link>
                  <Link
                    href="/dashboard"
                    className="rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold hover:bg-[var(--soft)]"
                  >
                    进入完整训练台
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}