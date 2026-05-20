import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'
import { BLOG_GENERATION_SYSTEM_PROMPT, buildBlogFeedbackUserPrompt } from '@/lib/prompts/blog-generation'
import type { BlogGenerateResult } from '@/types'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { blogContentId?: string; feedback?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { blogContentId, feedback } = body
  if (!blogContentId || !feedback?.trim()) {
    return NextResponse.json({ error: 'blogContentId and feedback required' }, { status: 400 })
  }

  console.log('[blog/feedback] start id:', blogContentId)

  const { data: existing, error: fetchError } = await supabaseServer
    .from('blog_contents')
    .select('blog_title, blog_content')
    .eq('id', blogContentId)
    .single()

  if (fetchError) {
    console.error('[blog/feedback] fetch error:', fetchError.message)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }
  if (!existing) return NextResponse.json({ error: 'Blog not found' }, { status: 404 })

  const userPrompt = buildBlogFeedbackUserPrompt(
    existing.blog_title,
    existing.blog_content,
    feedback,
  )

  console.log('[blog/feedback] calling Claude...')

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: BLOG_GENERATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  console.log('[blog/feedback] Claude done')

  const raw = (msg.content[0] as { type: string; text: string }).text
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : raw.match(/\{[\s\S]*\}/)?.[0]
  if (!jsonStr) {
    console.error('[blog/feedback] no JSON in response')
    return NextResponse.json({ error: 'Invalid Claude response' }, { status: 500 })
  }

  let result: BlogGenerateResult
  try {
    result = JSON.parse(jsonStr)
  } catch (e) {
    console.error('[blog/feedback] JSON parse error:', e)
    return NextResponse.json({ error: 'Failed to parse Claude response' }, { status: 500 })
  }

  const { error: updateError } = await supabaseServer
    .from('blog_contents')
    .update({ blog_title: result.blogTitle, blog_content: result.blogContent })
    .eq('id', blogContentId)

  if (updateError) {
    console.error('[blog/feedback] update error:', updateError.message)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  console.log('[blog/feedback] done')
  return NextResponse.json({ ok: true })
}
