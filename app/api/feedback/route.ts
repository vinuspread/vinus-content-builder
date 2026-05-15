import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export const maxDuration = 60
import { supabaseServer } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'
import { FEEDBACK_SYSTEM_PROMPT, buildFeedbackUserPrompt } from '@/lib/prompts/feedback'
import type { GenerateResult } from '@/types'

export async function POST(req: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { generatedContentId, feedback } = await req.json()
  if (!generatedContentId || !feedback?.trim()) {
    return NextResponse.json({ error: 'generatedContentId and feedback required' }, { status: 400 })
  }

  const { data: existing } = await supabaseServer
    .from('generated_contents')
    .select('*')
    .eq('id', generatedContentId)
    .single()

  if (!existing) return NextResponse.json({ error: 'Content not found' }, { status: 404 })

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
    max_tokens: 4096,
    system: FEEDBACK_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = (msg.content[0] as { type: string; text: string }).text
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Invalid Claude response' }, { status: 500 })

  const result: GenerateResult = JSON.parse(jsonMatch[0])

  if (!Array.isArray(result.carousel) || result.carousel.length !== 6) {
    return NextResponse.json({ error: `Carousel must have exactly 6 cards, got ${result.carousel?.length ?? 0}` }, { status: 500 })
  }

  const { error } = await supabaseServer
    .from('generated_contents')
    .update({
      content_title: result.contentTitle,
      core_message: result.coreMessage,
      carousel_content: result.carousel,
      instagram_caption: result.instagramCaption,
      hashtags: result.hashtags,
      character_ment: result.characterMent ?? null,
      character_visual: result.characterVisual ?? null,
    })
    .eq('id', generatedContentId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
