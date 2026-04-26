import Link from 'next/link'
import AppTopNav from '@/components/AppTopNav'
import { createClient } from '@/lib/supabase/server'
import { buildBatchPracticeHref, buildSinglePracticeHref } from '@/lib/review-session'
import type { ItemStatus, WordbookItem } from '@/types/wordbook'

function getTodayReviewItems(items: WordbookItem[]) {
  const now = new Date().toISOString()

  const due = items.filter(
    (item) =>
      item.status === 'difficult' ||
      item.status === 'review' ||
      item.status === 'new' ||
      !item.next_review_at ||
      item.next_review_at <= now
  )

  const difficultItems = due.filter((item) => item.status === 'difficult')
  const reviewItems = due.filter((item) => item.status === 'review')
  const newItems = due.filter((item) => item.status === 'new')

  const combined = [...difficultItems, ...reviewItems, ...newItems]
  const unique = combined.filter(
    (item, index, self) => self.findIndex((x) => x.id === item.id) === index
  )

  return unique.slice(0, 5)
}

export default async function ReviewPage() {
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

const { data: items, error: itemsError } = await supabase
  .from('wordbook_items')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .returns<WordbookItem[]>()

if (itemsError) {
  console.error('[review] load wordbook_items error:', itemsError)
}

const safeItems = items ?? []
const todayItems = getTodayReviewItems(safeItems)
  const difficultCount = todayItems.filter((item) => item.status === 'difficult').length
  const newCount = todayItems.filter((item) => item.status === 'new').length
  const reviewCount = todayItems.filter((item) => item.status === 'review').length
  const estimatedMinutes = Math.max(3, todayItems.length * 2)

  return (
    <main className="min-h-screen bg-[#efeff1]">
      <AppTopNav isLoggedIn />

      <div className="mx-auto max-w-6xl px-3 py-4 md:px-6 md:py-6">
        <div className="space-y-4 md:space-y-6">
          <section className="rounded-[28px] border-2 border-[#1f2430] bg-[#f7f7f8] p-5 md:rounded-[36px] md:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-[#6b7280] md:text-sm">
                  REVIEW
                </p>
                <h1 className="mt-2 text-2xl font-extrabold text-[#111827] md:mt-3 md:text-5xl">
                  复习
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4b5563] md:text-lg md:leading-7">
                  今日复习内容直接来自你的单词本。
                </p>
              </div>

              <div className="flex flex-wrap gap-2 md:gap-3">
                <Link
                  href="/wordbook"
                  className="inline-flex items-center justify-center rounded-full border-2 border-[#1f2430] bg-white px-4 py-2.5 text-sm font-semibold text-[#111827]"
                >
                  打开单词本
                </Link>

                {todayItems.length > 0 && (
                  <Link
                    href={buildBatchPracticeHref(todayItems)}
                    className="inline-flex items-center justify-center rounded-full border-2 border-black bg-black px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    开始今日复习
                  </Link>
                )}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            <OverviewCard title="今日待复习" value={`${todayItems.length} 条`} note="从单词本自动挑选" />
            <OverviewCard title="预计时间" value={`${estimatedMinutes} 分钟`} note="轻量完成即可" />
            <OverviewCard
              title="重点分布"
              value={`${difficultCount}/${reviewCount}/${newCount}`}
              note="困难项 / 待复习 / 新加入"
            />
          </section>

          <section className="rounded-[28px] border-2 border-[#1f2430] bg-[#f7f7f8] p-5 md:rounded-[36px] md:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-[#6b7280] md:text-sm">
                  TODAY
                </p>
                <h2 className="mt-2 text-2xl font-extrabold text-[#111827] md:mt-3 md:text-4xl">
                  今日复习已准备好
                </h2>
                <p className="mt-3 text-sm text-[#4b5563] md:text-lg">
                  这组题来自你的单词本和复习状态。
                </p>
              </div>

              {todayItems.length > 0 ? (
                <Link
                  href={buildBatchPracticeHref(todayItems)}
                  className="inline-flex items-center justify-center rounded-full border-2 border-black bg-black px-5 py-3 text-sm font-semibold text-white"
                >
                  开始今日复习
                </Link>
              ) : (
                <Link
                  href="/wordbook"
                  className="inline-flex items-center justify-center rounded-full border-2 border-[#1f2430] bg-white px-5 py-3 text-sm font-semibold text-[#111827]"
                >
                  去单词本添加内容
                </Link>
              )}
            </div>
          </section>

          <section className="rounded-[28px] border-2 border-[#1f2430] bg-[#f7f7f8] p-4 md:rounded-[36px] md:p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-[#111827] md:text-2xl">今日推荐题目</h2>
              <p className="mt-1 text-sm text-[#6b7280] md:text-base">
                点哪条就练哪条。
              </p>
            </div>

            {todayItems.length === 0 ? (
              <div className="rounded-[24px] border-2 border-[#1f2430] bg-white p-6 text-center">
                <h3 className="text-lg font-bold text-[#111827]">当前没有待复习内容</h3>
                <p className="mt-2 text-sm text-[#6b7280]">先去单词本添加一些内容。</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-[24px] border-2 border-[#1f2430] bg-white p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-bold text-[#111827]">{item.text}</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusChip(item.status)}`}>
                          {statusText(item.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[#4b5563]">{item.meaning}</p>
                      {item.original && <p className="mt-2 text-sm text-[#6b7280]">{item.original}</p>}
                    </div>

                    <Link
                      href={buildSinglePracticeHref(item)}
                      className="inline-flex w-fit items-center justify-center rounded-full border-2 border-black bg-black px-4 py-2 text-sm font-semibold text-white"
                    >
                      立即练习
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

function OverviewCard({
  title,
  value,
  note,
}: {
  title: string
  value: string
  note: string
}) {
  return (
    <div className="rounded-[24px] border-2 border-[#1f2430] bg-[#f7f7f8] p-4 md:rounded-[32px] md:p-6">
      <p className="text-xs font-semibold text-[#6b7280] md:text-sm">{title}</p>
      <p className="mt-2 text-2xl font-extrabold text-[#111827] md:mt-3 md:text-4xl">{value}</p>
      <p className="mt-1 text-xs text-[#9ca3af] md:mt-2 md:text-sm">{note}</p>
    </div>
  )
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