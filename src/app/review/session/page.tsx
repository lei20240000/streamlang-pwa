import { Suspense } from 'react'
import ReviewSessionClient from './ReviewSessionClient'

export default function ReviewSessionPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
          <div className="mx-auto max-w-5xl px-4 py-8">
            <div className="app-card p-6">
              <div className="text-sm text-[var(--fg-muted)]">
                正在加载复习训练...
              </div>
            </div>
          </div>
        </main>
      }
    >
      <ReviewSessionClient />
    </Suspense>
  )
}