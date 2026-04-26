export type PlanType = 'monthly' | 'yearly' | 'lifetime' | 'free'

export const LEMON_VARIANT_MAP: Record<string, PlanType> = {
  '1492290': 'monthly',
  '1492298': 'yearly',
  '1492318': 'lifetime',
}

export function getPlanTypeFromVariantId(variantId?: string | number | null): PlanType {
  if (!variantId) return 'free'
  return LEMON_VARIANT_MAP[String(variantId)] || 'free'
}

export function getVipExpiry(planType: PlanType, subscriptionEndsAt?: string | null): string | null {
  if (planType === 'lifetime') return null

  // 优先信任 Lemon 传来的订阅结束时间
  if (subscriptionEndsAt) return subscriptionEndsAt

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

export function isActiveSubscriptionStatus(status?: string | null) {
  if (!status) return false
  return ['active', 'on_trial', 'paused', 'past_due'].includes(status)
}