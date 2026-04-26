await supabase.from('users').upsert({
  id: user.id,
  email: user.email,
  is_vip: false,
  plan_type: 'trial',
  daily_quota: 999999,
  trial_started_at: new Date().toISOString(),
  trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
})