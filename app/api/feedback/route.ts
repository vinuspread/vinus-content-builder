import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export const maxDuration = 120
import { supabaseServer } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'
import { FEEDBACK_SYSTEM_PROMPT, buildFeedbackUserPrompt } from '@/lib/prompts/feedback'
import type { GenerateResult } from '@/types'

export async function POST(req: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { generatedContentId?: string; feedback?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { generatedContentId, feedback } = body
  if (!generatedContentId || !feedback?.trim()) {
    return NextResponse.json({ error: 'generatedContentId and feedback required' }, { status: 400 })
  }

  console.log('[feedback] start id:', generatedContentId)

  const { data: existing, error: fetchError } = await supabaseServer
    .from('generated_contents')
    .select('*')
    .eq('id', generatedContentId)
    .single()

  if (fetchError) {
    console.error('[feedback] supabase fetch error:', fetchError.message)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }
  if (!existing) return NextResponse.json({ error: 'Content not found' }, { status: 404 })

  console.log('[feedback] fetched content, calling Claude...')

  const userPrompt = buildFeedbackUserPrompt(
    {
      contentTitle: existing.content_title,
      coreMessage: existing.core_message,
      carousel: Array.isArray(existing.carousel_content) ? existing.carousel_content : [],
      instagramCaption: existing.instagram_caption,
      hashtags: Array.isArray(existing.hashtags) ? existing.hashtags : [],
    },
    feedback
  )

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: FEEDBACK_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  console.log('[feedback] Claude done, stop_reason:', msg.stop_reason)

  const raw = (msg.content[0] as { type: string; text: string }).text
  console.log('[feedback] raw[:300]:', raw.slice(0, 300))

  // 코드 펜스 안의 JSON 우선 추출, 없으면 { } 직접 추출
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : raw.match(/\{[\s\S]*\}/)?.[0]
  if (!jsonStr) {
    console.error('[feedback] no JSON found in response')
    return NextResponse.json({ error: 'Invalid Claude response' }, { status: 500 })
  }

  let result: GenerateResult
  try {
    result = JSON.parse(jsonStr) as GenerateResult
  } catch {
    const fixed = jsonStr.replace(/"((?:[^"\\]|\\[\s\S])*)"/g, (match) =>
      match.replace(/\n/g, '\\n').replace(/\r/g, '\\r')
    )
    try {
      result = JSON.parse(fixed) as GenerateResult
    } catch (e2) {
      console.error('[feedback] JSON parse error after fix:', e2, 'jsonStr[:200]:', jsonStr.slice(0, 200))
      return NextResponse.json({ error: 'Failed to parse Claude response' }, { status: 500 })
    }
  }

  if (!Array.isArray(result.carousel) || result.carousel.length !== 6) {
    console.error('[feedback] carousel length:', result.carousel?.length)
    return NextResponse.json({ error: `Carousel must have exactly 6 cards, got ${result.carousel?.length ?? 0}` }, { status: 500 })
  }

  console.log('[feedback] updating supabase...')

  const { error } = await supabaseServer
    .from('generated_contents')
    .update({
      content_title: result.contentTitle,
      core_message: result.coreMessage,
      carousel_content: result.carousel,
      instagram_caption: result.instagramCaption,
      hashtags: result.hashtags,
    })
    .eq('id', generatedContentId)

  if (error) {
    console.error('[feedback] supabase update error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('[feedback] done')
  return NextResponse.json({ ok: true })
}
