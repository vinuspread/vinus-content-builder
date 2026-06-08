import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'
import { buildBlogGenerationSystemPrompt, buildBlogFeedbackUserPrompt } from '@/lib/prompts/blog-generation'
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

  let msg: Awaited<ReturnType<typeof anthropic.messages.create>>
  try {
    msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: buildBlogGenerationSystemPrompt([]),
      messages: [{ role: 'user', content: userPrompt }],
    })
  } catch (e) {
    console.error('[blog/feedback] Claude error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Claude API error' }, { status: 500 })
  }

  console.log('[blog/feedback] Claude done')

  const raw = (msg.content[0] as { type: string; text: string }).text

  const titleMatch = raw.match(/===TITLE===\s*([\s\S]*?)\s*===CONTENT===/)
  const contentMatch = raw.match(/===CONTENT===\s*([\s\S]*)$/)

  if (!titleMatch || !contentMatch) {
    console.error('[blog/feedback] missing markers in response, raw[:300]:', raw.slice(0, 300))
    return NextResponse.json({ error: 'Invalid Claude response' }, { status: 500 })
  }

  const result: BlogGenerateResult = {
    blogTitle: titleMatch[1].trim(),
    blogContent: contentMatch[1].trim(),
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
