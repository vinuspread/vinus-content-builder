# 직접 입력 카드뉴스 생성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 주제와 내용을 직접 입력하면 Tavily 웹검색 + Claude API로 카드뉴스 6장을 생성하여 카드뉴스목록에 저장하는 기능 추가

**Architecture:** 기존 `GENERATION_SYSTEM_PROMPT` 재사용, 새 user 프롬프트 빌더(`buildManualGenerationUserPrompt`)와 Tavily 래퍼(`lib/tavily.ts`)를 추가한다. API 라우트 `POST /api/generate/manual`이 검색→생성→저장을 담당하고, 카드뉴스목록 페이지에 클라이언트 폼 컴포넌트를 추가한다. `source_content_id === null`을 자체콘텐츠 식별자로 사용한다.

**Tech Stack:** Next.js 16 App Router, Tavily Search API, Anthropic Claude API, Supabase, shadcn/ui (Button, Input, Textarea, Badge)

---

## File Map

| 역할 | 파일 |
|------|------|
| Tavily 래퍼 | `lib/tavily.ts` (신규) |
| 수동 생성 프롬프트 | `lib/prompts/manual-generation.ts` (신규) |
| 수동 생성 API | `app/api/generate/manual/route.ts` (신규) |
| 목록 페이지 클라이언트 | `app/(admin)/generated/client.tsx` (신규) |
| 목록 페이지 (서버) | `app/(admin)/generated/page.tsx` (수정) |
| 상세 페이지 클라이언트 | `app/(admin)/generated/[id]/client.tsx` (수정) |

---

## Task 1: Tavily 래퍼

**Files:**
- Create: `lib/tavily.ts`

- [ ] **Step 1: `lib/tavily.ts` 작성**

```ts
import 'server-only'

export async function tavilySearch(query: string): Promise<string> {
  const token = process.env.TAVILY_API_KEY
  if (!token) return ''

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: token,
      query,
      search_depth: 'basic',
      max_results: 5,
      include_answer: true,
    }),
  })

  if (!res.ok) return ''

  const data = await res.json()

  const parts: string[] = []
  if (data.answer) parts.push(`요약: ${data.answer}`)
  for (const r of data.results ?? []) {
    parts.push(`\n출처: ${r.url}\n${r.content ?? ''}`)
  }
  return parts.join('\n')
}
```

- [ ] **Step 2: 커밋**

```bash
git add lib/tavily.ts
git commit -m "feat: add Tavily search wrapper"
```

---

## Task 2: 수동 생성 프롬프트 빌더

**Files:**
- Create: `lib/prompts/manual-generation.ts`

- [ ] **Step 1: `lib/prompts/manual-generation.ts` 작성**

```ts
export function buildManualGenerationUserPrompt(
  topic: string,
  content: string,
  searchResults: string
): string {
  return `다음 정보를 바탕으로 바이너스 SNS 카드뉴스 원고를 작성해주세요.

주제: ${topic}
보충 내용: ${content.trim() || '없음'}
웹 검색 참고 자료:
${searchResults.trim() || '없음'}

위 정보를 바탕으로, 바이너스의 톤과 기준에 맞게 독자적인 카드뉴스 원고를 작성하세요.
검색 결과를 그대로 요약하지 말고, 바이너스 독자(중소기업·스타트업 실무자)에게 맞게 재해석하세요.`
}
```

- [ ] **Step 2: 커밋**

```bash
git add lib/prompts/manual-generation.ts
git commit -m "feat: add manual generation prompt builder"
```

---

## Task 3: 수동 생성 API 라우트

**Files:**
- Create: `app/api/generate/manual/route.ts`

참고: 기존 `app/api/generate/route.ts` 패턴 동일하게 따른다.

