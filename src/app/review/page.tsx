'use client'

import { useEffect, useState } from 'react'

type PhraseItem = {
  id: string
  input: string
  basic: string
  natural_text: string
  native_text: string
  keywords: string[]
  pinyin: string
  created_at: string
}

export default function ReviewPage() {
  const [list, setList] = useState<PhraseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch('/api/review')
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '加载失败')
        return
      }

      setList(data.items || [])
    } catch (e) {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const markDone = async (item: PhraseItem) => {
    setMessage('')

    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phrase_id: item.id,
        input: item.input,
        basic: item.basic,
        keywords: item.keywords
      })
    })

    const data = await res.json()

    if (!res.ok) {
      setMessage(data.error || '提交失败')
      return
    }

    setMessage('已标记为已学，并更新语言图谱')
    setList((prev) => prev.filter((x) => x.id !== item.id))
  }

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 20 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 20 }}>复习练习</h1>

      {loading && <p>加载中...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}

      {!loading && !error && list.length === 0 && <p>暂无待复习内容</p>}

      {!loading &&
        !error &&
        list.map((item) => (
          <div
            key={item.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              background: '#fafafa'
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <strong>原句：</strong> {item.input}
            </div>

            <div style={{ marginBottom: 8 }}>
              <strong>基础表达：</strong> {item.basic}
            </div>

            <div style={{ marginBottom: 8 }}>
              <strong>更自然表达：</strong> {item.natural_text}
            </div>

            <div style={{ marginBottom: 8 }}>
              <strong>更地道表达：</strong> {item.native_text}
            </div>

            <div style={{ marginBottom: 8 }}>
              <strong>关键词：</strong> {item.keywords?.join(' / ')}
            </div>

            <div style={{ marginBottom: 8 }}>
              <strong>拼音：</strong> {item.pinyin}
            </div>

            <button
              onClick={() => markDone(item)}
              style={{
                marginTop: 8,
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #aaa',
                cursor: 'pointer'
              }}
            >
              标记已学
            </button>
          </div>
        ))}
    </div>
  )
}