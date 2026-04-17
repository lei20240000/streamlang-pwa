'use client'

import { useEffect, useState } from 'react'

export default function TikTokPage() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const res = await fetch('/api/tiktok-content')
    const data = await res.json()

    if (res.ok) {
      setText(data.text)
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const copy = () => {
    navigator.clipboard.writeText(text)
    alert('已复制，可直接发TikTok')
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 20 }}>
      <h1>TikTok 内容生成</h1>

      {loading ? (
        <p>生成中...</p>
      ) : (
        <>
          <textarea
            value={text}
            readOnly
            style={{
              width: '100%',
              height: 300,
              padding: 10,
              fontSize: 16
            }}
          />

          <button
            onClick={copy}
            style={{ marginTop: 20, padding: '10px 20px' }}
          >
            复制内容
          </button>
        </>
      )}
    </div>
  )
}