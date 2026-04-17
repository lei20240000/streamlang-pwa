'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log('login result:', { data, error })

    if (error) {
      setLoading(false)
      setMsg(error.message)
      return
    }

    const sessionRes = await supabase.auth.getSession()
    console.log('browser session after login:', sessionRes)

    setLoading(false)

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">登录</h1>

      <form onSubmit={handleLogin} className="space-y-4">
        <input
          className="w-full border rounded px-3 py-2"
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full border rounded px-3 py-2"
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="w-full rounded bg-black text-white py-2 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>

      {msg ? <p className="mt-4 text-sm text-red-600">{msg}</p> : null}

      <p className="mt-6 text-sm">
        还没有账号？ <a className="underline" href="/signup">去注册</a>
      </p>
    </div>
  )
}