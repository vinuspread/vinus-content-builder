# 블로그 콘텐츠 생성 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카드뉴스(generated_contents)를 원본으로 블로그 아티클(1500~3000자 plain text)을 생성·관리하는 기능을 추가한다.

**Architecture:** `blog_contents` 테이블 신설(카드뉴스 1:1 UNIQUE FK). 블로그 전용 라우트(`/blog`, `/blog/[id]`)와 API(`/api/blog/*`)를 카드뉴스 패턴 그대로 따라 구현. 카드뉴스 상세 우측 패널에 "블로그 생성" 버튼 추가.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, shadcn/ui (Button, Textarea, Label), Supabase, Claude Sonnet 4.6, `cn` from `@/lib/utils`

---

## 파일 구조

| 파일 | 생성/수정 | 역할 |
|------|----------|------|
| `supabase/migrations/20260520_blog_contents.sql` | 생성 | blog_contents 테이블 |
| `types/index.ts` | 수정 | BlogContent 타입 추가 |
| `lib/prompts/blog-generation.ts` | 생성 | 블로그 생성 프롬프트 |
| `app/api/blog/generate/route.ts` | 생성 | 카드뉴스 → 블로그 생성 API |
| `app/api/blog/feedback/route.ts` | 생성 | 피드백 재생성 API |
| `app/api/blog/[id]/route.ts` | 생성 | PATCH(발행 상태), DELETE |
| `app/(admin)/blog/page.tsx` | 생성 | 블로그 목록 서버 컴포넌트 |
| `app/(admin)/blog/client.tsx` | 생성 | 블로그 목록 클라이언트 컴포넌트 |
| `app/(admin)/blog/[id]/page.tsx` | 생성 | 블로그 상세 서버 컴포넌트 |
| `app/(admin)/blog/[id]/client.tsx` | 생성 | 블로그 상세 클라이언트 컴포넌트 |
| `components/admin-nav.tsx` | 수정 | "블로그목록" 메뉴 추가 |
| `app/(admin)/generated/[id]/client.tsx` | 수정 | "블로그 생성" 버튼 추가 |

---

## Task 1: DB 마이그레이션 + 타입 정의

**Files:**
- Create: `supabase/migrations/20260520_blog_contents.sql`
- Modify: `types/index.ts`

- [ ] **Step 1: 마이그레이션 파일 생성**

```sql
-- supabase/migrations/20260520_blog_contents.sql
CREATE TABLE blog_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_content_id UUID NOT NULL UNIQUE REFERENCES generated_contents(id) ON DELETE CASCADE,
  blog_title TEXT NOT NULL,
  blog_content TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_blog_contents_updated_at
  BEFORE UPDATE ON blog_contents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE blog_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON blog_contents FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Supabase 대시보드에서 마이그레이션 실행**

Supabase 프로젝트 → SQL Editor → 위 SQL 붙여넣기 → Run

- [ ] **Step 3: `types/index.ts` 끝에 BlogContent 타입 추가**

파일 끝에 아래를 추가한다:

```typescript
export type BlogContent = {
  id: string
  generated_content_id: string
  blog_title: string
  blog_content: string
  is_published: boolean
  created_at: string
  updated_at: string
  generated_content?: {
    content_title: string | null
    content_type: { name: string } | null
  } | null
}

export type BlogGenerateResult = {
  blogTitle: string
  blogContent: string
}
```

- [ ] **Step 4: TypeScript 확인**

```bash
cd /Users/sungyounghan/project/vinus-content-builder
npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/20260520_blog_contents.sql types/index.ts
git commit -m "feat: add blog_contents table migration and BlogContent type"
```

---

## Task 2: 블로그 생성 프롬프트

**Files:**
- Create: `lib/prompts/blog-generation.ts`

- [ ] **Step 1: `lib/prompts/blog-generation.ts` 생성**

```typescript
import type { CarouselCard } from '@/types'

