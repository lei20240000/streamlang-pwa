'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      })

      if (error) {
        setError(error.message)
        return
      }

      setMessage('注册成功，请先去邮箱点击验证链接。验证后会自动回到训练台。')
    } catch {
      setError('注册失败，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8">
      <div className="mx-auto max-w-md rounded-[28px] border bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-3 inline-flex rounded-full bg-[#eef2ff] px-3 py-1 text-sm font-semibold text-[#4338ca]">
          注册即领 7 天试用
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
          创建账号
        </h1>

        <p className="mt-3 text-sm leading-7 text-[#667085]">
          注册后可领取 7 天试用期，保存训练记录，继续跟读和挑战，并进入完整训练台。
        </p>

        <form onSubmit={handleSignup} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#4b5563]">
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 w-full rounded-2xl border border-[#d1d5db] px-4 outline-none focus:border-black"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#4b5563]">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-12 w-full rounded-2xl border border-[#d1d5db] px-4 outline-none focus:border-black"
              placeholder="至少 6 位"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? '注册中...' : '注册即领 7 天试用'}
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
          已有账号？
          <Link href="/login" className="ml-1 font-semibold text-black underline-offset-4 hover:underline">
            去登录
          </Link>
        </div>
      </div>
    </main>
  )
}