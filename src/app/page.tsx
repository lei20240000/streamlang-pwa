'use client'

import { useState } from 'react'

type ResultType = {
  basic: string
  natural: string
  native: string
  keywords: string[]
  pinyin: string
}

export default function Home() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<ResultType | null>(null)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const examples = [
    'I am tired.',
    'I went to eat with my friend.',
    'Thank you very much.',
    'I want to go home.'
  ]

  const playVoice = (text: string) => {
    if (!text) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    window.speechSynthesis.speak(utterance)
  }

  const handleTranslate = async () => {
    if (!input.trim()) {
      setError('请输入一句外语')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: input,
          lang: navigator.language
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(JSON.stringify(data, null, 2))
        console.log('后端返回错误完整内容:', data)
        return
      }

      setResult(data)

      const saveRes = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: input,
          basic: data.basic,
          natural_text: data.natural,
          native_text: data.native,
          keywords: data.keywords,
          pinyin: data.pinyin
        })
      })

      const saveData = await saveRes.json()

      if (!saveRes.ok) {
        console.log('保存失败:', saveData)
        setError(JSON.stringify(saveData, null, 2))
        return
      }

      const newCount = count + 1
      setCount(newCount)

      if (newCount >= 3) {
        alert('继续学习你的中文 → Pro')
      }
    } catch (e) {
      setError('网络错误，请稍后再试')
      console.log(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '50px auto', padding: 20 }}>
      <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 24 }}>
        中文学习助手
      </h1>

      <div style={{ marginBottom: 12 }}>
        {examples.map((item) => (
          <button
            key={item}
            onClick={() => setInput(item)}
            style={{
              marginRight: 8,
              marginBottom: 8,
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: 8,
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="输入一句英文"
        style={{
          width: '100%',
          padding: 14,
          fontSize: 18,
          border: '1px solid #ccc',
          borderRadius: 8
        }}
      />

      <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
        <button
          onClick={handleTranslate}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: 18,
            borderRadius: 8,
            border: '1px solid #aaa',
            cursor: 'pointer'
          }}
        >
          {loading ? '翻译中...' : '翻译'}
        </button>

        {result && (
          <button
            onClick={() => playVoice(result.basic)}
            style={{
              padding: '10px 20px',
              fontSize: 18,
              borderRadius: 8,
              border: '1px solid #aaa',
              cursor: 'pointer'
            }}
          >
            播放语音
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: 20,
            padding: 12,
            background: '#ffeaea',
            border: '1px solid #ffbdbd',
            borderRadius: 8,
            color: '#b00020',
            whiteSpace: 'pre-wrap'
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: 24,
            padding: 20,
            background: '#f7f7f7',
            borderRadius: 12,
            border: '1px solid #ddd'
          }}
        >
          <h2 style={{ marginBottom: 16 }}>学习结果</h2>

          <div style={{ marginBottom: 12 }}>
            <strong>1. 基础表达：</strong>
            <div>{result.basic}</div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <strong>2. 更自然表达：</strong>
            <div>{result.natural}</div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <strong>3. 更地道表达：</strong>
            <div>{result.native}</div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <strong>关键词：</strong>
            <div>{result.keywords.join(' / ')}</div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <strong>拼音：</strong>
            <div>{result.pinyin}</div>
          </div>
        </div>
      )}
    </div>
  )
}