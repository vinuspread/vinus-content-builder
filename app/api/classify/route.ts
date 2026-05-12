import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'
import { buildClassificationPrompt } from '@/lib/prompts/classification'

export async function POST(req: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const contentId: string | undefined = body.contentId

  // manualTypeId가 있으면 직접 업데이트
  if (contentId && body.manualTypeId !== undefined) {
    await supabaseServer
      .from('collected_contents')
      .update({ content_type_id: body.manualTypeId || null })
      .eq('id', contentId)
    return NextResponse.json({ classified: 1 })
  }

  const query = contentId
    ? supabaseServer.from('collected_contents').select('*').eq('id', contentId)
    : supabaseServer.from('collected_contents').select('*').is('content_type_id', null).limit(50)

  const { data: contents } = await query
  if (!contents || contents.length === 0) {
    return NextResponse.json({ classified: 0 })
  }

  const { data: types } = await supabaseServer
    .from('content_types').select('id, name').eq('is_active', true).order('sort_order')
  const typeMap: Record<number, string> = {}
  if (types) {
    types.forEach((t, i) => { typeMap[i + 1] = t.id })
  }

  let classified = 0
  for (const content of contents) {
    try {
      const prompt = buildClassificationPrompt(
        content.caption ?? content.title ?? '',
        Array.isArray(content.keywords) ? content.keywords : [],
        content.source_name ?? ''
      )
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: prompt }],
      })
      const raw = (msg.content[0] as { type: string; text: string }).text.trim()
      const typeNum = parseInt(raw)
      if (typeNum >= 1 && typeNum <= 5 && typeMap[typeNum]) {
        await supabaseServer
          .from('collected_contents')
          .update({ content_type_id: typeMap[typeNum] })
          .eq('id', content.id)
        classified++
      }
    } catch (e) {
      console.error('Classification error for', content.id, e)
    }
  }

  return NextResponse.json({ classified })
}
