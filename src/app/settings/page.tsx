'use client'

import { useState } from 'react'

export default function Settings() {
  const [push, setPush] = useState(false)

  return (
    <div style={{ padding: 30 }}>
      <h1>设置</h1>

      <label>
        推送通知
        <input
          type="checkbox"
          checked={push}
          onChange={() => setPush(!push)}
        />
      </label>
    </div>
  )
}