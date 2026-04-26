import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type PlanId = 'monthly' | 'yearly' | 'lifetime'

const PLAN_VARIANT_ENV: Record<PlanId, string> = {
  monthly: 'LEMONSQUEEZY_MONTHLY_VARIANT_ID',
  yearly: 'LEMONSQUEEZY_YEARLY_VARIANT_ID',
  lifetime: 'LEMONSQUEEZY_LIFETIME_VARIANT_ID',
}

function isPlanId(value: unknown): value is PlanId {
  return value === 'monthly' || value === 'yearly' || value === 'lifetime'
}

function getVariantId(plan: PlanId) {
  return process.env[PLAN_VARIANT_ENV[plan]]
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: '请先登录后再购买 VIP' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const plan = body?.plan

    if (!isPlanId(plan)) {
      return NextResponse.json(
        { ok: false, error: '无效的套餐' },
        { status: 400 }
      )
    }

    const apiKey = process.env.LEMONSQUEEZY_API_KEY
    const storeId = process.env.LEMONSQUEEZY_STORE_ID
    const variantId = getVariantId(plan)

    if (!apiKey || !storeId || !variantId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Lemon Squeezy 环境变量未配置完整',
        },
        { status: 500 }
      )
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'

    const email = user.email || ''

    const payload = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email,
            custom: {
              user_id: user.id,
              email,
              plan,
            },
          },
          product_options: {
            redirect_url: `${appUrl}/dashboard?payment=success`,
            enabled_variants: [Number(variantId)],
          },
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: String(storeId),
            },
          },
          variant: {
            data: {
              type: 'variants',
              id: String(variantId),
            },
          },
        },
      },
    }

    console.log('[lemonsqueezy-checkout] create checkout:', {
      user_id: user.id,
      email,
      plan,
      variantId,
    })

    const lemonRes = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    const lemonJson = await lemonRes.json()

    if (!lemonRes.ok) {
      console.error('[lemonsqueezy-checkout] lemon error:', lemonJson)

      return NextResponse.json(
        {
          ok: false,
          error: '创建支付链接失败',
          detail: lemonJson,
        },
        { status: 500 }
      )
    }

    const url = lemonJson?.data?.attributes?.url

    if (!url) {
      return NextResponse.json(
        { ok: false, error: 'Lemon Squeezy 没有返回支付链接' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      url,
      debug: {
        user_id: user.id,
        email,
        plan,
        variantId,
      },
    })
  } catch (error) {
    console.error('[lemonsqueezy-checkout] unexpected error:', error)

    return NextResponse.json(
      { ok: false, error: '创建支付链接失败' },
      { status: 500 }
    )
  }
}