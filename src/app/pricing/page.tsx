'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppTopNav from '@/components/AppTopNav'

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

const CHECKOUT_LINKS = {
  monthly:
    'https://kingstream.lemonsqueezy.com/checkout/buy/54eec727-1c41-489d-854e-062134ece2a3?enabled=1492290',
  yearly:
    'https://kingstream.lemonsqueezy.com/checkout/buy/fa12c684-19b9-45ba-a6fe-22b222d5abc6?enabled=1492298',
  lifetime:
    'https://kingstream.lemonsqueezy.com/checkout/buy/1d1c8e2a-e5b5-4487-815b-0e8258fa841e?enabled=1492318',
} as const

type PlanId = keyof typeof CHECKOUT_LINKS

const plans: {
  id: PlanId
  name: string
  price: string
  sub: string
  badge: string
  highlight: boolean
  desc: string
  cta: string
}[] = [
  {
    id: 'monthly',
    name: '月付',
    price: '$4.99',
    sub: '适合先试用后继续',
    badge: '',
    highlight: false,
    desc: '低门槛开始，适合先接上完整训练链路再决定是否长期使用。',
    cta: '开通月付 VIP',
  },
  {
    id: 'yearly',
    name: '年付',
    price: '$29.99',
    sub: '最划算，主推方案',
    badge: '推荐',
    highlight: true,
    desc: '适合认真学语言的人，平均每月成本更低，更适合持续训练。',
    cta: '开通年付 VIP',
  },
  {
    id: 'lifetime',
    name: '终身',
    price: '$49.99',
    sub: '一次买断',
    badge: '',
    highlight: false,
    desc: '不想反复续费，长期使用更省心，适合长期学习者。',
    cta: '开通终身 VIP',
  },
]

const featureRows = [
  { feature: '游客试用', free: '1 次', vip: '—' },
  { feature: '注册试用期', free: '7 天', vip: '—' },
  { feature: '完整训练次数', free: '试用期内更多 / 普通免费版每天 3 次', vip: '无限' },
  { feature: 'Basic 表达', free: '支持', vip: '支持' },
  { feature: 'Natural / Native 表达', free: '试用期支持 / 普通免费版受限', vip: '支持' },
  { feature: '关键词强化', free: '基础版', vip: '完整' },
  { feature: '拼音强化', free: '基础版', vip: '完整' },
  { feature: '影子跟读', free: '试用期支持', vip: '完整渐进语速' },
  { feature: '情景挑战', free: '试用期支持', vip: '支持' },
  { feature: '训练记录保存', free: '试用期支持', vip: '支持' },
]

const faqs = [
  {
    q: '免费版、7 天试用和 VIP 有什么区别？',
    a: '游客只能先试 1 次。注册后可领取 7 天试用期，体验更完整的训练链路；试用结束后回到普通免费额度。VIP 则适合长期持续训练，功能和次数都更完整。',
  },
  {
    q: '我适合买月付、年付还是终身？',
    a: '如果你只是先接上完整训练链路，月付就够；如果你打算认真用 3 个月以上，年付更划算；如果你明确会长期学习，终身更省心。',
  },
  {
    q: '付款后会自动开通会员吗？',
    a: '会。登录状态下点击购买时，系统会把你的用户标识一并带给支付系统，支付成功后会自动同步会员状态。',
  },
  {
    q: '为什么必须登录后再付款？',
    a: '因为系统需要把付款订单和你的 StreamLang 账号绑定。未登录付款容易出现付款成功但会员没有自动开通的问题。',
  },
]

function CheckIcon() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black text-[11px] text-white">
      ✓
    </span>
  )
}

function buildCheckoutUrl(params: {
  url: string
  userId: string
  email: string
  planId: PlanId
}) {
  const separator = params.url.includes('?') ? '&' : '?'

  const query = [
    `checkout[custom][user_id]=${encodeURIComponent(params.userId)}`,
    `checkout[custom][email]=${encodeURIComponent(params.email)}`,
    `checkout[custom][plan]=${encodeURIComponent(params.planId)}`,
    `checkout[email]=${encodeURIComponent(params.email)}`,
  ].join('&')

  return `${params.url}${separator}${query}`
}

