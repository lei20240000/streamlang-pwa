import Link from 'next/link'

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        <nav style={{ padding: 10 }}>
          <Link href="/">首页</Link> | 
          <Link href="/wordbook">单词本</Link> | 
          <Link href="/review">复习</Link> | 
          <Link href="/subscribe">会员</Link> | 
          <Link href="/settings">设置</Link>
        </nav>

        {children}
      </body>
    </html>
  )
}