import { Suspense } from 'react'
import ReviewSessionClient from './ReviewSessionClient'

export default function ReviewSessionPage() {
  return (
    <Suspense fallback={<ReviewSessionLoading />}>
      <ReviewSessionClient />
    </Suspense>
  )
}

function ReviewSessionLoading() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
        <section className="app-card p-5 sm:p-6">
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--fg-muted)]">
            Review Session
          </div>

          <h1 className="mt-3 text-2xl font-black tracking-tight text-[var(--fg)] sm:text-3xl">
            正在加载复习训练
          </h1>

          <p className="mt-2 text-sm leading-6 text-[var(--fg-muted)]">
            请稍等，正在读取你的复习内容。
          </p>
        </section>
      </div>
    </main>
  )
}