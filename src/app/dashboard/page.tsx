'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type MeResponse = {
  authenticated: boolean
  user: {
    id: string
    email: string
    is_vip: boolean
    vip_expires_at?: string | null
    plan_type: string
    daily_quota: number
  } | null
  usage: {
    today_full_translate_count: number
    remaining_full_translate_count: number | 'unlimited'
  } | null
}

type TranslateResponse = {
  mode: 'full' | 'limited'
  data: {
    basic?: string
    natural?: string
    native?: string
    keywords?: string[]
    pinyin?: string
  }
  usage: {
    today_full_translate_count: number
    remaining_full_translate_count: number | 'unlimited'
  }
  paywall: {
    show: boolean
    title: string
    message: string
  } | null
}

const LANGUAGE_OPTIONS = [
  { label: 'English', value: 'en' },
  { label: 'Hindi', value: 'hi' },
  { label: 'Indonesian', value: 'id' },
  { label: 'Vietnamese', value: 'vi' },
  { label: 'Thai', value: 'th' },
  { label: 'Filipino', value: 'fil' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' },
  { label: 'Chinese', value: 'zh' },
]

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loadingMe, setLoadingMe] = useState(true)
  const [me, setMe] = useState<MeResponse | null>(null)

  const [text, setText] = useState('')
  const [lang, setLang] = useState('en')

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<TranslateResponse['data'] | null>(null)
  const [mode, setMode] = useState<'full' | 'limited' | null>(null)
  const [usage, setUsage] = useState<TranslateResponse['usage'] | null>(null)
  const [paywall, setPaywall] = useState<TranslateResponse['paywall'] | null>(null)
  const [error, setError] = useState('')

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
        setMe(null)
        setLoadingMe(false)
        router.push('/login')
        return
      }

      setMe(json)
      setUsage(json.usage || null)
    } catch {
      setError('获取用户信息失败')
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

    router.push('/login')
    router.refresh()
  }

  async function handleTranslate() {
    if (!text.trim()) {
      setError('请输入文本')
      return
    }

    setSubmitting(true)
    setError('')
    setPaywall(null)

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          lang,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json?.error || '翻译失败')
        return
      }

      const data = json as TranslateResponse

      setMode(data.mode)
      setResult(data.data)
      setUsage(data.usage)
      setPaywall(data.paywall || null)

      // 同步更新顶部 me 状态里的 usage 显示
      setMe((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          usage: data.usage,
        }
      })
    } catch {
      setError('请求失败，请稍后再试')
    } finally {
      setSubmitting(false)
    }
  }

  function renderRemainingQuota() {
    const remaining = usage?.remaining_full_translate_count

    if (remaining === 'unlimited') return '无限'
    if (typeof remaining === 'number') return `${remaining} 次`
    return '--'
  }

  if (loadingMe) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="text-sm text-gray-600">加载中...</div>
      </div>
    )
  }

  if (!me?.authenticated || !me.user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="border rounded-2xl p-6 bg-white">
          <h1 className="text-xl font-semibold mb-3">请先登录</h1>
          <p className="text-sm text-gray-600 mb-4">
            登录后才能保存学习记录、使用每日额度和会员功能。
          </p>
          <a
            href="/login"
            className="inline-block rounded-xl border px-4 py-2"
          >
            去登录
          </a>
        </div>
      </div>
    )
  }

  const isVip = !!me.user.is_vip

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* 顶部状态条 */}
      <div className="border rounded-2xl p-4 bg-white flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1 text-sm">
          <div>
            <span className="text-gray-500">邮箱：</span>
            <span className="font-medium">{me.user.email}</span>
          </div>
          <div>
            <span className="text-gray-500">计划：</span>
            <span className="font-medium">{isVip ? 'VIP' : 'Free'}</span>
          </div>
          <div>
            <span className="text-gray-500">今日完整训练剩余：</span>
            <span className="font-medium">{renderRemainingQuota()}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href="/pricing"
            className="rounded-xl border px-4 py-2 text-sm"
          >
            升级 VIP
          </a>
          <button
            onClick={handleSignOut}
            className="rounded-xl border px-4 py-2 text-sm"
          >
            退出登录
          </button>
        </div>
      </div>

      {/* 弱提示 */}
      {!isVip && usage?.remaining_full_translate_count === 1 ? (
        <div className="border rounded-2xl p-4 bg-yellow-50">
          <div className="font-medium mb-1">你今天还剩 1 次完整训练</div>
          <div className="text-sm text-gray-700">
            升级 VIP 可无限使用完整翻译、关键词强化和影子跟读。
          </div>
        </div>
      ) : null}

      {/* 输入区 */}
      <div className="border rounded-2xl p-5 bg-white space-y-4">
        <h1 className="text-xl font-semibold">中文表达训练</h1>

        <div className="space-y-2">
          <label className="block text-sm text-gray-600">你的原始语言</label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="w-full rounded-xl border px-3 py-2"
          >
            {LANGUAGE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-600">输入一句你想表达的话</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="例如：I want to go to the market tomorrow morning."
            className="w-full min-h-[140px] rounded-2xl border px-4 py-3"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleTranslate}
            disabled={submitting}
            className="rounded-xl bg-black text-white px-5 py-2.5 text-sm disabled:opacity-60"
          >
            {submitting ? '生成中...' : '开始训练'}
          </button>

          <button
            onClick={() => {
              setText('')
              setResult(null)
              setMode(null)
              setPaywall(null)
              setError('')
            }}
            className="rounded-xl border px-5 py-2.5 text-sm"
          >
            清空
          </button>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      {/* 超额 / 升级卡片 */}
      {paywall?.show ? (
        <div className="border rounded-2xl p-5 bg-orange-50">
          <div className="text-lg font-semibold mb-2">{paywall.title}</div>
          <div className="text-sm text-gray-700 mb-4">{paywall.message}</div>

          <div className="grid gap-2 text-sm text-gray-800 mb-4">
            <div>• 无限完整翻译</div>
            <div>• natural / native 表达</div>
            <div>• 关键词强化</div>
            <div>• 拼音强化</div>
            <div>• 影子跟读</div>
            <div>• 情景挑战</div>
          </div>

          <a
            href="/pricing"
            className="inline-block rounded-xl bg-black text-white px-4 py-2 text-sm"
          >
            立即升级 VIP
          </a>
        </div>
      ) : null}

      {/* 结果区 */}
      {result ? (
        <div className="border rounded-2xl p-5 bg-white space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">训练结果</h2>
            <span className="text-xs rounded-full border px-3 py-1">
              {mode === 'full' ? '完整模式' : '受限模式'}
            </span>
          </div>

          <div className="space-y-4">
            <div className="border rounded-2xl p-4">
              <div className="text-sm text-gray-500 mb-2">Basic</div>
              <div className="text-base">{result.basic || '-'}</div>
            </div>

            {mode === 'full' ? (
              <>
                <div className="border rounded-2xl p-4">
                  <div className="text-sm text-gray-500 mb-2">Natural</div>
                  <div className="text-base">{result.natural || '-'}</div>
                </div>

                <div className="border rounded-2xl p-4">
                  <div className="text-sm text-gray-500 mb-2">Native</div>
                  <div className="text-base">{result.native || '-'}</div>
                </div>
              </>
            ) : null}

            <div className="border rounded-2xl p-4">
              <div className="text-sm text-gray-500 mb-2">Pinyin</div>
              <div className="text-base">{result.pinyin || '-'}</div>
            </div>

            <div className="border rounded-2xl p-4">
              <div className="text-sm text-gray-500 mb-2">Keywords</div>
              {result.keywords && result.keywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {result.keywords.map((item, idx) => (
                    <span
                      key={`${item}-${idx}`}
                      className="rounded-full border px-3 py-1 text-sm"
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
  )
}