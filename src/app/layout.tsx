import type { Metadata, Viewport } from 'next'
import './globals.css'
import UiLanguageBoot from '@/components/UiLanguageBoot'

export const metadata: Metadata = {
  title: 'StreamLang',
  description: '不是翻译器，是训练入口。',
  applicationName: 'StreamLang',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'StreamLang',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#f5f7fb',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <UiLanguageBoot />
        {children}
      </body>
    </html>
  )
}