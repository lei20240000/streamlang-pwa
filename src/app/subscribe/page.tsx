'use client'

export default function SubscribePage() {
  const checkoutUrl = 'https://kingstream.lemonsqueezy.com/checkout/buy/54eec727-1c41-489d-854e-062134ece2a3'

  return (
    <div style={{ maxWidth: 600, margin: '50px auto', padding: 20 }}>
      <h1>升级 Pro</h1>

      <p>解锁全部功能：</p>
      <ul>
        <li>无限翻译</li>
        <li>高级表达</li>
        <li>AI例句</li>
      </ul>

      <button
        onClick={() => window.location.href = checkoutUrl}
        style={{
          marginTop: 20,
          padding: '12px 20px',
          fontSize: 18,
          borderRadius: 8,
          cursor: 'pointer'
        }}
      >
        立即升级（$4.99/月）
      </button>
    </div>
  )
}