function formatPlanLabel(planType?: string | null) {
  if (!planType) return 'Free'
  if (planType === 'trial') return '7 天试用'
  if (planType === 'monthly') return '月付 VIP'
  if (planType === 'yearly') return '年付 VIP'
  if (planType === 'lifetime') return '终身 VIP'
  if (planType === 'vip') return 'VIP'
  return planType
}

export default function PricingPage() {
  const router = useRouter()

  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutNotice, setCheckoutNotice] = useState('')

  async function loadMe() {
    setLoading(true)

    try {
      const res = await fetch('/api/me', {
        method: 'GET',
        cache: 'no-store',
      })

      const json = await res.json()

      if (res.ok) {
        setMe(json)
      } else {
        setMe(null)
      }
    } catch {
      setMe(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMe()
  }, [])

  const isVip = !!me?.user?.is_vip
  const isLoggedIn = !!me?.authenticated && !!me?.user
  const isTrial = !!me?.user?.is_trial_active || me?.user?.plan_type === 'trial'

  function goLogin() {
    router.push('/login?next=/pricing')
  }

  function goSignup() {
    router.push('/signup?next=/pricing')
  }

async function goCheckout(planId: PlanId) {
  setCheckoutNotice('')

  if (loading) {
    setCheckoutNotice('正在读取账号状态，请稍等。')
    return
  }

  if (!isLoggedIn || !me?.user?.id || !me?.user?.email) {
    setCheckoutNotice('请先登录或注册，再开通 VIP。这样支付成功后才能自动绑定到你的账号。')
    router.push('/login?next=/pricing')
    return
  }

  try {
    setCheckoutNotice('正在创建支付链接...')

    const res = await fetch('/api/lemonsqueezy-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan: planId,
      }),
    })

    const json = await res.json()

    if (!res.ok || !json?.ok || !json?.url) {
      console.error('[pricing] checkout error:', json)
      setCheckoutNotice(json?.error || '创建支付链接失败，请稍后再试。')
      return
    }

    console.log('[pricing] checkout debug:', json.debug)

    window.location.href = json.url
  } catch (error) {
    console.error('[pricing] checkout unexpected error:', error)
    setCheckoutNotice('创建支付链接失败，请检查网络后重试。')
  }
}

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <AppTopNav isLoggedIn={isLoggedIn} email={me?.user?.email || null} />

      <div className="mx-auto max-w-6xl space-y-8 px-3 py-6 md:px-5 md:py-10">
        <section className="app-card p-6 sm:p-8 lg:p-10">
          <div className="max-w-4xl">
            <div className="mb-4 inline-flex rounded-full bg-[var(--trial-bg)] px-3 py-1 text-xs font-medium text-[var(--trial-fg)]">
              注册即领 7 天试用
            </div>

            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              先试用，再决定是否升级 VIP
            </h1>

            <p className="mt-4 text-sm leading-7 text-[var(--fg-muted)] sm:text-base">
              游客可先试 1 次。注册后可领取
              <span className="font-medium text-[var(--fg)]"> 7 天试用期 </span>
              ，继续跟读、挑战并保存训练记录。VIP 则适合长期持续训练，把完整表达、
              影子跟读和情景挑战真正串起来。
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-2">
                注册即领 7 天试用
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-2">
                保存训练记录
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-2">
                跟读与挑战继续开放
              </div>
            </div>

            {isVip ? (
              <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                你当前已是 {formatPlanLabel(me?.user?.plan_type)}，可继续无限使用完整训练功能。
              </div>
            ) : isTrial ? (
              <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                你当前正在使用 {formatPlanLabel(me?.user?.plan_type)}。如果想长期不断档训练，VIP 更适合。
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-[var(--warn-border)] bg-[var(--warn-bg)] px-4 py-3 text-sm text-[var(--warn-fg)]">
                {isLoggedIn
                  ? '你当前不是 VIP。建议先利用 7 天试用体验完整训练，再决定是否升级。'
                  : '你当前未登录。请先注册领取 7 天试用，或登录后购买 VIP。登录后购买才能自动开通会员。'}
              </div>
            )}

            {checkoutNotice ? (
              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                {checkoutNotice}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              {!isLoggedIn ? (
                <>
                  <button
                    onClick={goSignup}
                    className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white"
                  >
                    注册即领 7 天试用
                  </button>

                  <button
                    onClick={goLogin}
                    className="rounded-2xl border border-[var(--border)] px-5 py-3 text-sm font-medium hover:bg-[var(--soft)]"
                  >
                    已有账号，先登录
                  </button>
                </>
              ) : null}

              {!isVip && isLoggedIn ? (
                <button
                  onClick={() => goCheckout('yearly')}
                  className="rounded-2xl border border-[var(--border)] px-5 py-3 text-sm font-medium hover:bg-[var(--soft)]"
                >
                  选择推荐年付
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="app-card relative flex h-full flex-col p-6 sm:p-7">
            <div>
              <h2 className="text-xl font-semibold">注册试用</h2>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">适合先完整体验</p>
            </div>

            <div className="mt-6">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold tracking-tight">7 天</span>
              </div>

              <p className="mt-2 text-sm leading-6 text-[var(--fg-muted)]">
                注册后即可领取 7 天试用期，先把训练链路跑一遍，再决定是否升级。
              </p>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <CheckIcon />
                <span>继续完整训练</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckIcon />
                <span>影子跟读</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckIcon />
                <span>情景挑战</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckIcon />
                <span>保存训练记录</span>
              </div>
            </div>

            <div className="mt-8 pt-2 md:mt-auto">
              <button
                onClick={goSignup}
                className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white hover:opacity-90"
              >
                注册即领 7 天试用
              </button>

              <div className="mt-3 text-xs leading-6 text-[var(--fg-muted)]">
                注册后需要验证邮箱，验证完成后会自动进入训练台。
              </div>
            </div>
          </div>

          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex h-full flex-col rounded-[28px] border bg-white p-6 shadow-sm transition sm:p-7 ${
                plan.highlight
                  ? 'scale-[1.01] border-black ring-1 ring-black'
                  : 'border-[var(--border)]'
              }`}
            >
              {plan.badge ? (
                <div className="absolute -top-3 left-6">
                  <span className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white shadow-sm">
                    {plan.badge}
                  </span>
                </div>
              ) : null}

              <div>
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                <p className="mt-1 text-sm text-[var(--fg-muted)]">{plan.sub}</p>
              </div>

              <div className="mt-6">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold tracking-tight">
                    {plan.price}
                  </span>
                </div>

                <p className="mt-2 text-sm leading-6 text-[var(--fg-muted)]">
                  {plan.desc}
                </p>
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <CheckIcon />
                  <span>无限完整训练</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckIcon />
                  <span>Natural / Native 表达</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckIcon />
                  <span>关键词与拼音强化</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckIcon />
                  <span>影子跟读</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckIcon />
                  <span>情景挑战</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckIcon />
                  <span>训练记录保存</span>
                </div>
              </div>

              <div className="mt-8 pt-2 md:mt-auto">
                <button
                  onClick={() => goCheckout(plan.id)}
                  disabled={loading || isVip}
                  className={`w-full rounded-2xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    plan.highlight
                      ? 'bg-black text-white hover:opacity-90'
                      : 'border border-[var(--border)] hover:bg-[var(--soft)]'
                  }`}
                >
                  {isVip ? '已开通 VIP' : loading ? '读取账号中...' : plan.cta}
                </button>

                <div className="mt-3 text-xs leading-6 text-[var(--fg-muted)]">
                  {isLoggedIn
                    ? '已自动附带当前账号信息，支付成功后可自动同步会员状态。'
                    : '请先登录或注册后再购买，避免付款成功但会员无法自动绑定。'}
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="app-card p-5 sm:p-7">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold">功能对比</h2>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">
              游客先试 1 次，注册可领 7 天试用，VIP 适合长期持续训练。
            </p>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="border-b border-[var(--border)] px-4 py-4 text-left text-sm font-medium text-[var(--fg-muted)]">
                    功能
                  </th>
                  <th className="border-b border-[var(--border)] px-4 py-4 text-left text-sm font-medium text-[var(--fg-muted)]">
                    试用 / 免费
                  </th>
                  <th className="border-b border-[var(--border)] px-4 py-4 text-left text-sm font-medium text-[var(--fg-muted)]">
                    VIP
                  </th>
                </tr>
              </thead>

              <tbody>
                {featureRows.map((row) => (
                  <tr key={row.feature}>
                    <td className="border-b border-[var(--border)] px-4 py-4 text-sm font-medium">
                      {row.feature}
                    </td>
                    <td className="border-b border-[var(--border)] px-4 py-4 text-sm text-[var(--fg-muted)]">
                      {row.free}
                    </td>
                    <td className="border-b border-[var(--border)] px-4 py-4 text-sm font-medium text-[var(--fg)]">
                      {row.vip}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {featureRows.map((row) => (
              <div
                key={row.feature}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4"
              >
                <div className="mb-3 font-medium">{row.feature}</div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-[var(--border)] bg-white p-3">
                    <div className="mb-1 text-xs text-[var(--fg-muted)]">
                      试用 / 免费
                    </div>
                    <div>{row.free}</div>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-white p-3">
                    <div className="mb-1 text-xs text-[var(--fg-muted)]">VIP</div>
                    <div className="font-medium">{row.vip}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="app-card p-6">
            <h3 className="mb-4 text-xl font-semibold">
              为什么建议先注册领 7 天试用
            </h3>

            <div className="grid gap-3 text-sm leading-7 text-[var(--fg-muted)]">
              <div>1. 游客只能先试一次，不够判断真实体验。</div>
              <div>2. 7 天试用更适合把完整训练链路真正跑一遍。</div>
              <div>3. 试用期间还能保存记录，感受长期使用价值。</div>
            </div>
          </div>

          <div className="rounded-[28px] bg-gradient-to-br from-gray-900 to-black p-6 text-white shadow-sm">
            <h3 className="mb-4 text-xl font-semibold">
              核心价值不是“多”，而是“完整”
            </h3>

            <div className="grid gap-3 text-sm leading-7 text-gray-200">
              <div>生成表达：看 basic / natural / native 的差异</div>
              <div>影子跟读：用渐进语速训练嘴巴和耳朵</div>
              <div>情景挑战：自己重建句子，强化复用</div>
              <div>这才是完整训练，不是一次性翻译工具。</div>
            </div>
          </div>
        </section>

        <section className="app-card p-5 sm:p-7">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold">常见问题</h2>
          </div>

          <div className="grid gap-4">
            {faqs.map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-[var(--border)] p-4 sm:p-5"
              >
                <div className="mb-2 font-medium">{item.q}</div>
                <div className="text-sm leading-7 text-[var(--fg-muted)]">
                  {item.a}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="app-card p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">
                准备把训练链路跑完整了吗？
              </h2>

              <p className="mt-2 text-sm leading-7 text-[var(--fg-muted)]">
                先注册领 7 天试用；如果你已经明确会长期学，直接上 VIP 更省时间。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {!isLoggedIn ? (
                <button
                  onClick={goSignup}
                  className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white"
                >
                  注册即领 7 天试用
                </button>
              ) : (
                <button
                  onClick={() => goCheckout('yearly')}
                  disabled={loading || isVip}
                  className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isVip ? '已开通 VIP' : '选择年付'}
                </button>
              )}

              <button
                onClick={() => router.push('/dashboard')}
                className="rounded-2xl border border-[var(--border)] px-5 py-3 text-sm font-medium hover:bg-[var(--soft)]"
              >
                返回训练台
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}