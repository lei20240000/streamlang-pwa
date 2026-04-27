import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import AppTopNav from '@/components/AppTopNav'
import SpeakButton from '@/components/SpeakButton'
import { createClient } from '@/lib/supabase/server'
import type { ItemType, WordbookItem } from '@/types/wordbook'

function typeText(type: ItemType) {
  if (type === 'word') return '单词'
  if (type === 'phrase') return '短语'
  return '句子'
}

function buildPracticeHref(item: WordbookItem) {
  const params = new URLSearchParams()

  params.set('id', item.id)
  params.set('text', item.text || '')
  params.set('meaning', item.meaning || '')
  params.set('type', item.type || 'sentence')

  return `/review/session?${params.toString()}`
}

async function markAsFamiliar(formData: FormData) {
  'use server'

  const id = String(formData.get('id') || '')

  if (!id) return

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const { error } = await supabase
    .from('wordbook_items')
    .update({
      status: 'mastered',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[wordbook] mark familiar error:', error)
    return
  }

  revalidatePath('/wordbook')
  revalidatePath('/review')
}

export default async function WordbookPage() {
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
              登录后才能查看和保存你的单词本。
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
    console.error('[wordbook] load items error:', error)
  }

  const items: WordbookItem[] = data ?? []

  const sentenceCount = items.filter((item) => item.type === 'sentence').length
  const wordCount = items.filter((item) => item.type === 'word').length
  const phraseCount = items.filter((item) => item.type === 'phrase').length

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <AppTopNav isLoggedIn email={user.email || null} />

      <div className="mx-auto max-w-4xl px-3 py-4 md:px-6 md:py-6">
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
                  只保留你还需要练习的表达。熟悉后会从这里移除。
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

          <section className="grid grid-cols-3 gap-3">
            <StatCard title="句子" value={sentenceCount} />
            <StatCard title="单词" value={wordCount} />
            <StatCard title="短语" value={phraseCount} />
          </section>

          <section className="space-y-3">
            {items.map((item) => (
              <article key={item.id} className="app-card p-4 md:p-5">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-medium text-[var(--fg-muted)]">
                          {typeText(item.type)}
                        </span>
                      </div>

                      <h2 className="break-words text-2xl font-extrabold leading-snug md:text-3xl">
                        {item.text}
                      </h2>

                      {item.meaning ? (
                        <p className="mt-3 break-words text-base leading-7 text-[var(--fg-muted)]">
                          {item.meaning}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <form action={markAsFamiliar}>
                      <input type="hidden" name="id" value={item.id} />

                      <button type="submit" className="btn-secondary px-4 py-2 text-sm">
                        熟悉
                      </button>
                    </form>

                    <SpeakButton
                      text={item.text}
                      label="跟读"
                      className="btn-secondary px-4 py-2 text-sm"
                    />

                    <Link
                      href={buildPracticeHref(item)}
                      className="btn-primary px-4 py-2 text-sm"
                    >
                      练习
                    </Link>
                  </div>
                </div>
              </article>
            ))}

            {items.length === 0 ? (
              <section className="app-card p-8 text-center">
                <h2 className="text-xl font-bold">当前没有待练习内容</h2>

                <p className="mt-3 text-sm leading-7 text-[var(--fg-muted)]">
                  从训练台生成表达后，会自动加入单词本。
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

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="app-card p-4 text-center">
      <p className="text-xs font-medium text-[var(--fg-muted)]">{title}</p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
    </div>
  )
}