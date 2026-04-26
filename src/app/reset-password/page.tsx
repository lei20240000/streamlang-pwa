'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      setMessage('密码已更新，正在跳转到登录页...')
      setTimeout(() => {
        router.push('/login')
      }, 1200)
    } catch {
      setError('重置失败，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8">
      <div className="mx-auto max-w-md rounded-[28px] border bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#111827]">
          重置密码
        </h1>

        <form onSubmit={handleUpdate} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#4b5563]">
              新密码
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-2xl border border-[#d1d5db] px-4 outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#4b5563]">
              确认新密码
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12 w-full rounded-2xl border border-[#d1d5db] px-4 outline-none focus:border-black"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? '提交中...' : '更新密码'}
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
      </div>
    </main>
  )
}