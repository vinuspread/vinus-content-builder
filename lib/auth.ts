import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'admin_session'
const SESSION_VALUE = 'authenticated'

function signSession(secret: string): string {
  const hmac = createHmac('sha256', secret)
  hmac.update(SESSION_VALUE)
  return SESSION_VALUE + '.' + hmac.digest('hex')
}

function verifySession(token: string, secret: string): boolean {
  const expected = signSession(secret)
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  } catch {
    return false
  }
}

export async function getSession(): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) return false
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return false
  return verifySession(token, secret)
}

export function createSessionToken(): string {
  return signSession(process.env.ADMIN_SESSION_SECRET!)
}

export { SESSION_COOKIE }
