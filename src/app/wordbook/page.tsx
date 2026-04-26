import Link from 'next/link'
import AppTopNav from '@/components/AppTopNav'
import SpeakButton from '@/components/SpeakButton'
import { createClient } from '@/lib/supabase/server'
import { buildSinglePracticeHref } from '@/lib/review-session'
import type { ItemStatus, ItemType, WordbookItem } from '@/types/wordbook'

const tabs = ['all', 'word', 'phrase', 'sentence', 'review', 'difficult'] as const
type TabType = (typeof tabs)[number]

export default async function WordbookPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; tab?: string }>
}) {
  const resolvedSearchParams = (await searchParams) || {}
  const search = resolvedSearchParams.q?.trim() || ''
  const activeTab = (resolvedSearchParams.tab as TabType) || 'all'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-[#efeff1]">
        <AppTopNav isLoggedIn={false} />
        <div className="mx-auto max-w-6xl px-3 py-6">
          <div className="rounded-[28px] border-2 border-[#1f2430] bg-[#f7f7f8] p-8 text-center">
            <h1 className="text-2xl font-bold text-[#111827]">请先登录</h1>
          </div>
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
    query = query.or(`text.ilike.%${search}%,meaning.ilike.%${search}%,original.ilike.%${search}%`)
  }

  if (activeTab === 'word') query = query.eq('type', 'word')
  if (activeTab === 'phrase') query = query.eq('type', 'phrase')
  if (activeTab === 'sentence') query = query.eq('type', 'sentence')
  if (activeTab === 'review') query = query.eq('status', 'review')
  if (activeTab === 'difficult') query = query.eq('status', 'difficult')

  const { data: items = [] } = await query.returns<WordbookItem[]>()

  const { data: allItems = [] } = await supabase
    .from('wordbook_items')
    .select('*')
    .eq('user_id', user.id)
    .returns<WordbookItem[]>()

  const stats = {
    total: allItems.length,
    review: allItems.filter((i) => i.status === 'review').length,
    mastered: allItems.filter((i) => i.status === 'mastered').length,
    difficult: allItems.filter((i) => i.status === 'difficult').length,
  }

  return (
    <main className="min-h-screen bg-[#efeff1]">
      <AppTopNav isLoggedIn />

      <div className="mx-auto max-w-6xl px-3 py-4 md:px-6 md:py-6">
        <div className="space-y-4 md:space-y-6">
          <section className="rounded-[28px] border-2 border-[#1f2430] bg-[#f7f7f8] p-5 md:rounded-[36px] md:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-[#6b7280] md:text-sm">
                  WORDBOOK
                </p>
                <h1 className="mt-2 text-2xl font-extrabold text-[#111827] md:mt-3 md:text-5xl">
                  单词本
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4b5563] md:text-lg md:leading-7">
                  收集你在日常记录、翻译、跟读中遇到的真实表达。
                </p>
              </div>

              <div className="flex flex-wrap gap-2 md:gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-full border-2 border-[#1f2430] bg-white px-4 py-2.5 text-sm font-semibold text-[#111827]"
                >
                  返回首页
                </Link>
                <Link
                  href="/review"
                  className="inline-flex items-center justify-center rounded-full border-2 border-black bg-black px-4 py-2.5 text-sm font-semibold text-white"
                >
                  去复习
                </Link>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <StatCard title="总收藏" value={stats.total} />
            <StatCard title="待复习" value={stats.review} />
            <StatCard title="已掌握" value={stats.mastered} />
            <StatCard title="发音难点" value={stats.difficult} />
          </section>

          <section className="rounded-[28px] border-2 border-[#1f2430] bg-[#f7f7f8] p-4 md:rounded-[36px] md:p-6">
            <form className="flex flex-col gap-4">
              <input
                name="q"
                defaultValue={search}
                placeholder="搜索单词、短语、句子"
                className="w-full rounded-full border-2 border-[#1f2430] bg-white px-4 py-3 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
              />

              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => {
                  const labelMap: Record<TabType, string> = {
                    all: '全部',
                    word: '单词',
                    phrase: '短语',
                    sentence: '句子',
                    review: '待复习',
                    difficult: '困难项',
                  }

                  const active = activeTab === tab

                  return (
                    <button
                      key={tab}
                      type="submit"
                      name="tab"
                      value={tab}
                      className={`rounded-full border-2 px-4 py-2 text-sm font-semibold ${
                        active
                          ? 'border-black bg-black text-white'
                          : 'border-[#1f2430] bg-white text-[#111827]'
                      }`}
                    >
                      {labelMap[tab]}
                    </button>
                  )
                })}
              </div>
            </form>
          </section>

          <section className="space-y-3 md:space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-[28px] border-2 border-[#1f2430] bg-[#f7f7f8] p-4 md:rounded-[36px] md:p-6"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-extrabold text-[#111827] md:text-2xl">
                      {item.text}
                    </h3>

                    <span className="rounded-full border border-[#c7cbd4] bg-white px-3 py-1 text-xs font-semibold text-[#111827]">
                      {typeText(item.type)}
                    </span>

                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusChip(item.status)}`}>
                      {statusText(item.status)}
                    </span>
                  </div>

                  <p className="text-base text-[#374151] md:text-lg">{item.meaning}</p>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#c7cbd4] bg-white px-3 py-1 text-xs text-[#4b5563]">
                      来源：{item.source}
                    </span>
                    <span className="rounded-full border border-[#c7cbd4] bg-white px-3 py-1 text-xs text-[#4b5563]">
                      场景：{item.scene}
                    </span>
                  </div>

                  {item.original && (
                    <p className="text-sm leading-6 text-[#6b7280]">
                      原句：{item.original}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <SpeakButton text={item.text} label="播放" />
                    <SpeakButton text={item.original || item.text} label="原句发音" />
                    <Link
                      href={buildSinglePracticeHref(item)}
                      className="inline-flex items-center justify-center rounded-full border-2 border-black bg-black px-4 py-2 text-sm font-semibold text-white"
                    >
                      练习这条
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div className="rounded-[28px] border-2 border-[#1f2430] bg-[#f7f7f8] p-8 text-center">
                <h3 className="text-xl font-bold text-[#111827]">没有找到内容</h3>
                <p className="mt-2 text-sm text-[#6b7280]">先添加一些内容进单词本。</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-[24px] border-2 border-[#1f2430] bg-[#f7f7f8] p-4 md:rounded-[32px] md:p-6">
      <p className="text-xs font-semibold text-[#6b7280] md:text-sm">{title}</p>
      <p className="mt-2 text-2xl font-extrabold text-[#111827] md:mt-3 md:text-4xl">{value}</p>
    </div>
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