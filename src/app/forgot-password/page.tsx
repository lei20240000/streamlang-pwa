'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const redirectTo = `${window.location.origin}/reset-password`

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (error) {
        setError(error.message)
        return
      }

      setMessage('重置密码邮件已发送，请去邮箱查看。')
    } catch {
      setError('发送失败，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8">
      <div className="mx-auto max-w-md rounded-[28px] border bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
          忘记密码
        </h1>

        <p className="mt-3 text-sm leading-7 text-[#667085]">
          输入你的注册邮箱，我们会发送重置密码链接。
        </p>

        <form onSubmit={handleReset} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#4b5563]">
              邮箱
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-2xl border border-[#d1d5db] px-4 outline-none focus:border-black"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? '发送中...' : '发送重置邮件'}
          </button>
        </form>

        {message ? (
          <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 text-sm text-[#667085]">
          想起来了？
          <Link href="/login" className="ml-1 font-semibold text-black underline-offset-4 hover:underline">
            返回登录
          </Link>
        </div>
      </div>
    </main>
  )
}