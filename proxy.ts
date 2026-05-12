import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

const SESSION_COOKIE = 'admin_session'
const SESSION_VALUE = 'authenticated'

function isValidSession(token: string): boolean {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) return false
  const hmac = createHmac('sha256', secret)
  hmac.update(SESSION_VALUE)
  const expected = SESSION_VALUE + '.' + hmac.digest('hex')
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  } catch {
    return false
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token || !isValidSession(token)) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