export const BLOG_GENERATION_SYSTEM_PROMPT = `당신은 바이너스프레드 블로그 필진입니다. 중소기업·소기업·스타트업 실무자를 위한 디자인·브랜딩 아티클을 작성합니다.

## 톤 원칙
- 카드뉴스보다 차분하고 설명적인 문체
- 전문적이지만 어렵지 않은 설명
- 실무 경험이 느껴지는 구체적인 조언
- 작은 브랜드의 현실을 이해하는 말투
- AI처럼 매끈하지 않은 자연스러운 문장

## 절대 사용 금지 표현
- "브랜드 가치를 높입니다"
- "고객 경험을 향상시킵니다"
- "차별화된 이미지를 구축합니다"
- "시각적 완성도를 높입니다"
- "브랜드 아이덴티티를 강화합니다"
- "최적의 솔루션을 제공합니다"
- "시너지를 창출합니다"
- 위와 같은 추상적 마케팅 문구 일체

## 작성 원칙
1. 마크다운 문법 사용 금지 (##, **, - 등 일체 금지)
2. 섹션 구분은 빈 줄(줄바꿈 2회)로만 한다
3. 도입부 → 본문 섹션 3~5개 → 마무리 구조
4. 카드뉴스의 expertView, practical 정보를 본문에 자연스럽게 녹인다
5. 전체 길이는 내용 깊이에 따라 1500~3000자로 자율 조정
6. SEO를 고려한 제목: 핵심 키워드 포함, 30자 이내

## 출력 형식 (반드시 JSON만 반환)
\`\`\`json
{
  "blogTitle": "SEO 제목 (30자 이내)",
  "blogContent": "블로그 본문 전체 (plain text, 줄바꿈으로만 구분)"
}
\`\`\`
`

export function buildBlogGenerationUserPrompt(
  contentTitle: string | null,
  coreMessage: string | null,
  carousel: CarouselCard[],
  instagramCaption: string | null,
): string {
  const cardsText = carousel.map(card => {
    const lines = [
      `[카드 ${card.number} · ${card.role}]`,
      `헤드라인: ${card.headline}`,
      `본문: ${card.body}`,
    ]
    if (card.expertView) lines.push(`전문가 관점: ${card.expertView}`)
    if (card.practical) lines.push(`실무 적용: ${card.practical}`)
    if (card.characterMent) lines.push(`캐릭터 멘트: ${card.characterMent}`)
    return lines.join('\n')
  }).join('\n\n')

  return `아래 카드뉴스 원고를 바탕으로 블로그 아티클을 작성해주세요.

제목: ${contentTitle ?? ''}
핵심 메시지: ${coreMessage ?? ''}

카드뉴스 원고:
${cardsText}

인스타그램 본문 참고:
${instagramCaption ?? ''}

위 내용을 블로그 아티클로 변환해주세요. 카드뉴스의 구조와 정보를 유지하되, 블로그 독자가 처음부터 끝까지 읽을 수 있는 흐름으로 풀어써주세요.`
}

export function buildBlogFeedbackUserPrompt(
  existingTitle: string,
  existingContent: string,
  feedback: string,
): string {
  return `기존 블로그 글:

제목: ${existingTitle}

본문:
${existingContent}

피드백:
${feedback}

위 피드백을 반영하여 블로그 글을 수정해주세요.`
}
```

- [ ] **Step 2: TypeScript 확인**

```bash
cd /Users/sungyounghan/project/vinus-content-builder
npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add lib/prompts/blog-generation.ts
git commit -m "feat: add blog generation prompt"
```

---

## Task 3: 블로그 API 라우트 3개

**Files:**
- Create: `app/api/blog/generate/route.ts`
- Create: `app/api/blog/feedback/route.ts`
- Create: `app/api/blog/[id]/route.ts`

- [ ] **Step 1: `app/api/blog/generate/route.ts` 생성**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'
import { BLOG_GENERATION_SYSTEM_PROMPT, buildBlogGenerationUserPrompt } from '@/lib/prompts/blog-generation'
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

  const userPrompt = buildBlogGenerationUserPrompt(
    source.content_title,
    source.core_message,
    Array.isArray(source.carousel_content) ? source.carousel_content : [],
    source.instagram_caption,
  )

  console.log('[blog/generate] calling Claude...')

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: BLOG_GENERATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

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
```