- [ ] **Step 1: `app/api/generate/manual/route.ts` 작성**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'
import { GENERATION_SYSTEM_PROMPT } from '@/lib/prompts/generation'
import { buildManualGenerationUserPrompt } from '@/lib/prompts/manual-generation'
import { tavilySearch } from '@/lib/tavily'
import type { GenerateResult } from '@/types'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { topic, content = '' } = await req.json()
  if (!topic?.trim()) {
    return NextResponse.json({ error: 'topic required' }, { status: 400 })
  }

  const searchResults = await tavilySearch(topic)

  const userPrompt = buildManualGenerationUserPrompt(topic, content, searchResults)

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

  if (!Array.isArray(result.carousel) || result.carousel.length !== 6) {
    return NextResponse.json(
      { error: `Carousel must have exactly 6 cards, got ${result.carousel?.length ?? 0}` },
      { status: 500 }
    )
  }

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: generated.id })
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/api/generate/manual/route.ts
git commit -m "feat: add manual card news generation API route"
```

---

## Task 4: 카드뉴스목록 클라이언트 컴포넌트

카드뉴스목록 페이지에 `+ 직접 입력` 폼과 토스트를 추가한다. 서버 컴포넌트(`page.tsx`)는 데이터 페치만 담당하고, 인터랙션은 이 클라이언트 컴포넌트에서 처리한다.

**Files:**
- Create: `app/(admin)/generated/client.tsx`

- [ ] **Step 1: `app/(admin)/generated/client.tsx` 작성**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

type ContentItem = {
  id: string
  content_title: string | null
  core_message: string | null
  is_published: boolean
  created_at: string
  source_content_id: string | null
  content_type: { name: string } | null
}

export function GeneratedPageClient({ contents }: { contents: ContentItem[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [topic, setTopic] = useState('')
  const [detail, setDetail] = useState('')
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState('')

  async function handleGenerate() {
    if (!topic.trim()) return
    setGenerating(true)
    const res = await fetch('/api/generate/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: topic.trim(), content: detail.trim() }),
    })
    if (res.ok) {
      setToast('카드뉴스가 생성됐습니다.')
      setOpen(false)
      setTopic('')
      setDetail('')
      router.refresh()
      setTimeout(() => setToast(''), 3000)
    } else {
      const data = await res.json()
      setToast(`생성 실패: ${data.error ?? '알 수 없는 오류'}`)
      setTimeout(() => setToast(''), 4000)
    }
    setGenerating(false)
  }

  return (
    <div className="space-y-5">
      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-foreground text-background text-sm px-4 py-2.5 shadow-lg">
          {toast}
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">카드뉴스목록</h1>
        <Button size="sm" variant="outline" onClick={() => setOpen(v => !v)}>
          {open ? '취소' : '+ 직접 입력'}
        </Button>
      </div>

      {/* 직접 입력 폼 */}
      {open && (
        <div className="rounded-xl border bg-card p-4 ring-1 ring-foreground/5 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">주제 *</label>
            <Input
              placeholder="예: 작은 브랜드가 컬러를 잘못 쓰는 이유"
              value={topic}
              onChange={e => setTopic(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">내용 <span className="text-muted-foreground font-normal">(선택 — 방향이나 핵심 포인트를 적어주세요)</span></label>
            <Textarea
              placeholder="예: 레드 계열은 식욕을 자극하는 컬러라 음식업종에 맞고, 파란 계열은 신뢰감을 주어 금융·IT에 어울린다. 그런데 많은 스타트업이 트렌디해 보이려고 업종과 맞지 않는 컬러를 쓴다..."
              rows={4}
              value={detail}
              onChange={e => setDetail(e.target.value)}
            />
          </div>
          <Button onClick={handleGenerate} disabled={generating || !topic.trim()}>
            {generating ? '생성 중... (약 30초 소요)' : '카드뉴스 생성'}
          </Button>
        </div>
      )}

      {/* 목록 */}
      <div className="space-y-2">
        {contents.map(content => (
          <Link
            key={content.id}
            href={`/generated/${content.id}`}
            className="flex items-start gap-4 rounded-xl border bg-card p-4 ring-1 ring-foreground/5 hover:bg-muted/40 transition-colors"
          >
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">
                  {content.content_type?.name ?? '미분류'}
                </Badge>
                {content.source_content_id === null && (
                  <Badge variant="outline">자체콘텐츠</Badge>
                )}
                {content.is_published && (
                  <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                    업로드 완료
                  </Badge>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(content.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>
              <p className="text-sm font-medium leading-snug">{content.content_title ?? '(제목 없음)'}</p>
              <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">{content.core_message}</p>
            </div>
          </Link>
        ))}
        {contents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm font-medium text-muted-foreground">아직 제작된 콘텐츠가 없습니다</p>
            <p className="text-xs text-muted-foreground mt-1">수집콘텐츠에서 카드뉴스 생성을 누르거나 직접 입력하세요</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/\(admin\)/generated/client.tsx
git commit -m "feat: add GeneratedPageClient with manual input form and toast"
```

