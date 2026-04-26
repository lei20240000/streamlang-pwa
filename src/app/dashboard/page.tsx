'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppTopNav from '@/components/AppTopNav'
import ShadowingPlayer from '@/components/ShadowingPlayer'
import ChallengeBox from '@/components/ChallengeBox'

type MeResponse = {
  authenticated: boolean
  user: {
    id: string
    email: string
    is_vip: boolean
    vip_expires_at?: string | null
    plan_type: string
    daily_quota: number
    trial_started_at?: string | null
    trial_ends_at?: string | null
    is_trial_active?: boolean
  } | null
  usage: {
    today_full_translate_count: number
    remaining_full_translate_count: number | 'unlimited'
  } | null
  error?: string
}

type TranslateResponse = {
  authenticated?: boolean
  plan?: string
  source?: 'guest' | 'free' | 'vip'
  mode: 'full' | 'limited'
  basic?: string
  natural?: string
  native?: string
  keywords?: string[]
  pinyin?: string
  usage?: {
    today_full_translate_count?: number
    remaining_full_translate_count?: number | 'unlimited'
    guest_full_translate_used?: number
    guest_full_translate_limit?: number
    guest_remaining_full_translate_count?: number
  }
  paywall?: {
    title: string
    message: string
    cta: string
  } | null
}

type TrainingMode = 'none' | 'shadowing' | 'challenge'

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

const SHADOWING_RATES = [0.6, 0.6, 0.6, 0.8, 0.8, 0.8, 1.0, 1.0, 1.0, 1.0]
const CHALLENGE_PREP_RATES = [0.6, 0.8, 1.0]

function getDisplaySentence(
  mode: 'full' | 'limited' | null,
  result: TranslateResponse | null
) {
  if (!result) return ''

  if (mode === 'full') {
    return result.native || result.natural || result.basic || ''
  }

  return result.basic || ''
}