- [ ] **Step 2: `app/api/blog/feedback/route.ts` 생성**

```typescript
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
```

- [ ] **Step 3: `app/api/blog/[id]/route.ts` 생성**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  let body: { is_published?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { error } = await supabaseServer
    .from('blog_contents')
    .update({ is_published: body.is_published })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { error } = await supabaseServer
    .from('blog_contents')
    .delete()
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: TypeScript 확인**

```bash
cd /Users/sungyounghan/project/vinus-content-builder
npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add app/api/blog/
git commit -m "feat: add blog API routes (generate, feedback, patch, delete)"
```

---

## Task 4: 블로그 목록 페이지

**Files:**
- Create: `app/(admin)/blog/page.tsx`
- Create: `app/(admin)/blog/client.tsx`

- [ ] **Step 1: `app/(admin)/blog/page.tsx` 생성**

```typescript
import { supabaseServer } from '@/lib/supabase/server'
import { BlogListClient } from './client'

export const dynamic = 'force-dynamic'

export default async function BlogPage() {
  const { data: blogs } = await supabaseServer
    .from('blog_contents')
    .select('*, generated_content:generated_contents(content_title, content_type:content_types(name))')
    .order('created_at', { ascending: false })
    .limit(100)

  return <BlogListClient blogs={blogs ?? []} />
}
```

- [ ] **Step 2: `app/(admin)/blog/client.tsx` 생성**

```tsx
'use client'

import Link from 'next/link'
import type { BlogContent } from '@/types'
import { cn } from '@/lib/utils'

export function BlogListClient({ blogs }: { blogs: BlogContent[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">블로그목록</h1>
      </div>

      <div className="divide-y divide-border/40">
        {blogs.map(blog => {
          const p = (n: number) => String(n).padStart(2, '0')
          const d = new Date(blog.created_at)
          const dateLabel = isNaN(d.getTime())
            ? '?'
            : `${p(d.getMonth() + 1)}.${p(d.getDate())}`
          const typeName = (blog.generated_content as { content_type: { name: string } | null } | null)
            ?.content_type?.name ?? '미분류'

          return (
            <Link
              key={blog.id}
              href={`/blog/${blog.id}`}
              className="flex items-center gap-3 py-2.5 hover:bg-muted/30 -mx-2 px-2 rounded transition-colors"
            >
              <span className={cn('flex-1 text-sm truncate', blog.is_published && 'text-muted-foreground')}>
                {blog.blog_title}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground w-14 text-right">
                {typeName}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground w-10 text-right">
                {dateLabel}
              </span>
              {blog.is_published && (
                <span className="shrink-0 text-xs text-muted-foreground">✓</span>
              )}
            </Link>
          )
        })}
        {blogs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">아직 작성된 블로그 글이 없습니다</p>
            <p className="text-xs text-muted-foreground mt-1">카드뉴스 상세에서 블로그를 생성하세요</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: TypeScript 확인**

```bash
cd /Users/sungyounghan/project/vinus-content-builder
npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add "app/(admin)/blog/"
git commit -m "feat: add blog list page"
```

---

## Task 5: 블로그 상세 페이지

**Files:**
- Create: `app/(admin)/blog/[id]/page.tsx`
- Create: `app/(admin)/blog/[id]/client.tsx`

- [ ] **Step 1: `app/(admin)/blog/[id]/page.tsx` 생성**

```typescript
import { supabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BlogDetailClient } from './client'

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data: blog } = await supabaseServer
    .from('blog_contents')
    .select('*, generated_content:generated_contents(id, content_title, content_type:content_types(name))')
    .eq('id', id)
    .single()
  if (!blog) notFound()
  return <BlogDetailClient blog={blog} />
}
```

- [ ] **Step 2: `app/(admin)/blog/[id]/client.tsx` 생성**

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { BlogContent } from '@/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export function BlogDetailClient({ blog: initial }: { blog: BlogContent }) {
  const [blog, setBlog] = useState(initial)
  const [feedback, setFeedback] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [regenElapsed, setRegenElapsed] = useState(0)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const regenTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const router = useRouter()

  useEffect(() => {
    setBlog(initial)
  }, [initial])

  useEffect(() => {
    if (regenerating) {
      setRegenElapsed(0)
      regenTimerRef.current = setInterval(() => setRegenElapsed(s => s + 1), 1000)
    } else {
      if (regenTimerRef.current) clearInterval(regenTimerRef.current)
    }
    return () => { if (regenTimerRef.current) clearInterval(regenTimerRef.current) }
  }, [regenerating])

  function handleCopy() {
    const text = `${blog.blog_title}\n\n${blog.blog_content}`
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => setMsg('클립보드 복사에 실패했습니다.'))
  }

  async function handleDelete() {
    if (!window.confirm('이 블로그 글을 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/blog/${blog.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/blog')
        router.refresh()
      } else {
        setMsg('삭제 실패')
      }
    } catch {
      setMsg('삭제 실패')
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/blog/${blog.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: blog.is_published }),
      })
      setMsg(res.ok ? '저장됐습니다.' : '저장 실패')
    } catch {
      setMsg('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  async function handleRegenerate() {
    if (!window.confirm(
      '현재 블로그 글을 보관하고 싶으시면 먼저 복사해주세요.\n재생성하면 현재 내용이 덮어씌워집니다.\n\n계속하시겠습니까?'
    )) return
    setRegenerating(true)
    setMsg('')
    try {
      const res = await fetch('/api/blog/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogContentId: blog.id, feedback }),
      })
      if (res.ok) {
        setMsg('재생성됐습니다.')
        setFeedback('')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setMsg(`재생성 실패: ${data.error ?? res.status}`)
      }
    } catch (e) {
      setMsg(`재생성 실패: ${e instanceof Error ? e.message : '네트워크 오류'}`)
    } finally {
      setRegenerating(false)
    }
  }

  const generatedContent = blog.generated_content as {
    id: string
    content_title: string | null
    content_type: { name: string } | null
  } | null

  return (
    <div className="space-y-4">
      {/* 상단 바 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/blog')}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← 목록
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs h-7">
            {copied ? '복사됨 ✓' : '전체 복사'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-destructive hover:text-destructive h-7 px-2 text-xs"
          >
            삭제
          </Button>
        </div>
      </div>

      {/* 제목 */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {generatedContent?.content_type?.name ?? '미분류'}
          </span>
          {blog.is_published && <span className="text-xs text-green-600">✓ 발행 완료</span>}
        </div>
        <h1 className="text-xl font-semibold leading-snug">{blog.blog_title}</h1>
      </div>

      {/* 2컬럼 본문 */}
      <div className="flex gap-8 items-start">
        {/* 왼쪽: 블로그 본문 */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">블로그 본문</p>
          <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
            {blog.blog_content}
          </p>
        </div>

        {/* 오른쪽: 액션 패널 (sticky) */}
        <div className="w-64 shrink-0 sticky top-20 self-start space-y-6">
          {/* 원본 카드뉴스 링크 */}
          {generatedContent && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">원본 카드뉴스</p>
              <a
                href={`/generated/${generatedContent.id}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {generatedContent.content_title ?? '(제목 없음)'} ↗
              </a>
            </div>
          )}

          <div className="border-t border-border/40" />

          {/* 발행 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">발행</p>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="rounded"
                checked={blog.is_published}
                onChange={e => setBlog({ ...blog, is_published: e.target.checked })}
              />
              발행 완료
            </label>
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="w-full">
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>

          <div className="border-t border-border/40" />

          {/* 피드백 재생성 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">피드백 재생성</p>
            <Textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="수정 의견을 입력하세요."
              rows={4}
            />
            <Button
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerating || !feedback.trim()}
              className="w-full"
            >
              {regenerating ? `재생성 중... ${regenElapsed}초` : '재생성'}
            </Button>
            {regenerating && (
              <div className="h-0.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-1000"
                  style={{ width: `${Math.min(92, Math.round(92 * (1 - Math.exp(-regenElapsed / 28))))}%` }}
                />
              </div>
            )}
          </div>

          {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: TypeScript 확인**

```bash
cd /Users/sungyounghan/project/vinus-content-builder
npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add "app/(admin)/blog/[id]/"
git commit -m "feat: add blog detail page"
```

---

## Task 6: 네비게이션 + 카드뉴스 상세 "블로그 생성" 버튼

**Files:**
- Modify: `components/admin-nav.tsx`
- Modify: `app/(admin)/generated/[id]/client.tsx`

- [ ] **Step 1: `components/admin-nav.tsx` — "블로그목록" 메뉴 추가**

`navLinks` 배열에 항목 하나 추가한다. 현재:

```typescript
const navLinks = [
  { href: '/collected', label: '수집콘텐츠', prefix: '/collected' },
  { href: '/generated', label: '카드뉴스목록', prefix: '/generated' },
  { href: '/settings/content-types', label: '설정', prefix: '/settings' },
]
```

아래로 변경:

```typescript
const navLinks = [
  { href: '/collected', label: '수집콘텐츠', prefix: '/collected' },
  { href: '/generated', label: '카드뉴스목록', prefix: '/generated' },
  { href: '/blog', label: '블로그목록', prefix: '/blog' },
  { href: '/settings/content-types', label: '설정', prefix: '/settings' },
]
```

- [ ] **Step 2: `app/(admin)/generated/[id]/client.tsx` — 블로그 생성 버튼 추가**

파일을 열어 다음을 수정한다.

**2a. import에 `useEffect` 이미 있음. `Link` import 추가:**

기존:
```typescript
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
```

변경:
```typescript
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
```

**2b. state 추가** — 기존 state 선언부(`const [copied, setCopied] = useState(false)` 바로 다음)에 추가:

```typescript
const [blogGenerating, setBlogGenerating] = useState(false)
const [blogElapsed, setBlogElapsed] = useState(0)
const [blogId, setBlogId] = useState<string | null>(null)
const blogTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
```

**2c. blogTimer useEffect 추가** — 기존 regenTimer useEffect 바로 다음에 추가:

```typescript
useEffect(() => {
  if (blogGenerating) {
    setBlogElapsed(0)
    blogTimerRef.current = setInterval(() => setBlogElapsed(s => s + 1), 1000)
  } else {
    if (blogTimerRef.current) clearInterval(blogTimerRef.current)
  }
  return () => { if (blogTimerRef.current) clearInterval(blogTimerRef.current) }
}, [blogGenerating])
```

**2d. handleBlogGenerate 함수 추가** — `handleDelete` 함수 바로 앞에 추가:

```typescript
async function handleBlogGenerate() {
  setBlogGenerating(true)
  setMsg('')
  try {
    const res = await fetch('/api/blog/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generatedContentId: content.id }),
    })
    if (res.ok) {
      const data = await res.json()
      setBlogId(data.id)
      router.push(`/blog/${data.id}`)
    } else {
      const data = await res.json().catch(() => ({}))
      setMsg(`블로그 생성 실패: ${data.error ?? res.status}`)
    }
  } catch (e) {
    setMsg(`블로그 생성 실패: ${e instanceof Error ? e.message : '네트워크 오류'}`)
  } finally {
    setBlogGenerating(false)
  }
}
```

**2e. 우측 패널 맨 아래 `{msg && ...}` 바로 위에 블로그 섹션 추가:**

현재 우측 패널 구조에서 `{msg && <p className="text-xs text-muted-foreground">{msg}</p>}` 바로 위:

```tsx
<div className="border-t border-border/40" />

{/* 블로그 */}
<div className="space-y-2">
  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">블로그</p>
  {blogId ? (
    <Link
      href={`/blog/${blogId}`}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      블로그 보기 ↗
    </Link>
  ) : (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={handleBlogGenerate}
        disabled={blogGenerating}
        className="w-full"
      >
        {blogGenerating ? `블로그 생성 중... ${blogElapsed}초` : '블로그 생성'}
      </Button>
      {blogGenerating && (
        <div className="h-0.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-foreground transition-all duration-1000"
            style={{ width: `${Math.min(92, Math.round(92 * (1 - Math.exp(-blogElapsed / 28))))}%` }}
          />
        </div>
      )}
    </>
  )}
