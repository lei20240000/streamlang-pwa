import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type PlanType = 'monthly' | 'yearly' | 'lifetime' | 'free'

type LemonWebhookBody = {
  meta?: {
    event_name?: string
    custom_data?: {
      user_id?: string
      email?: string
      plan?: string
      [key: string]: unknown
    }
  }
  data?: {
    id?: string
    type?: string
    attributes?: {
      user_email?: string
      customer_id?: number | string | null
      order_id?: number | string | null
      product_id?: number | string | null
      variant_id?: number | string | null
      subscription_id?: number | string | null
      status?: string | null
      created_at?: string | null
      updated_at?: string | null
      renews_at?: string | null
      ends_at?: string | null
      trial_ends_at?: string | null
      [key: string]: unknown
    }
  }
}

/**
 * 这里保留旧 variant id，是为了兼容你之前的链接。
 * 但现在更推荐优先使用 checkout[custom][plan]。
 */
const VARIANT_PLAN_MAP: Record<string, PlanType> = {
  '1492290': 'monthly',
  '1492298': 'yearly',
  '1492318': 'lifetime',
}

function normalizePlanType(value?: string | number | null): PlanType {
  if (!value) return 'free'

  const plan = String(value).trim().toLowerCase()

  if (plan === 'monthly') return 'monthly'
  if (plan === 'yearly') return 'yearly'
  if (plan === 'lifetime') return 'lifetime'

  return 'free'
}

function getPlanType(params: {
  customPlan?: string | null
  variantId?: string | number | null
}): PlanType {
  const fromCustom = normalizePlanType(params.customPlan)

  if (fromCustom !== 'free') {
    return fromCustom
  }

  if (!params.variantId) {
    return 'free'
  }

  return VARIANT_PLAN_MAP[String(params.variantId)] || 'free'
}

function getVipExpiry(planType: PlanType, lemonEndsAt?: string | null): string | null {
  if (planType === 'lifetime') return null

  if (lemonEndsAt) {
    return lemonEndsAt
  }

  const now = new Date()

  if (planType === 'monthly') {
    now.setMonth(now.getMonth() + 1)
    return now.toISOString()
  }

  if (planType === 'yearly') {
    now.setFullYear(now.getFullYear() + 1)
    return now.toISOString()
  }

  return null
}

function isActiveSubscriptionStatus(status?: string | null) {
  if (!status) return false

  return ['active', 'on_trial', 'paused', 'past_due'].includes(status)
}

function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false

  const digest = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  const a = Buffer.from(digest, 'utf8')
  const b = Buffer.from(signature, 'utf8')

  if (a.length !== b.length) return false

  return crypto.timingSafeEqual(a, b)
}

async function findUserId(params: {
  customUserId?: string | null
  customEmail?: string | null
  lemonEmail?: string | null
}) {
  const { customUserId, customEmail, lemonEmail } = params

  if (customUserId) {
    return customUserId
  }

  const email = customEmail || lemonEmail

  if (!email) return null

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data?.id || null
}

async function updateUserVip(params: {
  userId: string
  isVip: boolean
  planType: PlanType
  vipExpiresAt: string | null
}) {
  const { userId, isVip, planType, vipExpiresAt } = params

  const { error } = await supabase
    .from('users')
    .update({
      is_vip: isVip,
      plan_type: planType,
      vip_expires_at: vipExpiresAt,
    })
    .eq('id', userId)

  if (error) {
    throw error
  }
}

