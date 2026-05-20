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
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })
  } catch (e) {
    console.error('[blog/generate] Claude error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Claude API error' }, { status: 500 })
  }

  console.log('[blog/generate] Claude done, stop_reason:', msg.stop_reason)

  const raw = (msg.content[0] as { type: string; text: string }).text
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : raw.match(/\{[\s\S]*\}/)?.[0]
  if (!jsonStr) {
    console.error('[blog/generate] no JSON in response, raw[:200]:', raw.slice(0, 200))
    return NextResponse.json({ error: 'Invalid Claude response' }, { status: 500 })
  }

  let result: BlogGenerateResult
  try {
    result = JSON.parse(jsonStr)
  } catch (e) {
    console.error('[blog/generate] JSON parse error:', e)
    return NextResponse.json({ error: 'Failed to parse Claude response' }, { status: 500 })
  }

  if (!result.blogTitle || !result.blogContent) {
    console.error('[blog/generate] missing fields:', result)
    return NextResponse.json({ error: 'Invalid response structure' }, { status: 500 })
  }

  console.log('[blog/generate] upserting...')

  const { data: blog, error: upsertError } = await supabaseServer
    .from('blog_contents')
    .upsert(
      {
        generated_content_id: generatedContentId,
        blog_title: result.blogTitle,
        blog_content: result.blogContent,
      },
      { onConflict: 'generated_content_id' }
    )
    .select('id')
    .single()

  if (upsertError) {
    console.error('[blog/generate] upsert error:', upsertError.message)
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  console.log('[blog/generate] done, id:', blog.id)
  return NextResponse.json({ id: blog.id })
}