</div>
```

- [ ] **Step 3: TypeScript 확인**

```bash
cd /Users/sungyounghan/project/vinus-content-builder
npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add components/admin-nav.tsx "app/(admin)/generated/[id]/client.tsx"
git commit -m "feat: add blog nav item and blog generate button in card news detail"
```

---

## Task 7: 카드뉴스 상세에서 기존 블로그 ID 로드

**배경:** 카드뉴스 상세 페이지에 처음 진입할 때 이미 블로그가 생성되어 있으면 "블로그 보기 ↗" 링크를 바로 보여줘야 한다. 서버 컴포넌트에서 기존 blog_contents를 조회해 `initialBlogId`로 전달한다.

**Files:**
- Modify: `app/(admin)/generated/[id]/page.tsx`
- Modify: `app/(admin)/generated/[id]/client.tsx`

- [ ] **Step 1: `app/(admin)/generated/[id]/page.tsx` 수정**

현재:
```typescript
import { supabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { GeneratedDetailClient } from './client'

export default async function GeneratedDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data: content } = await supabaseServer
    .from('generated_contents')
    .select('*, content_type:content_types(name), source_content:collected_contents(title, original_url)')
    .eq('id', id)
    .single()
  if (!content) notFound()
  return <GeneratedDetailClient content={content} />
}
```

변경:
```typescript
import { supabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { GeneratedDetailClient } from './client'

export default async function GeneratedDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data: content } = await supabaseServer
    .from('generated_contents')
    .select('*, content_type:content_types(name), source_content:collected_contents(title, original_url)')
    .eq('id', id)
    .single()
  if (!content) notFound()

  const { data: blog } = await supabaseServer
    .from('blog_contents')
    .select('id')
    .eq('generated_content_id', id)
    .single()

  return <GeneratedDetailClient content={content} initialBlogId={blog?.id ?? null} />
}
```

- [ ] **Step 2: `app/(admin)/generated/[id]/client.tsx` — props 수정**

컴포넌트 시그니처 변경:

```typescript
export function GeneratedDetailClient({
  content: initial,
  initialBlogId,
}: {
  content: GeneratedContent
  initialBlogId: string | null
}) {
```

그리고 `blogId` state 초기화를 `initialBlogId`로 변경:

```typescript
const [blogId, setBlogId] = useState<string | null>(initialBlogId)
```

- [ ] **Step 3: TypeScript 확인**

```bash
cd /Users/sungyounghan/project/vinus-content-builder
npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 4: 커밋 + 푸시**

```bash
git add "app/(admin)/generated/[id]/page.tsx" "app/(admin)/generated/[id]/client.tsx"
git commit -m "feat: load existing blog id on card news detail page"
git push origin main
```

---

## 자체 검토

### Spec Coverage

| 스펙 항목 | 태스크 |
|----------|-------|
| blog_contents 테이블 (UNIQUE FK, CASCADE) | Task 1 |
| BlogContent, BlogGenerateResult 타입 | Task 1 |
| 블로그 생성 프롬프트 (plain text, 1500~3000자) | Task 2 |
| POST /api/blog/generate (UPSERT) | Task 3 |
| POST /api/blog/feedback | Task 3 |
| PATCH /api/blog/[id] | Task 3 |
| DELETE /api/blog/[id] | Task 3 |
| /blog 목록 페이지 (행 기반) | Task 4 |
| /blog/[id] 상세 페이지 (2컬럼, sticky 패널) | Task 5 |
| AdminNav "블로그목록" 메뉴 | Task 6 |
| 카드뉴스 상세 "블로그 생성" 버튼 + 진행 바 | Task 6 |
| 생성 완료 시 "블로그 보기 ↗" 링크 | Task 6 |
| 기존 블로그 있을 때 바로 링크 표시 | Task 7 |
| 피드백 재생성 (블로그 상세) | Task 5 |
| 발행 상태 저장 | Task 5 |
| 전체 복사 버튼 | Task 5 |
