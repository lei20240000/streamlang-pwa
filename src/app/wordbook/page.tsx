import Link from 'next/link'
import AppTopNav from '@/components/AppTopNav'
import SpeakButton from '@/components/SpeakButton'
import { createClient } from '@/lib/supabase/server'
import { buildSinglePracticeHref } from '@/lib/review-session'
import type { ItemStatus, ItemType, WordbookItem } from '@/types/wordbook'

const tabs = ['all', 'word', 'phrase', 'sentence', 'review', 'difficult'] as const

type TabType = (typeof tabs)[number]

const tabLabels: Record<TabType, string> = {
  all: '全部',
  word: '单词',
  phrase: '短语',
  sentence: '句子',
  review: '待复习',
  difficult: '困难项',
}

function isTabType(value?: string): value is TabType {
  return !!value && tabs.includes(value as TabType)
}

export default async function WordbookPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; tab?: string }>
}) {
  const resolvedSearchParams = (await searchParams) || {}

  const search = resolvedSearchParams.q?.trim() || ''
  const activeTab: TabType = isTabType(resolvedSearchParams.tab)
    ? resolvedSearchParams.tab
    : 'all'

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
        <AppTopNav isLoggedIn={false} />

        <div className="mx-auto max-w-5xl px-4 py-8">
          <section className="app-card p-6 text-center">
            <h1 className="text-2xl font-bold">请先登录</h1>

            <p className="mt-3 text-sm text-[var(--fg-muted)]">
              登录后才能查看和保存你的单词本内容。
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

  let query = supabase
    .from('wordbook_items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(
      `text.ilike.%${search}%,meaning.ilike.%${search}%,original.ilike.%${search}%`
    )
  }

  if (activeTab === 'word') query = query.eq('type', 'word')
  if (activeTab === 'phrase') query = query.eq('type', 'phrase')
  if (activeTab === 'sentence') query = query.eq('type', 'sentence')
  if (activeTab === 'review') query = query.eq('status', 'review')
  if (activeTab === 'difficult') query = query.eq('status', 'difficult')

  const { data: filteredItems, error: filteredError } =
    await query.returns<WordbookItem[]>()

  if (filteredError) {
    console.error('[wordbook] load filtered wordbook_items error:', filteredError)
  }

  const { data: allItems, error: allItemsError } = await supabase
    .from('wordbook_items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .returns<WordbookItem[]>()

  if (allItemsError) {
    console.error('[wordbook] load all wordbook_items error:', allItemsError)
  }

  const safeItems: WordbookItem[] = filteredItems ?? []
  const safeAllItems: WordbookItem[] = allItems ?? []

  const stats = {
    total: safeAllItems.length,
    review: safeAllItems.filter((item) => item.status === 'review').length,
    mastered: safeAllItems.filter((item) => item.status === 'mastered').length,
    difficult: safeAllItems.filter((item) => item.status === 'difficult').length,
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <AppTopNav isLoggedIn email={user.email || null} />

      <div className="mx-auto max-w-5xl px-3 py-4 md:px-6 md:py-6">
        <div className="space-y-5">
          <section className="app-card p-5 md:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-[var(--fg-muted)]">
                  WORDBOOK
                </p>

                <h1 className="mt-2 text-2xl font-extrabold md:text-4xl">
                  单词本
                </h1>

                <p className="mt-3 text-sm leading-7 text-[var(--fg-muted)]">
                  保存训练台生成的句子、单词和短语，后续进入复习。
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href="/dashboard" className="btn-secondary px-4 py-2 text-sm">
                  返回训练台
                </Link>

                <Link href="/review" className="btn-primary px-4 py-2 text-sm">
                  去复习
                </Link>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard title="总收藏" value={stats.total} />
            <StatCard title="待复习" value={stats.review} />
            <StatCard title="已掌握" value={stats.mastered} />
            <StatCard title="困难项" value={stats.difficult} />
          </section>

          <section className="app-card p-4 md:p-5">
            <form className="space-y-4">
              <input
                name="q"
                defaultValue={search}
                placeholder="搜索单词、短语、句子"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-base text-[var(--fg)] outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-black/10"
              />

              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => {
                  const active = activeTab === tab

                  return (
                    <button
                      key={tab}
                      type="submit"
                      name="tab"
                      value={tab}
                      className={
                        active
                          ? 'btn-primary px-4 py-2 text-sm'
                          : 'btn-secondary px-4 py-2 text-sm'
                      }
                    >
                      {tabLabels[tab]}
                    </button>
                  )
                })}
              </div>
            </form>
          </section>

          <section className="space-y-3">
            {safeItems.map((item) => (
              <WordbookCard key={item.id} item={item} />
            ))}

            {safeItems.length === 0 ? (
              <section className="app-card p-8 text-center">
                <h2 className="text-xl font-bold">没有找到内容</h2>

                <p className="mt-3 text-sm leading-7 text-[var(--fg-muted)]">
                  先从训练台生成一句表达，系统会自动加入单词本。
                </p>

                <div className="mt-6">
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

function WordbookCard({ item }: { item: WordbookItem }) {
  return (
    <article className="app-card p-4 md:p-5">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-extrabold leading-snug md:text-2xl">
            {item.text}
          </h2>

          <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-medium text-[var(--fg-muted)]">
            {typeText(item.type)}
          </span>

          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusChip(
              item.status
            )}`}
          >
            {statusText(item.status)}
          </span>
        </div>

        {item.meaning ? (
          <p className="text-base leading-7 text-[var(--fg)]">{item.meaning}</p>
        ) : null}

        {item.original ? (
          <p className="text-sm leading-6 text-[var(--fg-muted)]">
            原句：{item.original}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {item.source ? <MetaChip label={`来源：${item.source}`} /> : null}
          {item.scene ? <MetaChip label={`场景：${item.scene}`} /> : null}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <SpeakButton
            text={item.text}
            label="播放"
            className="btn-secondary px-4 py-2 text-sm"
          />

          <SpeakButton
            text={item.text}
            label="跟读"
            className="btn-secondary px-4 py-2 text-sm"
          />

          <Link
            href={buildSinglePracticeHref(item)}
            className="btn-primary px-4 py-2 text-sm"
          >
            练习这条
          </Link>
        </div>
      </div>
    </article>
  )
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="app-card p-4">
      <p className="text-xs font-medium text-[var(--fg-muted)]">{title}</p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
    </div>
  )
}

function MetaChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs text-[var(--fg-muted)]">
      {label}
    </span>
  )
}

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

function statusChip(status: ItemStatus) {
  if (status === 'new') return 'bg-[#dbeafe] text-[#1d4ed8]'
  if (status === 'review') return 'bg-[#fef3c7] text-[#b45309]'
  if (status === 'mastered') return 'bg-[#dcfce7] text-[#15803d]'
  return 'bg-[#fee2e2] text-[#b91c1c]'
}