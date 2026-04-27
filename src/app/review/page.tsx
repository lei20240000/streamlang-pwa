import Link from 'next/link'
import AppTopNav from '@/components/AppTopNav'
import SpeakButton from '@/components/SpeakButton'
import { createClient } from '@/lib/supabase/server'
import type { ItemStatus, ItemType, WordbookItem } from '@/types/wordbook'

function typeText(type: ItemType) {
  if (type === 'word') return '单词'
  if (type === 'phrase') return '短语'
  return '句子'
}

function statusText(status: ItemStatus) {
  if (status === 'new') return '新加入'
  if (status === 'review') return '待复习'
  if (status === 'mastered') return '已掌握'
  return '困难项'
}

function buildPracticeHref(item: WordbookItem) {
  const params = new URLSearchParams()

  params.set('id', item.id)
  params.set('text', item.text || '')
  params.set('meaning', item.meaning || '')
  params.set('type', item.type || 'sentence')

  return `/review/session?${params.toString()}`
}

export default async function ReviewPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
        <AppTopNav isLoggedIn={false} />

        <div className="mx-auto max-w-4xl px-4 py-8">
          <section className="app-card p-6 text-center">
            <h1 className="text-2xl font-bold">请先登录</h1>

            <p className="mt-3 text-sm text-[var(--fg-muted)]">
              登录后才能查看你的复习内容。
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <Link href="/login" className="btn-primary px-5 py-3 text-sm">
                登录
              </Link>

              <Link href="/signup" className="btn-secondary px-5 py-3 text-sm">
                注册
              </Link>
            </div>
          </section>
        </div>
      </main>
    )
  }

  const { data, error } = await supabase
    .from('wordbook_items')
    .select('*')
    .eq('user_id', user.id)
    .neq('status', 'mastered')
    .order('created_at', { ascending: false })
    .limit(80)
    .returns<WordbookItem[]>()

  if (error) {
    console.error('[review] load review items error:', error)
  }

  const items: WordbookItem[] = data ?? []

  const difficultCount = items.filter((item) => item.status === 'difficult').length
  const reviewCount = items.filter((item) => item.status === 'review').length
  const newCount = items.filter((item) => item.status === 'new').length

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <AppTopNav isLoggedIn email={user.email || null} />

      <div className="mx-auto max-w-4xl px-3 py-4 md:px-6 md:py-6">
        <div className="space-y-5">
          <section className="app-card p-5 md:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-[var(--fg-muted)]">
                  REVIEW
                </p>

                <h1 className="mt-2 text-2xl font-extrabold md:text-4xl">
                  复习
                </h1>

                <p className="mt-3 text-sm leading-7 text-[var(--fg-muted)]">
                  只练还没掌握的内容。每条先回忆，再看答案。
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href="/wordbook" className="btn-secondary px-4 py-2 text-sm">
                  去单词本
                </Link>

                <Link href="/dashboard" className="btn-primary px-4 py-2 text-sm">
                  返回训练台
                </Link>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-3 gap-3">
            <StatCard title="新加入" value={newCount} />
            <StatCard title="待复习" value={reviewCount} />
            <StatCard title="困难项" value={difficultCount} />
          </section>

          <section className="space-y-3">
            {items.map((item) => (
              <article key={item.id} className="app-card p-4 md:p-5">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-medium text-[var(--fg-muted)]">
                      {typeText(item.type)}
                    </span>

                    <span className="rounded-full bg-[var(--trial-bg)] px-3 py-1 text-xs font-medium text-[var(--trial-fg)]">
                      {statusText(item.status)}
                    </span>
                  </div>

                  <div>
                    <h2 className="break-words text-2xl font-extrabold leading-snug md:text-3xl">
                      {item.text}
                    </h2>

                    {item.meaning ? (
                      <p className="mt-3 break-words text-base leading-7 text-[var(--fg-muted)]">
                        {item.meaning}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <SpeakButton
                      text={item.text}
                      label="跟读"
                      className="btn-secondary px-4 py-2 text-sm"
                    />

                    <Link
                      href={buildPracticeHref(item)}
                      className="btn-primary px-4 py-2 text-sm"
                    >
                      立即练习
                    </Link>
                  </div>
                </div>
              </article>
            ))}

            {items.length === 0 ? (
              <section className="app-card p-8 text-center">
                <h2 className="text-xl font-bold">当前没有待复习内容</h2>

                <p className="mt-3 text-sm leading-7 text-[var(--fg-muted)]">
                  你已经没有需要复习的条目。可以回训练台生成新表达，或去单词本查看已保存内容。
                </p>

                <div className="mt-6 flex justify-center gap-3">
                  <Link href="/wordbook" className="btn-secondary px-5 py-3 text-sm">
                    去单词本
                  </Link>

                  <Link href="/dashboard" className="btn-primary px-5 py-3 text-sm">
                    去训练台
                  </Link>
                </div>
              </section>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  )
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="app-card p-4 text-center">
      <p className="text-xs font-medium text-[var(--fg-muted)]">{title}</p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
    </div>
  )
}