function getTargetLanguageLabel(value: string) {
  return TARGET_LANGUAGE_OPTIONS.find((item) => item.value === value)?.label || value
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loadingMe, setLoadingMe] = useState(true)
  const [me, setMe] = useState<MeResponse | null>(null)

  const [text, setText] = useState('')
  const [sourceLang, setSourceLang] = useState('en')
  const [targetLang, setTargetLang] = useState('zh')

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<TranslateResponse | null>(null)
  const [mode, setMode] = useState<'full' | 'limited' | null>(null)
  const [usage, setUsage] = useState<TranslateResponse['usage'] | null>(null)
  const [paywall, setPaywall] = useState<TranslateResponse['paywall'] | null>(null)
  const [error, setError] = useState('')
  const [saveNotice, setSaveNotice] = useState('')

  const [trainingMode, setTrainingMode] = useState<TrainingMode>('none')
  const [challengePrepDone, setChallengePrepDone] = useState(false)

  const isLoggedIn = !!me?.authenticated && !!me?.user
  const isVip = !!me?.user?.is_vip || result?.source === 'vip' || result?.plan === 'vip'
  const isTrial = !!me?.user?.is_trial_active || me?.user?.plan_type === 'trial'

  const displaySentence = useMemo(() => {
    return getDisplaySentence(mode, result)
  }, [mode, result])

  async function loadMe() {
    setLoadingMe(true)
    setError('')

    try {
      const res = await fetch('/api/me', {
        method: 'GET',
        cache: 'no-store',
      })

      const json = await res.json()

      if (!res.ok) {
        setMe({
          authenticated: false,
          user: null,
          usage: null,
        })
        return
      }

      setMe(json)
      setUsage(json.usage || null)
    } catch {
      setMe({
        authenticated: false,
        user: null,
        usage: null,
      })
    } finally {
      setLoadingMe(false)
    }
  }

  useEffect(() => {
    loadMe()
  }, [])

  async function handleSignOut() {
    setError('')

    const { error } = await supabase.auth.signOut()

    if (error) {
      setError(error.message)
      return
    }

    setMe({
      authenticated: false,
      user: null,
      usage: null,
    })

    setUsage(null)
    setResult(null)
    setMode(null)
    setPaywall(null)
    setSaveNotice('')
    setTrainingMode('none')
    setChallengePrepDone(false)

    router.refresh()
  }

  async function saveToWordbook(data: TranslateResponse) {
    if (!isLoggedIn) {
      return
    }

    if (!data.basic && !data.natural && !data.native) {
      return
    }

    try {
      const saveRes = await fetch('/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original: text.trim(),
          basic: data.basic || '',
          natural: data.natural || '',
          native: data.native || '',
          keywords: data.keywords || [],
          pinyin: data.pinyin || '',
          source: 'dashboard',
          scene: 'daily_training',
        }),
      })

      const saveJson = await saveRes.json()

      if (!saveRes.ok) {
        if (saveRes.status === 401) {
          setSaveNotice('登录后可保存到单词本')
          return
        }

        setSaveNotice(saveJson?.error || '已生成，但加入单词本失败')
        return
      }

      if (saveJson?.inserted > 0) {
        setSaveNotice(`已加入单词本（${saveJson.inserted} 条）`)
      } else {
        setSaveNotice(saveJson?.message || '这些内容已在单词本中')
      }
    } catch {
      setSaveNotice('已生成，但加入单词本失败')
    }
  }

  async function handleTranslate() {
    if (!text.trim()) {
      setError('请输入原句')
      return
    }

    setSubmitting(true)
    setError('')
    setSaveNotice('')
    setPaywall(null)
    setTrainingMode('none')
    setChallengePrepDone(false)

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          sourceLang,
          targetLang,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json?.error || '生成失败')
        return
      }

      const data = json as TranslateResponse

      setMode(data.mode)
      setResult(data)
      setUsage(data.usage || null)
      setPaywall(data.paywall || null)

      await saveToWordbook(data)

      await loadMe()
    } catch {
      setError('请求失败，请稍后再试')
    } finally {
      setSubmitting(false)
    }
  }

  function renderRemainingQuota() {
    if (!usage) return '--'

    if (!isLoggedIn && typeof usage.guest_remaining_full_translate_count === 'number') {
      return `${usage.guest_remaining_full_translate_count} 次`
    }

    const remaining = usage.remaining_full_translate_count

    if (remaining === 'unlimited') return '无限'
    if (typeof remaining === 'number') return `${remaining} 次`

    return '--'
  }

  function renderPlanName() {
    if (isVip) return 'VIP'
    if (isTrial) return 'Trial'
    if (isLoggedIn) return 'Free'
    return 'Guest'
  }

  function clearAll() {
    setText('')
    setResult(null)
    setMode(null)
    setPaywall(null)
    setError('')
    setSaveNotice('')
    setTrainingMode('none')
    setChallengePrepDone(false)
  }

  if (loadingMe) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <AppTopNav isLoggedIn={false} />
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="app-card p-6">
            <div className="text-sm text-[var(--fg-muted)]">加载中...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <AppTopNav isLoggedIn={isLoggedIn} email={me?.user?.email || null} />

      <div className="mx-auto max-w-6xl space-y-5 px-3 py-4 md:px-5 md:py-6">
        <div className="app-card px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-[var(--fg-muted)]">身份</span>

              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  isVip
                    ? 'bg-green-100 text-green-700'
                    : isTrial
                      ? 'bg-[var(--trial-bg)] text-[var(--trial-fg)]'
                      : isLoggedIn
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-orange-100 text-orange-700'
                }`}
              >
                {renderPlanName()}
              </span>

              <span className="text-gray-300">|</span>

              <span className="text-[var(--fg-muted)]">
                {isLoggedIn ? '今日完整训练剩余' : '游客完整体验剩余'}
              </span>

              <span className="font-semibold">{renderRemainingQuota()}</span>

              {isLoggedIn ? (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-[var(--fg-muted)]">今日已用</span>
                  <span className="font-semibold">
                    {usage?.today_full_translate_count ?? '--'}
                  </span>
                </>
              ) : null}
            </div>

            <div className="text-sm text-[var(--fg-muted)]">
              目标：把原句变成更适合学习、跟读和复用的
              <span className="font-medium text-[var(--fg)]">
                {' '}
                {getTargetLanguageLabel(targetLang)}
              </span>
              表达。
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            {!isVip && isLoggedIn && usage?.remaining_full_translate_count === 1 ? (
              <div className="rounded-3xl border border-[var(--warn-border)] bg-[var(--warn-bg)] p-4 text-sm text-[var(--warn-fg)] shadow-sm">
                你今天还剩 1 次完整训练。升级 VIP 可无限使用完整训练链路。
              </div>
            ) : null}

            {!isLoggedIn ? (
              <div className="rounded-3xl border border-[#dbeafe] bg-[#eff6ff] p-4 text-sm text-[#1d4ed8] shadow-sm">
                游客可先体验 1 次完整训练。想保存记录和获得每日免费额度，再登录即可。
              </div>
            ) : null}

            <div className="app-card space-y-5 p-4 sm:p-5">
              <div>
                <h1 className="text-xl font-semibold sm:text-2xl">表达训练台</h1>
                <p className="mt-1 text-sm text-[var(--fg-muted)]">
                  输入原句，系统会生成更适合学习的目标语表达，再带你进入跟读或挑战。
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm text-[var(--fg-muted)]">
                    原始语言
                  </label>

                  <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="w-full rounded-2xl border border-[var(--border)] bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                  >
                    {SOURCE_LANGUAGE_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm text-[var(--fg-muted)]">
                    目标语言
                  </label>

                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full rounded-2xl border border-[var(--border)] bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                  >
                    {TARGET_LANGUAGE_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm text-[var(--fg-muted)]">
                  输入原句
                </label>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="例如：I don't want to work tomorrow because it's too troublesome."
                  className="min-h-[180px] w-full resize-none rounded-3xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10 sm:text-base"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleTranslate}
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-2xl bg-black px-5 py-2.5 text-sm text-white shadow-sm disabled:opacity-60"
                >
                  {submitting ? '生成中...' : '生成学习表达'}
                </button>

                <button
                  onClick={clearAll}
                  className="inline-flex items-center justify-center rounded-2xl border border-[var(--border)] px-5 py-2.5 text-sm hover:bg-[var(--soft)]"
                >
                  清空
                </button>

                {!isVip ? (
                  <a
                    href="/pricing"
                    className="inline-flex items-center justify-center rounded-2xl border border-[var(--border)] px-5 py-2.5 text-sm hover:bg-[var(--soft)]"
                  >
                    查看会员
                  </a>
                ) : null}

                {isLoggedIn ? (
                  <button
                    onClick={handleSignOut}
                    className="inline-flex items-center justify-center rounded-2xl border border-[var(--border)] px-5 py-2.5 text-sm hover:bg-[var(--soft)]"
                  >
                    退出
                  </button>
                ) : null}
              </div>

              {saveNotice ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  {saveNotice}
                </div>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
                  {error}
                </div>
              ) : null}
            </div>

            {paywall ? (
              <div className="rounded-3xl border border-[var(--warn-border)] bg-[var(--warn-bg)] p-5 shadow-sm">
                <div className="mb-2 text-lg font-semibold">{paywall.title}</div>

                <div className="mb-4 text-sm text-[var(--fg)]">
                  {paywall.message}
                </div>

                <div className="mb-5 grid gap-2 text-sm text-[var(--fg)]">
                  <div>• 无限完整训练</div>
                  <div>• 更自然的表达层级</div>
                  <div>• 固定节奏跟读路径</div>
                  <div>• 新句子关键词填空挑战</div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {!isLoggedIn ? (
                    <a
                      href="/signup"
                      className="inline-flex items-center justify-center rounded-2xl bg-black px-4 py-2.5 text-sm text-white"
                    >
                      注册领 7 天试用
                    </a>
                  ) : null}

                  <a
                    href="/pricing"
                    className="inline-flex items-center justify-center rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm hover:bg-[var(--soft)]"
                  >
                    查看会员方案
                  </a>
                </div>
              </div>
            ) : null}

            {result ? (
              <div className="app-card space-y-5 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold sm:text-xl">
                      学习表达结果
                    </h2>

                    <p className="mt-1 text-sm text-[var(--fg-muted)]">
                      先看层级差异，再进入单一路径训练。
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${
                      mode === 'full'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {mode === 'full' ? '完整模式' : '受限模式'}
                  </span>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4">
                    <div className="mb-2 text-sm text-[var(--fg-muted)]">
                      基础版
                    </div>

                    <div className="text-lg leading-8">{result.basic || '-'}</div>
                  </div>

                  {mode === 'full' ? (
                    <>
                      <div className="rounded-3xl border border-[var(--border)] bg-white p-4">
                        <div className="mb-2 text-sm text-[var(--fg-muted)]">
                          自然版
                        </div>

                        <div className="text-lg leading-8">
                          {result.natural || '-'}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-[var(--border)] bg-white p-4">
                        <div className="mb-2 text-sm text-[var(--fg-muted)]">
                          母语感版
                        </div>

                        <div className="text-lg leading-8">
                          {result.native || '-'}
                        </div>
                      </div>
                    </>
                  ) : null}

                  {targetLang === 'zh' ? (
                    <div className="rounded-3xl border border-[var(--border)] bg-white p-4">
                      <div className="mb-2 text-sm text-[var(--fg-muted)]">
                        拼音辅助
                      </div>

                      <div className="text-base sm:text-lg">
                        {result.pinyin || '-'}
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-3xl border border-[var(--border)] bg-white p-4">
                    <div className="mb-3 text-sm text-[var(--fg-muted)]">
                      关键词
                    </div>

                    {result.keywords && result.keywords.length > 0 ? (
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
                      <div className="text-base">-</div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-5">
            <div className="app-card p-4 sm:p-5">
              <div className="mb-4">
                <div className="text-lg font-semibold">训练路径</div>

                <div className="mt-1 text-sm text-[var(--fg-muted)]">
                  不是一次性翻译，而是把表达转成可练、可记、可复用的学习过程。
                </div>
              </div>

              {!result?.mode || !displaySentence ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4 text-sm text-[var(--fg-muted)]">
                  先生成一次学习表达，再选择训练路径。
                </div>
              ) : null}

              {result?.mode === 'full' && displaySentence ? (
                <div className="mb-5 grid gap-3 md:grid-cols-2">
                  <button
                    onClick={() => {
                      setTrainingMode('shadowing')
                      setChallengePrepDone(false)
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      trainingMode === 'shadowing'
                        ? 'border-black bg-[var(--soft)]'
                        : 'border-[var(--border)] hover:bg-[var(--soft)]'
                    }`}
                  >
                    <div className="font-medium">影子跟读</div>

                    <div className="mt-1 text-sm text-[var(--fg-muted)]">
                      0.6×3 次 + 0.8×3 次 + 1.0×4 次
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setTrainingMode('challenge')
                      setChallengePrepDone(false)
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      trainingMode === 'challenge'
                        ? 'border-black bg-[var(--soft)]'
                        : 'border-[var(--border)] hover:bg-[var(--soft)]'
                    }`}
                  >
                    <div className="font-medium">情景挑战</div>

                    <div className="mt-1 text-sm text-[var(--fg-muted)]">
                      先 0.6×1 + 0.8×1 + 1.0×1，再做关键词混选填空
                    </div>
                  </button>
                </div>
              ) : null}

              {trainingMode === 'shadowing' &&
              result?.mode === 'full' &&
              displaySentence ? (
                <ShadowingPlayer
                  text={displaySentence}
                  lang={targetLang}
                  rates={SHADOWING_RATES}
                />
              ) : null}

              {trainingMode === 'challenge' &&
              result?.mode === 'full' &&
              displaySentence ? (
                <div className="space-y-5">
                  {!challengePrepDone ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
                      <div className="mb-3 text-sm font-medium">挑战前热身</div>

                      <div className="mb-4 text-sm text-[var(--fg-muted)]">
                        先完成 3 次热身跟读，再进入新句子关键词填空。
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
                  )}
                </div>
              ) : null}

              {trainingMode === 'none' &&
              result?.mode === 'full' &&
              displaySentence ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4 text-sm text-[var(--fg-muted)]">
                  先选一条路径。建议先跟读，再挑战。
                </div>
              ) : null}

              <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
                <div className="mb-2 text-sm font-medium">推荐顺序</div>

                <div className="grid gap-1 text-sm text-[var(--fg-muted)]">
                  <div>1. 先看基础版 / 自然版 / 母语感版差异</div>
                  <div>2. 用固定节奏跟读训练嘴巴和耳朵</div>
                  <div>3. 再做新句子关键词填空，强化复用</div>
                </div>
              </div>
            </div>

            {!isVip ? (
              <div className="rounded-3xl border border-[var(--warn-border)] bg-gradient-to-br from-orange-50 to-white p-5 shadow-sm">
                <div className="mb-2 text-lg font-semibold">为什么升级 VIP</div>

                <div className="mb-4 text-sm text-[var(--fg)]">
                  核心不是多几次生成，而是把完整训练链路真正跑起来。
                </div>

                <div className="mb-5 grid gap-2 text-sm text-[var(--fg)]">
                  <div>• 无限完整训练</div>
                  <div>• 固定节奏多轮跟读</div>
                  <div>• 新句子关键词混选填空挑战</div>
                </div>

                <a
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-2xl bg-black px-4 py-2.5 text-sm text-white"
                >
                  查看会员方案
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}