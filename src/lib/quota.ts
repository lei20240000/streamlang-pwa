import { createClient } from '@/lib/supabase/server'

export async function getTodayFullTranslateCount(userId: string) {
  const supabase = await createClient()

  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  const { count, error } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', 'full_translate')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())

  if (error) throw error
  return count ?? 0
}

export function getRemainingQuota({
  isVip,
  dailyQuota,
  usedCount,
}: {
  isVip: boolean
  dailyQuota: number
  usedCount: number
}) {
  if (isVip) return Infinity
  return Math.max(dailyQuota - usedCount, 0)
}