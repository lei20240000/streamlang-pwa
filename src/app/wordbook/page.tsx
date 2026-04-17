'use client'

import { useEffect, useState } from 'react'

type WordItem = {
  id: string
  word: string
  meaning: string
  created_at: string
}

export default function WordbookPage() {
  const [list, setList] = useState<WordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [example, setExample] = useState('')
  const [loadingExample, setLoadingExample] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/wordbook')
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || '加载失败')
          return
        }

        // 👉 去重（核心）
        const uniqueMap = new Map()
        for (const item of data.items || []) {
          if (!uniqueMap.has(item.word)) {
            uniqueMap.set(item.word, item)
          }
        }

        setList(Array.from(uniqueMap.values()))
      } catch (e) {
        setError('网络错误')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // 👉 发音
  const playVoice = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    window.speechSynthesis.speak(utterance)
  }

  // 👉 AI生成例句
  const generateExample = async (word: string) => {
    setLoadingExample(true)
    setExample('')

    const res = await fetch('/api/example', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word })
    })

    const data = await res.json()

    if (res.ok) {
      setExample(data.example)
    } else {
      setExample('生成失败')
    }

    setLoadingExample(false)
  }

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 20 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 20 }}>
        单词本
      </h1>

      {loading && <p>加载中...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && list.length === 0 && <p>还没有单词</p>}

      {list.map((item) => (
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
          <div style={{ fontSize: 20, fontWeight: 600 }}>
            {item.word}
          </div>

          <div style={{ color: '#666', marginBottom: 10 }}>
            {item.meaning}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => playVoice(item.word)}>
              🔊 发音
            </button>

            <button onClick={() => generateExample(item.word)}>
              ✨ 例句
            </button>
          </div>
        </div>
      ))}

      {loadingExample && <p>生成中...</p>}

      {example && (
        <div
          style={{
            marginTop: 20,
            padding: 15,
            background: '#f0f0f0',
            borderRadius: 10
          }}
        >
          <strong>例句：</strong>
          <div>{example}</div>
        </div>
      )}
    </div>
  )
}