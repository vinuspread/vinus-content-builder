import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export const maxDuration = 120
import { supabaseServer } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'
import { GENERATION_SYSTEM_PROMPT, buildGenerationUserPrompt } from '@/lib/prompts/generation'
import type { GenerateResult } from '@/types'

export async function POST(req: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sourceContentId } = await req.json()
  if (!sourceContentId) {
    return NextResponse.json({ error: 'sourceContentId required' }, { status: 400 })
  }

  const { data: source } = await supabaseServer
    .from('collected_contents')
    .select('*, content_type:content_types(id, name)')
    .eq('id', sourceContentId)
    .single()

  if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 })

  const contentTypeName = (source.content_type as { name: string } | null)?.name ?? '실무 디자인 인사이트'

  const userPrompt = buildGenerationUserPrompt(
    contentTypeName,
    source.title ?? '',
    source.caption ?? '',
    Array.isArray(source.keywords) ? source.keywords : [],
    source.original_url
  )

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: GENERATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = (msg.content[0] as { type: string; text: string }).text
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Invalid Claude response' }, { status: 500 })

  const result: GenerateResult = JSON.parse(jsonMatch[0])

  if (!Array.isArray(result.carousel) || result.carousel.length < 4) {
    return NextResponse.json({ error: `Carousel must have at least 4 cards, got ${result.carousel?.length ?? 0}` }, { status: 500 })
  }

  const { data: generated, error } = await supabaseServer
    .from('generated_contents')
    .insert({
      source_content_id: sourceContentId,
      content_type_id: source.content_type_id,
      content_title: result.contentTitle,
      core_message: result.coreMessage,
      carousel_content: result.carousel,
      instagram_caption: result.instagramCaption,
      hashtags: result.hashtags,
      original_url: source.original_url,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: generated.id })
}
