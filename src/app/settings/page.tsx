'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type UserSettingsRow = {
  notifications_enabled: boolean
  reminder_time: string
}

type UserProfileRow = {
  is_vip: boolean | null
  plan_type: string | null
  vip_expires_at: string | null
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function NavTabs() {
  const tabs = [
    { label: '训练台', href: '/dashboard', active: false },
    { label: '单词本', href: '/wordbook', active: false },
    { label: '复习', href: '/review', active: false },
    { label: '会员', href: '/pricing', active: false },
    { label: '设置', href: '/settings', active: true },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          href={tab.href}
          className={cn(
            'inline-flex h-11 items-center justify-center rounded-full border px-5 text-[15px] font-semibold transition',
            tab.active
              ? 'border-black bg-black text-white'
              : 'border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[22px] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h2 className="text-[17px] font-bold text-zinc-900">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Row({
  label,
  value,
  children,
}: {
  label: string
  value?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex min-h-[60px] items-center justify-between gap-4 rounded-2xl border border-zinc-200 px-4 py-3">
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-zinc-900">{label}</div>
        {value ? (
          <div className="mt-1 truncate text-[13px] text-zinc-500">{value}</div>
        ) : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-8 w-14 items-center rounded-full transition',
        checked ? 'bg-black' : 'bg-zinc-300',
        disabled && 'cursor-not-allowed opacity-50'
      )}
      aria-pressed={checked}
    >
      <span
        className={cn(
          'inline-block h-6 w-6 rounded-full bg-white transition',
          checked ? 'translate-x-7' : 'translate-x-1'
        )}
      />
    </button>
  )
}

function ActionButton({
  children,
  href,
  onClick,
  danger = false,
  disabled = false,
}: {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
}) {
  const className = cn(
    'inline-flex h-10 items-center justify-center rounded-full border px-4 text-[14px] font-semibold transition',
    danger
      ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
      : 'border-black bg-black text-white hover:bg-zinc-800',
    disabled && 'cursor-not-allowed opacity-50'
  )

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  )
}

function formatPlanType(planType: string | null, isVip: boolean) {
  if (!isVip) return '免费版'
  if (!planType) return 'Pro 会员'

  const plan = planType.toLowerCase()

  if (plan.includes('month')) return '月付会员'
  if (plan.includes('year')) return '年付会员'
  if (plan.includes('life')) return '终身会员'

  return planType
}

function formatExpireText(vipExpiresAt: string | null) {
  if (!vipExpiresAt) return ''
  const date = new Date(vipExpiresAt)
  if (Number.isNaN(date.getTime())) return vipExpiresAt

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export default function SettingsPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')

  const [isVip, setIsVip] = useState(false)
  const [planType, setPlanType] = useState<string | null>(null)
  const [vipExpiresAt, setVipExpiresAt] = useState<string | null>(null)

  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [reminderTime, setReminderTime] = useState('22:30')

  const [saveText, setSaveText] = useState('')

  useEffect(() => {
    let alive = true

    async function loadData() {
      setLoading(true)

      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        window.location.href = '/login'
        return
      }

      const user = authData.user
      const userEmail = user.email || ''

      if (!alive) return

      setUserId(user.id)
      setEmail(userEmail)

      const settingsPromise = supabase
        .from('user_settings')
        .select('notifications_enabled, reminder_time')
        .eq('user_id', user.id)
        .maybeSingle()

      const profilePromise = userEmail
        ? supabase
            .from('users')
            .select('is_vip, plan_type, vip_expires_at')
            .eq('email', userEmail)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null })

      const [settingsRes, profileRes] = await Promise.all([
        settingsPromise,
        profilePromise,
      ])

      if (!alive) return

      const settings = settingsRes.data as UserSettingsRow | null
      const profile = profileRes.data as UserProfileRow | null

      if (profile) {
        setIsVip(!!profile.is_vip)
        setPlanType(profile.plan_type ?? null)
        setVipExpiresAt(profile.vip_expires_at ?? null)
      } else {
        setIsVip(false)
        setPlanType(null)
        setVipExpiresAt(null)
      }

      if (settings) {
        setNotificationsEnabled(settings.notifications_enabled)
        setReminderTime(settings.reminder_time || '22:30')
      } else {
        const defaultRow: UserSettingsRow = {
          notifications_enabled: true,
          reminder_time: '22:30',
        }

        await supabase.from('user_settings').upsert({
          user_id: user.id,
          notifications_enabled: defaultRow.notifications_enabled,
          reminder_time: defaultRow.reminder_time,
          updated_at: new Date().toISOString(),
        })

        setNotificationsEnabled(defaultRow.notifications_enabled)
        setReminderTime(defaultRow.reminder_time)
      }

      setLoading(false)
    }

    loadData()

    return () => {
      alive = false
    }
  }, [supabase])

  const membershipText = useMemo(() => {
    const planLabel = formatPlanType(planType, isVip)

    if (!isVip) return planLabel

    const expireText = formatExpireText(vipExpiresAt)

    if (!expireText) return planLabel
    if (planLabel === '终身会员') return planLabel

    return `${planLabel} · 到期 ${expireText}`
  }, [isVip, planType, vipExpiresAt])

  async function saveSettings(next?: {
    notifications_enabled?: boolean
    reminder_time?: string
  }) {
    if (!userId) return

    const finalNotifications =
      next?.notifications_enabled ?? notificationsEnabled
    const finalReminderTime = next?.reminder_time ?? reminderTime

    setSaving(true)
    setSaveText('保存中...')

    const { error } = await supabase.from('user_settings').upsert({
      user_id: userId,
      notifications_enabled: finalNotifications,
      reminder_time: finalReminderTime,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      setSaveText('保存失败')
      setSaving(false)
      return
    }

    setSaveText('已保存')
    setSaving(false)

    window.setTimeout(() => {
      setSaveText('')
    }, 1500)
  }

  async function handleToggle(next: boolean) {
    setNotificationsEnabled(next)
    await saveSettings({ notifications_enabled: next })
  }

  async function handleTimeChange(value: string) {
    setReminderTime(value)
    await saveSettings({ reminder_time: value })
  }

  async function handleLogout() {
    const ok = window.confirm('确定退出登录吗？')
    if (!ok) return

    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f5f4] px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[30px] border border-zinc-300 bg-white px-5 py-5 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="text-[22px] font-extrabold tracking-tight text-zinc-900">
                StreamLang
              </div>
              <div className="text-sm text-zinc-400">加载中...</div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f5f4] px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[30px] border border-zinc-300 bg-white px-5 py-4 shadow-sm sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:gap-8">
              <Link
                href="/dashboard"
                className="text-[22px] font-extrabold tracking-tight text-zinc-900"
              >
                StreamLang
              </Link>
              <NavTabs />
            </div>

            <div className="flex items-center gap-3">
              <div className="max-w-[220px] truncate text-[14px] font-medium text-zinc-500 sm:max-w-none">
                {email}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-[15px] font-semibold text-zinc-900 transition hover:bg-zinc-50"
              >
                退出
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 px-1">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-zinc-900">
              设置
            </h1>
            <p className="mt-1 text-[13px] text-zinc-500">
              管理账号、通知与支持信息
            </p>
          </div>
          <div className="text-[12px] text-zinc-400">
            {saving ? '保存中...' : saveText}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Section title="账号与会员">
            <Row label="当前账号" value={email} />
            <Row label="当前套餐" value={membershipText} />
            <Row label="会员中心" value="查看套餐或升级">
              <ActionButton href="/pricing">前往</ActionButton>
            </Row>
            <Row label="退出登录" value="退出当前设备">
              <ActionButton danger onClick={handleLogout}>
                退出
              </ActionButton>
            </Row>
          </Section>

          <Section title="通知">
            <Row label="推送通知" value={notificationsEnabled ? '已开启' : '已关闭'}>
              <Toggle
                checked={notificationsEnabled}
                onChange={handleToggle}
                disabled={saving}
              />
            </Row>

            <div
              className={cn(
                'rounded-2xl border border-zinc-200 px-4 py-3 transition',
                !notificationsEnabled && 'opacity-50'
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[14px] font-semibold text-zinc-900">
                    提醒时间
                  </div>
                  <div className="mt-1 text-[13px] text-zinc-500">
                    每日训练提醒时间
                  </div>
                </div>

                <input
                  type="time"
                  value={reminderTime}
                  disabled={!notificationsEnabled || saving}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="h-10 rounded-full border border-zinc-300 bg-white px-4 text-[14px] font-medium text-zinc-900 outline-none focus:border-zinc-900 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </Section>

          <Section title="支持">
            <Row label="支持邮箱" value="016vip@gmail.com">
              <a
                href="mailto:016vip@gmail.com"
                className="inline-flex h-10 items-center justify-center rounded-full border border-black bg-black px-4 text-[14px] font-semibold text-white transition hover:bg-zinc-800"
              >
                联系
              </a>
            </Row>
          </Section>

          <Section title="隐私与协议">
            <Row label="隐私政策" value="查看产品隐私说明">
              <ActionButton href="/privacy">查看</ActionButton>
            </Row>
            <Row label="用户协议" value="查看使用条款">
              <ActionButton href="/terms">查看</ActionButton>
            </Row>
          </Section>
        </div>
      </div>
    </main>
  )
}