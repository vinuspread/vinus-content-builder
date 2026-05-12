import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const hash = process.env.ADMIN_PASSWORD_HASH
  if (!hash) return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })

  const valid = await bcrypt.compare(password, hash)
  if (!valid) return NextResponse.json({ error: '비밀번호가 틀렸습니다' }, { status: 401 })

  const token = createSessionToken()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(SESSION_COOKIE)
  return res
}
