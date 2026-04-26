import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const next = url.searchParams.get('next') || '/dashboard'

  return NextResponse.redirect(new URL(next, url.origin))
}

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: 'sync-user is handled by /api/me',
  })
}