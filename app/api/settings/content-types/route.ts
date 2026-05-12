import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import type { ContentType } from '@/types'

export async function PUT(req: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const types: ContentType[] = await req.json()
  const total = types.filter(t => t.is_active).reduce((s, t) => s + Number(t.target_ratio), 0)
  if (Math.round(total) !== 100) {
    return NextResponse.json({ error: '비율 합계가 100%가 아닙니다' }, { status: 400 })
  }
  for (const type of types) {
    await supabaseServer.from('content_types').update({
      target_ratio: type.target_ratio,
      is_active: type.is_active,
    }).eq('id', type.id)
  }
  return NextResponse.json({ ok: true })
}
