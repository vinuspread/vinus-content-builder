import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import type { CollectionFilter } from '@/types'

export async function PUT(req: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const filters: CollectionFilter[] = await req.json()
  for (const f of filters) {
    await supabaseServer.from('collection_filters')
      .update({ filter_value: f.filter_value }).eq('id', f.id)
  }
  return NextResponse.json({ ok: true })
}
