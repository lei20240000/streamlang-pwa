import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const FREE_DAILY_DEFAULT_QUOTA = 1
const TRIAL_DAYS = 7
const TRIAL_DAILY_QUOTA = 3

function getTodayRange() {
  const now = new Date()

  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function isTrialActive(profile: {
  is_vip?: boolean | null
  trial_ends_at?: string | null
  plan_type?: string | null
}) {
  if (profile.is_vip) return false
  if (profile.plan_type !== 'trial') return false
  if (!profile.trial_ends_at) return false
  return new Date(profile.trial_ends_at).getTime() > Date.now()
}

async function getTodayFullTranslateCount(userId: string) {
  const supabase = await createClient()
  const { start, end } = getTodayRange()

  const { count, error } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', 'full_translate')
    .gte('created_at', start)
    .lte('created_at', end)

  if (error) {
    throw new Error(error.message)
  }

  return count ?? 0
}

export async function GET() {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
          usage: null,
        },
        { status: 401 }
      )
    }

    const { data: existingProfile, error: profileReadError } = await admin
      .from('users')
      .select(
        'id, email, is_vip, vip_expires_at, plan_type, daily_quota, trial_started_at, trial_ends_at'
      )
      .eq('id', authUser.id)
      .maybeSingle()

    if (profileReadError) {
      return NextResponse.json(
        {
          authenticated: false,
          error: '读取用户资料失败',
          detail: profileReadError.message,
          user: null,
          usage: null,
        },
        { status: 500 }
      )
    }

    const now = new Date()
    const trialEndsAt = addDays(now, TRIAL_DAYS).toISOString()

    // 第一次登录：自动建档并开 7 天 trial
    if (!existingProfile) {
      const { error: insertError } = await admin.from('users').insert({
        id: authUser.id,
        email: authUser.email,
        is_vip: false,
        vip_expires_at: null,
        plan_type: 'trial',
        daily_quota: FREE_DAILY_DEFAULT_QUOTA,
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEndsAt,
      })

      if (insertError) {
        return NextResponse.json(
          {
            authenticated: false,
            error: '创建用户资料失败',
            detail: insertError.message,
            user: null,
            usage: null,
          },
          { status: 500 }
        )
      }
    }

    // 老用户但从未开通过 trial：补发一次 7 天 trial
    if (
      existingProfile &&
      !existingProfile.is_vip &&
      !existingProfile.trial_started_at &&
      !existingProfile.trial_ends_at
    ) {
      const { error: trialUpdateError } = await admin
        .from('users')
        .update({
          plan_type: 'trial',
          trial_started_at: now.toISOString(),
          trial_ends_at: trialEndsAt,
        })
        .eq('id', authUser.id)

      if (trialUpdateError) {
        return NextResponse.json(
          {
            authenticated: false,
            error: '开通试用期失败',
            detail: trialUpdateError.message,
            user: null,
            usage: null,
          },
          { status: 500 }
        )
      }
    }

    const { data: profile, error: finalProfileError } = await admin
      .from('users')
      .select(
        'id, email, is_vip, vip_expires_at, plan_type, daily_quota, trial_started_at, trial_ends_at'
      )
      .eq('id', authUser.id)
      .single()

    if (finalProfileError || !profile) {
      return NextResponse.json(
        {
          authenticated: false,
          error: '用户资料不存在，请重新登录',
          user: null,
          usage: null,
        },
        { status: 404 }
      )
    }

    const todayCount = await getTodayFullTranslateCount(authUser.id)
    const vip = !!profile.is_vip
    const trialActive = isTrialActive(profile)
    const dailyQuota = Number(profile.daily_quota ?? FREE_DAILY_DEFAULT_QUOTA)

    const remaining = vip
      ? 'unlimited'
      : Math.max((trialActive ? TRIAL_DAILY_QUOTA : dailyQuota) - todayCount, 0)

    return NextResponse.json({
      authenticated: true,
      user: {
        id: profile.id,
        email: profile.email,
        is_vip: profile.is_vip,
        vip_expires_at: profile.vip_expires_at,
        plan_type: trialActive ? 'trial' : profile.plan_type,
        daily_quota: profile.daily_quota,
        trial_started_at: profile.trial_started_at,
        trial_ends_at: profile.trial_ends_at,
        is_trial_active: trialActive,
      },
      usage: {
        today_full_translate_count: todayCount,
        remaining_full_translate_count: remaining,
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      {
        authenticated: false,
        error: '获取用户信息失败',
        detail: e?.message || 'unknown error',
        user: null,
        usage: null,
      },
      { status: 500 }
    )
  }
}