---

## Task 5: page.tsx 서버 컴포넌트 수정

기존 서버 컴포넌트에서 렌더링 로직을 제거하고 `GeneratedPageClient`에 위임한다.

**Files:**
- Modify: `app/(admin)/generated/page.tsx`

- [ ] **Step 1: `app/(admin)/generated/page.tsx` 수정**

```tsx
import { supabaseServer } from '@/lib/supabase/server'
import { GeneratedPageClient } from './client'

export default async function GeneratedPage() {
  const { data: contents } = await supabaseServer
    .from('generated_contents')
    .select('*, content_type:content_types(name)')
    .order('created_at', { ascending: false })
    .limit(100)

  return <GeneratedPageClient contents={contents ?? []} />
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/\(admin\)/generated/page.tsx
git commit -m "refactor: delegate generated page rendering to client component"
```

---

## Task 6: 상세 페이지에 자체콘텐츠 뱃지 추가

**Files:**
- Modify: `app/(admin)/generated/[id]/client.tsx`

`source_content_id === null`이면 메타 영역에 `자체콘텐츠` 뱃지를 표시한다.

- [ ] **Step 1: 뱃지 추가**

[app/(admin)/generated/[id]/client.tsx](app/(admin)/generated/[id]/client.tsx) 의 메타 뱃지 영역을 찾는다:

```tsx
<div className="flex items-center gap-2 flex-wrap">
  <Badge variant="secondary">
    {(content.content_type as { name: string } | null)?.name ?? '미분류'}
  </Badge>
  {content.is_published && (
```

아래와 같이 수정한다:

```tsx
<div className="flex items-center gap-2 flex-wrap">
  <Badge variant="secondary">
    {(content.content_type as { name: string } | null)?.name ?? '미분류'}
  </Badge>
  {content.source_content_id === null && (
    <Badge variant="outline">자체콘텐츠</Badge>
  )}
  {content.is_published && (
```

- [ ] **Step 2: 커밋**

```bash
git add app/\(admin\)/generated/\[id\]/client.tsx
git commit -m "feat: show 자체콘텐츠 badge on detail page when source_content_id is null"
```

---

## Task 7: 배포

- [ ] **Step 1: Vercel 환경변수 확인**

Vercel 대시보드 → vinus-content-builder → Settings → Environment Variables에서 `TAVILY_API_KEY` 추가 (tavily.com에서 발급).

- [ ] **Step 2: 빌드 확인 후 배포**

```bash
git push
vercel deploy --prod
```

Expected: 빌드 성공, 22개 이상 페이지 생성

---

## 완료 기준

- [ ] 카드뉴스목록 헤더에 `+ 직접 입력` 버튼 노출
- [ ] 폼 열고 주제만 입력해도 생성 가능
- [ ] 생성 완료 시 토스트 메시지 + 목록 새로고침
- [ ] 생성된 항목에 `자체콘텐츠` 뱃지 표시 (목록 + 상세)
- [ ] TAVILY_API_KEY 없어도 에러 없이 생성 동작 (검색 결과 없이 Claude만으로 생성)
