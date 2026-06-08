import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'
import { buildBlogGenerationSystemPrompt, buildBlogGenerationUserPrompt } from '@/lib/prompts/blog-generation'
import type { BlogGenerateResult } from '@/types'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { generatedContentId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { generatedContentId } = body
  if (!generatedContentId) {
    return NextResponse.json({ error: 'generatedContentId required' }, { status: 400 })
  }

  console.log('[blog/generate] start id:', generatedContentId)

  const { data: source, error: fetchError } = await supabaseServer
    .from('generated_contents')
    .select('content_title, core_message, carousel_content, instagram_caption')
    .eq('id', generatedContentId)
    .single()

  if (fetchError) {
    console.error('[blog/generate] fetch error:', fetchError.message)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }
  if (!source) return NextResponse.json({ error: 'Content not found' }, { status: 404 })

  const { data: styleRefs } = await supabaseServer
    .from('blog_style_references')
    .select('title, content')
    .order('created_at', { ascending: true })

  const systemPrompt = buildBlogGenerationSystemPrompt(styleRefs ?? [])

  let userPrompt: string
  try {
    userPrompt = buildBlogGenerationUserPrompt(
      source.content_title,
      source.core_message,
      Array.isArray(source.carousel_content) ? source.carousel_content : [],
      source.instagram_caption,
    )
  } catch (e) {
    console.error('[blog/generate] prompt build error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to build prompt' }, { status: 400 })
  }

  console.log('[blog/generate] calling Claude...')

  let msg: Awaited<ReturnType<typeof anthropic.messages.create>>
  try {
    msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })
  } catch (e) {
    console.error('[blog/generate] Claude error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Claude API error' }, { status: 500 })
  }

  console.log('[blog/generate] Claude done, stop_reason:', msg.stop_reason)

  const raw = (msg.content[0] as { type: string; text: string }).text

  const titleMatch = raw.match(/===TITLE===\s*([\s\S]*?)\s*===CONTENT===/)
  const contentMatch = raw.match(/===CONTENT===\s*([\s\S]*)$/)

  if (!titleMatch || !contentMatch) {
    console.error('[blog/generate] missing markers in response, raw[:300]:', raw.slice(0, 300))
    return NextResponse.json({ error: 'Invalid Claude response' }, { status: 500 })
  }

  const result: BlogGenerateResult = {
    blogTitle: titleMatch[1].trim(),
    blogContent: contentMatch[1].trim(),
  }

  if (!result.blogTitle || !result.blogContent) {
    console.error('[blog/generate] missing fields:', result)
    return NextResponse.json({ error: 'Invalid response structure' }, { status: 500 })
  }

  console.log('[blog/generate] checking existing...')

  const { data: existing } = await supabaseServer
    .from('blog_contents')
    .select('id')
    .eq('generated_content_id', generatedContentId)
    .maybeSingle()

  let blogId: string

  if (existing) {
    console.log('[blog/generate] updating existing id:', existing.id)
    const { error: updateError } = await supabaseServer
      .from('blog_contents')
      .update({ blog_title: result.blogTitle, blog_content: result.blogContent })
      .eq('id', existing.id)
    if (updateError) {
      console.error('[blog/generate] update error:', updateError.message)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    blogId = existing.id
  } else {
    console.log('[blog/generate] inserting new...')
    const { data: created, error: insertError } = await supabaseServer
      .from('blog_contents')
      .insert({ generated_content_id: generatedContentId, blog_title: result.blogTitle, blog_content: result.blogContent })
      .select('id')
      .single()
    if (insertError) {
      console.error('[blog/generate] insert error:', insertError.message)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
    blogId = created.id
  }

  console.log('[blog/generate] done, id:', blogId)
  return NextResponse.json({ id: blogId })
}