async function upsertSubscription(params: {
  userId: string
  eventName: string
  body: LemonWebhookBody
  planType: PlanType
  status: string
  orderId?: string | null
  productId?: string | null
  variantId?: string | null
  subscriptionId?: string | null
  customerId?: string | null
  startsAt?: string | null
  endsAt?: string | null
}) {
  const {
    userId,
    eventName,
    body,
    planType,
    status,
    orderId,
    productId,
    variantId,
    subscriptionId,
    customerId,
    startsAt,
    endsAt,
  } = params

  const record = {
    user_id: userId,
    provider: 'lemonsqueezy',
    plan_type: planType,
    status,
    external_order_id: orderId || null,
    external_product_id: productId || null,
    external_variant_id: variantId || null,
    external_subscription_id: subscriptionId || null,
    external_customer_id: customerId || null,
    starts_at: startsAt || null,
    ends_at: endsAt || null,
    raw_event: {
      event_name: eventName,
      payload: body,
    },
    updated_at: new Date().toISOString(),
  }

  if (subscriptionId) {
    const { error } = await supabase
      .from('subscriptions')
      .upsert(record, {
        onConflict: 'external_subscription_id',
      })

    if (error) {
      throw error
    }

    return
  }

  const { error } = await supabase.from('subscriptions').insert(record)

  if (error) {
    throw error
  }
}

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET

    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'missing webhook secret' },
        { status: 500 }
      )
    }

    const rawBody = await req.text()
    const signature = req.headers.get('x-signature')

    const isValid = verifySignature(rawBody, signature, webhookSecret)

    if (!isValid) {
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }

    const body = JSON.parse(rawBody) as LemonWebhookBody

    const event = body.meta?.event_name || 'unknown'
    const attrs = body.data?.attributes || {}

    const customUserId = body.meta?.custom_data?.user_id || null
    const customEmail = body.meta?.custom_data?.email || null
    const customPlan = body.meta?.custom_data?.plan || null

    const lemonEmail = attrs.user_email || null

    console.log('Lemon webhook debug:', {
  event,
  customUserId,
  customEmail,
  customPlan,
  lemonEmail,
  variantId,
  productId,
  orderId,
  subscriptionId,
})

    const orderId = attrs.order_id ? String(attrs.order_id) : null
    const productId = attrs.product_id ? String(attrs.product_id) : null
    const variantId = attrs.variant_id ? String(attrs.variant_id) : null

    const subscriptionId =
      body.data?.type === 'subscriptions' && body.data?.id
        ? String(body.data.id)
        : attrs.subscription_id
          ? String(attrs.subscription_id)
          : null

    const customerId = attrs.customer_id ? String(attrs.customer_id) : null

    const planType = getPlanType({
      customPlan,
      variantId,
    })

    const userId = await findUserId({
      customUserId,
      customEmail,
      lemonEmail,
    })

    if (!userId) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'user not found',
        event,
      })
    }

    /**
     * 一次性订单：
     * - lifetime 必须立即开通
     * - 如果你当前 monthly/yearly 也是一次性产品，而不是订阅产品，
     *   这里也会直接开通。
     */
    if (event === 'order_created') {
      if (planType === 'monthly' || planType === 'yearly' || planType === 'lifetime') {
        await updateUserVip({
          userId,
          isVip: true,
          planType,
          vipExpiresAt: getVipExpiry(planType, null),
        })
      }

      try {
        await upsertSubscription({
          userId,
          eventName: event,
          body,
          planType,
          status: 'paid',
          orderId,
          productId,
          variantId,
          subscriptionId,
          customerId,
          startsAt: attrs.created_at || new Date().toISOString(),
          endsAt: getVipExpiry(planType, null),
        })
      } catch (subError) {
        console.error('subscriptions insert failed on order_created:', subError)
      }

      return NextResponse.json({
        success: true,
        event,
        user_id: userId,
        plan_type: planType,
      })
    }

    /**
     * 订阅创建 / 更新 / 恢复：
     * monthly/yearly 如果是 subscription，一般走这里。
     */
    if (
      event === 'subscription_created' ||
      event === 'subscription_updated' ||
      event === 'subscription_resumed'
    ) {
      const status = String(attrs.status || '')
      const renewsAt = attrs.renews_at || attrs.ends_at || null
      const startsAt = attrs.created_at || new Date().toISOString()
      const active = isActiveSubscriptionStatus(status)

      await updateUserVip({
        userId,
        isVip: active,
        planType: active ? planType : 'free',
        vipExpiresAt: active ? getVipExpiry(planType, renewsAt) : null,
      })

      try {
        await upsertSubscription({
          userId,
          eventName: event,
          body,
          planType,
          status,
          orderId,
          productId,
          variantId,
          subscriptionId,
          customerId,
          startsAt,
          endsAt: renewsAt,
        })
      } catch (subError) {
        console.error(`subscriptions upsert failed on ${event}:`, subError)
      }

      return NextResponse.json({
        success: true,
        event,
        user_id: userId,
        plan_type: active ? planType : 'free',
      })
    }

    /**
     * 订阅取消：
     * 注意：subscription_cancelled 不一定等于立即失效。
     * 更稳妥是保留 VIP 到 renews_at / ends_at。
     * 但为了当前 MVP 简单，这里先取消即关闭。
     */
    if (event === 'subscription_cancelled' || event === 'subscription_expired') {
      const status = String(attrs.status || event)

      await updateUserVip({
        userId,
        isVip: false,
        planType: 'free',
        vipExpiresAt: null,
      })

      try {
        await upsertSubscription({
          userId,
          eventName: event,
          body,
          planType,
          status,
          orderId,
          productId,
          variantId,
          subscriptionId,
          customerId,
          startsAt: attrs.created_at || null,
          endsAt: attrs.ends_at || attrs.renews_at || null,
        })
      } catch (subError) {
        console.error(`subscriptions upsert failed on ${event}:`, subError)
      }

      return NextResponse.json({
        success: true,
        event,
        user_id: userId,
        plan_type: 'free',
      })
    }

    return NextResponse.json({
      success: true,
      ignored: event,
      plan_type: planType,
      has_user_id: !!userId,
    })
  } catch (e) {
    console.error('lemonsqueezy webhook error:', e)

    return NextResponse.json({ error: 'webhook error' }, { status: 500 })
  }
}