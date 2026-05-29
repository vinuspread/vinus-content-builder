import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'
import { GENERATION_SYSTEM_PROMPT } from '@/lib/prompts/generation'
import { buildManualGenerationUserPrompt } from '@/lib/prompts/manual-generation'
import { tavilySearch } from '@/lib/tavily'
import type { GenerateResult } from '@/types'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { topic?: string; content?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { topic, content = '' } = body
  if (!topic?.trim()) {
    return NextResponse.json({ error: 'topic required' }, { status: 400 })
  }

  const searchResults = await tavilySearch(topic)

  const userPrompt = buildManualGenerationUserPrompt(topic, content, searchResults)

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 5000,
    system: GENERATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = (msg.content[0] as { type: string; text: string }).text
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Invalid Claude response' }, { status: 500 })

  let result: GenerateResult
  try {
    result = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json({ error: 'Failed to parse Claude response' }, { status: 500 })
  }

  if (!Array.isArray(result.carousel) || result.carousel.length < 4) {
    return NextResponse.json(
      { error: `Carousel must have at least 4 cards, got ${result.carousel?.length ?? 0}` },
      { status: 500 }
    )
  }

  console.log('[manual] inserting to generated_contents, carousel length:', result.carousel.length)

  const { data: generated, error } = await supabaseServer
    .from('generated_contents')
    .insert({
      source_content_id: null,
      content_type_id: null,
      content_title: result.contentTitle,
      core_message: result.coreMessage,
      carousel_content: result.carousel,
      instagram_caption: result.instagramCaption,
      hashtags: result.hashtags,
      original_url: null,
    })
    .select()
    .single()

  if (error) {
    console.error('[manual] insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!generated) {
    console.error('[manual] insert returned no data')
    return NextResponse.json({ error: 'Insert returned no data' }, { status: 500 })
  }
  console.log('[manual] inserted id:', generated.id)
  return NextResponse.json({ id: generated.id })
}
