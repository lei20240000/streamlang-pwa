'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type AppTopNavProps = {
  isLoggedIn?: boolean
  email?: string | null
  compact?: boolean
}

const navItems = [
  { href: '/', label: '首屏' },
  { href: '/dashboard', label: '训练台' },
  { href: '/wordbook', label: '单词本' },
  { href: '/review', label: '复习' },
  { href: '/pricing', label: '会员' },
]

export default function AppTopNav({
  isLoggedIn = false,
  email = null,
  compact = true,
}: AppTopNavProps) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color:var(--card)]/92 backdrop-blur">
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 ${
          compact ? 'h-14' : 'h-16'
        } md:px-5`}
      >
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <Link
            href="/"
            className="shrink-0 text-[22px] font-extrabold tracking-tight text-[var(--fg)] md:text-[24px]"
          >
            StreamLang
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/' && pathname?.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-[var(--fg)] text-white'
                      : 'border border-[var(--border)] bg-white text-[var(--fg-muted)] hover:bg-[var(--soft)]'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          {email ? (
            <span className="hidden max-w-[220px] truncate text-xs text-[var(--fg-muted)] md:block">
              {email}
            </span>
          ) : null}

          {isLoggedIn ? (
            <Link
              href="/settings"
              className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--fg-muted)] hover:bg-[var(--soft)]"
            >
              设置
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[var(--fg)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              登录 / 注册
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}