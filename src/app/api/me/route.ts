import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, is_vip, vip_expires_at, plan_type, daily_quota')
      .eq('id', authUser.id)
      .single()

    if (profileError || !profile) {
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
    const isVip = !!profile.is_vip
    const dailyQuota = Number(profile.daily_quota ?? 3)

    const remaining = isVip
      ? 'unlimited'
      : Math.max(dailyQuota - todayCount, 0)

    return NextResponse.json({
      authenticated: true,
      user: {
        id: profile.id,
        email: profile.email,
        is_vip: profile.is_vip,
        vip_expires_at: profile.vip_expires_at,
        plan_type: profile.plan_type,
        daily_quota: profile.daily_quota,
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