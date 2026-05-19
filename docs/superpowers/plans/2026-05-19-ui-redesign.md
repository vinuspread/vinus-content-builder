# UI 리디자인 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 수집콘텐츠·카드뉴스목록·카드뉴스 상세·설정 페이지를 Linear/Notion 스타일로 재설계해 정보 과부하와 시각적 밀도를 해소한다.

**Architecture:** 4개 파일을 독립적으로 수정한다. 서버 컴포넌트·API는 변경 없고 클라이언트 UI만 변경된다. 각 태스크는 독립적으로 완료 가능하다.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, shadcn/ui (Button, Badge, Input, Textarea, Label), `cn` from `@/lib/utils`

---

## 파일 구조

| 파일 | 변경 내용 |
|------|----------|
| `app/(admin)/collected/client.tsx` | 행 기반 목록, 썸네일·캡션·유형 드롭다운 제거, `···` 메뉴로 분류 버튼 이동 |
| `app/(admin)/generated/client.tsx` | 행 기반 목록, Badge → 텍스트/아이콘 경량화 |
| `app/(admin)/generated/[id]/client.tsx` | 2컬럼 레이아웃, sticky 우측 패널, 카드 보조정보 접기 |
| `app/(admin)/settings/layout.tsx` | 상단 탭 → 좌측 사이드바 |

---

## Task 1: 수집콘텐츠 행 기반 목록 재설계

**Files:**
- Modify: `app/(admin)/collected/client.tsx`

### 배경
현재 아이템당 썸네일 + 캡션 + 유형 드롭다운 + 링크 + 버튼으로 시각적 과부하. 헤더에도 버튼 3개가 혼재. Linear 스타일의 한 줄 행으로 교체한다.

- [ ] **Step 1: `app/(admin)/collected/client.tsx` 전체 교체**

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { CollectedContent, ContentType } from '@/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CollectedList({
  contents,
  contentTypes,
  generatedContentIds,
}: {
  contents: CollectedContent[]
  contentTypes: Pick<ContentType, 'id' | 'name'>[]
  generatedContentIds: string[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [collecting, setCollecting] = useState(false)
  const [classifying, setClassifying] = useState(false)
  const [msg, setMsg] = useState('')
  const [generating, setGenerating] = useState<string | null>(null)
  const [collectElapsed, setCollectElapsed] = useState(0)
  const [generateElapsed, setGenerateElapsed] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const collectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const generateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const generatedSet = new Set(generatedContentIds)

  useEffect(() => {
    if (collecting) {
      setCollectElapsed(0)
      collectTimerRef.current = setInterval(() => setCollectElapsed(s => s + 1), 1000)
    } else {
      if (collectTimerRef.current) clearInterval(collectTimerRef.current)
    }
    return () => { if (collectTimerRef.current) clearInterval(collectTimerRef.current) }
  }, [collecting])

  useEffect(() => {
    if (generating) {
      setGenerateElapsed(0)
      generateTimerRef.current = setInterval(() => setGenerateElapsed(s => s + 1), 1000)
    } else {
      if (generateTimerRef.current) clearInterval(generateTimerRef.current)
    }
    return () => { if (generateTimerRef.current) clearInterval(generateTimerRef.current) }
  }, [generating])

  async function handleCollect() {
    setCollecting(true)
    setMsg('')
    setMenuOpen(false)
    try {
      const res = await fetch('/api/collect', { method: 'POST' })
      const data = await res.json()
      if (data.errors?.length) {
        setMsg(`수집 완료 — Instagram ${data.instagram}개, RSS ${data.rss}개 · 오류: ${data.errors.join(', ')}`)
      } else {
        setMsg(`수집 완료 — Instagram ${data.instagram}개, RSS ${data.rss}개`)
      }
      router.refresh()
    } catch {
      setMsg('수집 실패')
    } finally {
      setCollecting(false)
    }
  }

  async function handleClassifyAll() {
    setClassifying(true)
    setMsg('')
    setMenuOpen(false)
    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      const data = await res.json()
      setMsg(`분류 완료 — ${data.classified}개`)
      router.refresh()
    } catch {
      setMsg('분류 실패')
    } finally {
      setClassifying(false)
    }
  }

  async function handleGenerate(contentId: string) {
    setGenerating(contentId)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceContentId: contentId }),
      })
      if (res.ok) {
        setMsg('생성 완료')
        router.refresh()
      } else {
        setMsg('생성 실패')
      }
    } catch {
      setMsg('생성 실패')
    } finally {
      setGenerating(null)
    }
  }

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/collected?${params.toString()}`)
  }

  const latestCollectedAt = contents.length > 0
    ? new Date(Math.max(...contents.map(c => new Date(c.collected_at).getTime())))
    : null

  const collectedLabel = latestCollectedAt
    ? (() => {
        const p = (n: number) => String(n).padStart(2, '0')
        const d = latestCollectedAt
        return `${d.getFullYear()}.${p(d.getMonth()+1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
      })()
    : null

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">
            수집콘텐츠
            <span className="ml-2 text-sm font-normal text-muted-foreground">{contents.length}개</span>
          </h1>
          {collectedLabel && (
            <p className="text-xs text-muted-foreground mt-0.5">마지막 수집: {collectedLabel}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button onClick={handleCollect} disabled={collecting} size="sm">
            {collecting ? `수집 중... ${collectElapsed}초` : '수집 실행'}
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 px-0 text-muted-foreground"
              onClick={() => setMenuOpen(v => !v)}
            >
              ···
            </Button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-10 w-44 rounded-lg border bg-background shadow-md py-1">
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
                  onClick={handleClassifyAll}
                  disabled={classifying}
                >
                  {classifying ? '분류 중...' : '미분류 자동 분류'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 수집 중 진행 바 */}
      {collecting && (
        <div className="h-0.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-foreground transition-all duration-1000"
            style={{ width: `${Math.min(92, Math.round(92 * (1 - Math.exp(-collectElapsed / 30))))}%` }}
          />
        </div>
      )}

      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}

      {/* 필터 바 */}
      <div className="flex items-center gap-2">
        <select
          onChange={e => updateFilter('source', e.target.value)}
          defaultValue={searchParams.get('source') ?? ''}
          className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">전체 출처</option>
          <option value="instagram">Instagram</option>
          <option value="rss">RSS</option>
        </select>
        <select
          onChange={e => updateFilter('type', e.target.value)}
          defaultValue={searchParams.get('type') ?? ''}
          className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">전체 유형</option>
          {contentTypes.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          onChange={e => updateFilter('sort', e.target.value)}
          defaultValue={searchParams.get('sort') ?? ''}
          className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">반응 수</option>
          <option value="collected">수집일</option>
          <option value="published">발행일</option>
        </select>
      </div>

      {/* 목록 */}
      <div className="divide-y divide-border/40">
        {contents.map(content => {
          const isGenerated = generatedSet.has(content.id)
          return (
            <div
              key={content.id}
              className={cn(
                'flex items-center gap-3 py-2.5',
                isGenerated && 'opacity-40'
              )}
            >
              <span className="shrink-0 text-xs text-muted-foreground w-[72px]">
                {content.source_type === 'instagram' ? 'Instagram' : 'RSS'}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground w-24 truncate">
                {content.source_name}
              </span>
              <span className="flex-1 text-sm truncate">
                {content.title ?? content.caption?.slice(0, 80)}
              </span>
              <a
                href={content.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ↗
              </a>
              <div className="shrink-0 flex flex-col items-end gap-1 w-28">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => !isGenerated && handleGenerate(content.id)}
                  disabled={generating === content.id || isGenerated}
                  className="h-7 text-xs w-full"
                >
                  {generating === content.id
                    ? `생성 중... ${generateElapsed}초`
                    : isGenerated
                    ? '생성완료'
                    : '카드뉴스 생성'}
                </Button>
                {generating === content.id && (
                  <div className="h-0.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-foreground transition-all duration-1000"
                      style={{ width: `${Math.min(92, Math.round(92 * (1 - Math.exp(-generateElapsed / 25))))}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {contents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">수집된 콘텐츠가 없습니다</p>
            <p className="text-xs text-muted-foreground mt-1">수집 실행 버튼을 눌러 콘텐츠를 가져오세요</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd /Users/sungyounghan/project/vinus-content-builder
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add app/\(admin\)/collected/client.tsx
git commit -m "refactor: redesign collected list as row-based layout"
```

---

## Task 2: 카드뉴스목록 행 기반 목록 재설계

**Files:**
- Modify: `app/(admin)/generated/client.tsx`

### 배경
현재 카드 기반 아이템에 Badge 3종(유형, 자체콘텐츠, 업로드완료)이 혼재. 행 기반으로 정리하고 Badge를 텍스트/아이콘으로 경량화한다. 직접 입력 폼은 현재 구조 유지하되 시각 정리만 한다.

- [ ] **Step 1: `app/(admin)/generated/client.tsx` 목록 렌더링 부분 교체**

파일 전체를 아래 코드로 교체한다:

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

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
  const [elapsed, setElapsed] = useState(0)
  const [toast, setToast] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (generating) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [generating])

  async function handleGenerate() {
    if (!topic.trim()) return
    setGenerating(true)
    try {
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
    } catch {
      setToast('네트워크 오류가 발생했습니다.')
      setTimeout(() => setToast(''), 4000)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
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
        <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">주제 *</label>
            <Input
              placeholder="예: 작은 브랜드가 컬러를 잘못 쓰는 이유"
              value={topic}
              onChange={e => setTopic(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">내용 <span className="font-normal">(선택)</span></label>
            <Textarea
              placeholder="방향이나 핵심 포인트를 입력하면 품질이 올라갑니다."
              rows={3}
              value={detail}
              onChange={e => setDetail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Button onClick={handleGenerate} disabled={generating || !topic.trim()} size="sm">
              {generating ? `생성 중... ${elapsed}초` : '카드뉴스 생성'}
            </Button>
            {generating && (
              <div className="space-y-1">
                <div className="h-0.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-foreground transition-all duration-1000"
                    style={{ width: `${Math.min(92, Math.round(92 * (1 - Math.exp(-elapsed / 28))))}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {elapsed < 5 ? '웹 검색 중...' : elapsed < 15 ? '원고 작성 중...' : '원고 완성 중...'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 목록 */}
      <div className="divide-y divide-border/40">
        {contents.map(content => {
          const isSelf = content.source_content_id === null
          const isPublished = content.is_published
          const p = (n: number) => String(n).padStart(2, '0')
          const d = new Date(content.created_at)
          const dateLabel = `${p(d.getMonth()+1)}.${p(d.getDate())}`

          return (
            <Link
              key={content.id}
              href={`/generated/${content.id}`}
              className="flex items-center gap-3 py-2.5 hover:bg-muted/30 -mx-2 px-2 rounded transition-colors"
            >
              {isSelf && (
                <span className="shrink-0 text-[11px] font-medium text-blue-600">자체</span>
              )}
              <span className={cn('flex-1 text-sm truncate', isPublished && 'text-muted-foreground')}>
                {content.content_title ?? '(제목 없음)'}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground w-14 text-right">
                {content.content_type?.name ?? '미분류'}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground w-10 text-right">
                {dateLabel}
              </span>
              {isPublished && (
                <span className="shrink-0 text-xs text-muted-foreground">✓</span>
              )}
            </Link>
          )
        })}
        {contents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">아직 제작된 콘텐츠가 없습니다</p>
            <p className="text-xs text-muted-foreground mt-1">수집콘텐츠에서 생성하거나 직접 입력하세요</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add app/\(admin\)/generated/client.tsx
git commit -m "refactor: redesign generated list as row-based layout"
```

---

## Task 3: 카드뉴스 상세 2컬럼 레이아웃

**Files:**
- Modify: `app/(admin)/generated/[id]/client.tsx`

### 배경
현재 단일 컬럼 `max-w-2xl`로 카드 6장 + 인스타 + 해시태그 + 피드백 카드 + 업로드 카드까지 매우 긴 스크롤. 2컬럼으로 분리해 왼쪽은 원고, 오른쪽은 sticky 액션 패널로 만든다. 카드별 보조 정보(expertView, practical, characterMent)는 접힌 상태로 시작한다.

- [ ] **Step 1: `app/(admin)/generated/[id]/client.tsx` 전체 교체**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { GeneratedContent } from '@/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function GeneratedDetailClient({ content: initial }: { content: GeneratedContent }) {
  const [content, setContent] = useState(initial)
  const [feedback, setFeedback] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const router = useRouter()

  function toggleExpanded(key: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleCopyAll() {
    const lines: string[] = []
    lines.push(`제목: ${content.content_title}`)
    lines.push(`핵심 메시지: ${content.core_message}`)
    lines.push('')
    content.carousel_content.forEach(card => {
      lines.push(`[${card.number}장 · ${card.role}]`)
      lines.push(`헤드라인: ${card.headline}`)
      lines.push(`본문: ${card.body}`)
      if (card.expertView) lines.push(`전문가 관점: ${card.expertView}`)
      if (card.practical) lines.push(`실무 적용: ${card.practical}`)
      if (card.characterMent) lines.push(`캐릭터 멘트: ${card.characterMent}`)
      lines.push('')
    })
    lines.push(`인스타그램 본문: ${content.instagram_caption}`)
    lines.push(`해시태그: ${content.hashtags.join(' ')}`)
    navigator.clipboard.writeText(lines.join('\n'))
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => setMsg('클립보드 복사에 실패했습니다.'))
  }

  async function handleRegenerate() {
    if (!window.confirm(
      '현재 원고를 보관하고 싶으시면 먼저 복사해주세요.\n재생성하면 현재 원고가 덮어씌워집니다.\n\n계속하시겠습니까?'
    )) return
    setRegenerating(true)
    setMsg('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generatedContentId: content.id, feedback }),
      })
      if (res.ok) {
        setMsg('재생성됐습니다.')
        setFeedback('')
        router.refresh()
      } else {
        setMsg('재생성 실패')
      }
    } finally {
      setRegenerating(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('이 카드뉴스를 삭제하시겠습니까?')) return
    const res = await fetch(`/api/generated/${content.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/generated')
      router.refresh()
    } else {
      setMsg('삭제 실패')
    }
  }

  async function handleSaveUpload() {
    setSaving(true)
    const res = await fetch(`/api/generated/${content.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_published: content.is_published,
        instagram_post_url: content.instagram_post_url,
        published_at: content.is_published && !content.published_at
          ? new Date().toISOString()
          : content.published_at,
      }),
    })
    setMsg(res.ok ? '저장됐습니다.' : '저장 실패')
    setSaving(false)
  }

  const sourceContent = content.source_content as { title?: string; original_url?: string } | null
  const isSelf = content.source_content_id === null

  return (
    <div className="space-y-4">
      {/* 상단 바 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/generated')}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← 목록
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyAll} className="text-xs h-7">
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

      {/* 제목 + 배지 */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {(content.content_type as { name: string } | null)?.name ?? '미분류'}
          </span>
          {isSelf && <span className="text-xs font-medium text-blue-600">자체콘텐츠</span>}
          {content.is_published && <span className="text-xs text-green-600">✓ 업로드 완료</span>}
          {sourceContent?.original_url && (
            <a
              href={sourceContent.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            >
              원본 ↗
            </a>
          )}
        </div>
        <h1 className="text-xl font-semibold leading-snug">{content.content_title}</h1>
        <p className="text-sm text-muted-foreground">{content.core_message}</p>
      </div>

      {/* 2컬럼 본문 */}
      <div className="flex gap-8 items-start">
        {/* 왼쪽: 원고 */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* 카드 슬라이드 */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              카드뉴스 · {content.carousel_content.length}장
            </p>
            {content.carousel_content.map(card => (
              <div key={card.number} className="space-y-2 py-4 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">{card.number}</span>
                  <span className="text-xs text-muted-foreground">· {card.role}</span>
                </div>
                <p className="text-sm font-semibold leading-snug">{card.headline}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{card.body}</p>

                {/* 접을 수 있는 보조 정보 */}
                {card.expertView && (
                  <div>
                    <button
                      onClick={() => toggleExpanded(`${card.number}-expertView`)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <span>{expanded.has(`${card.number}-expertView`) ? '▼' : '▶'}</span>
                      전문가 관점
                    </button>
                    {expanded.has(`${card.number}-expertView`) && (
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed pl-3">{card.expertView}</p>
                    )}
                  </div>
                )}
                {card.practical && (
                  <div>
                    <button
                      onClick={() => toggleExpanded(`${card.number}-practical`)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <span>{expanded.has(`${card.number}-practical`) ? '▼' : '▶'}</span>
                      실무 적용
                    </button>
                    {expanded.has(`${card.number}-practical`) && (
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed pl-3">{card.practical}</p>
                    )}
                  </div>
                )}
                {card.characterMent && (
                  <div>
                    <button
                      onClick={() => toggleExpanded(`${card.number}-characterMent`)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <span>{expanded.has(`${card.number}-characterMent`) ? '▼' : '▶'}</span>
                      캐릭터 멘트
                    </button>
                    {expanded.has(`${card.number}-characterMent`) && (
                      <p className="mt-1 text-xs font-medium pl-3">&ldquo;{card.characterMent}&rdquo;</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 인스타그램 본문 */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">인스타그램 본문</p>
            <p className="text-sm whitespace-pre-line leading-relaxed text-muted-foreground">{content.instagram_caption}</p>
          </div>

          {/* 해시태그 */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">해시태그</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{content.hashtags.join(' ')}</p>
          </div>
        </div>

        {/* 오른쪽: 액션 패널 (sticky) */}
        <div className="w-64 shrink-0 sticky top-20 self-start space-y-6">
          {/* 콘텐츠 유형 */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">콘텐츠 유형</p>
            <p className="text-sm text-muted-foreground">
              {(content.content_type as { name: string } | null)?.name ?? '미분류'}
            </p>
          </div>

          <div className="border-t border-border/40" />

          {/* 업로드 완료 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">업로드</p>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="rounded"
                checked={content.is_published}
                onChange={e => setContent({ ...content, is_published: e.target.checked })}
              />
              SNS 업로드 완료
            </label>
            <div className="space-y-1.5">
              <Label htmlFor="post-url" className="text-xs">인스타그램 URL</Label>
              <Input
                id="post-url"
                type="url"
                placeholder="https://www.instagram.com/p/..."
                value={content.instagram_post_url ?? ''}
                onChange={e => setContent({ ...content, instagram_post_url: e.target.value })}
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleSaveUpload} disabled={saving} className="w-full">
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
              {regenerating ? '재생성 중...' : '재생성'}
            </Button>
          </div>

          {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add app/\(admin\)/generated/\[id\]/client.tsx
git commit -m "refactor: redesign generated detail as 2-column layout with sticky panel"
```

---

## Task 4: 설정 사이드바 네비게이션

**Files:**
- Modify: `app/(admin)/settings/layout.tsx`

### 배경
현재 상단 탭이 5개로 좁게 표시됨. Linear 설정 페이지처럼 좌측 사이드바로 변경해 더 넓은 콘텐츠 영역을 확보한다.

- [ ] **Step 1: `app/(admin)/settings/layout.tsx` 전체 교체**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/settings/content-types', label: '콘텐츠 유형' },
  { href: '/settings/whitelist', label: 'Instagram 계정' },
  { href: '/settings/hashtags', label: '해시태그' },
  { href: '/settings/rss', label: 'RSS 소스' },
  { href: '/settings/filters', label: '수집 필터' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="flex gap-8">
      <nav className="w-40 shrink-0 space-y-0.5 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">설정</p>
        {navItems.map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block px-3 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 3: 커밋 + 푸시**

```bash
git add app/\(admin\)/settings/layout.tsx
git commit -m "refactor: replace settings tabs with left sidebar navigation"
git push origin main
```

---

## 자체 검토 (Spec Coverage)

| 스펙 항목 | 태스크 |
|----------|-------|
| 수집콘텐츠 썸네일 제거 | Task 1 |
| 수집콘텐츠 캡션 미리보기 제거 | Task 1 |
| 수집콘텐츠 인라인 유형 드롭다운 제거 | Task 1 |
| `···` 메뉴로 미분류 자동 분류 이동 | Task 1 |
| 수집 진행 바 헤더 아래 고정 | Task 1 |
| 원본 링크 `↗` 아이콘 | Task 1 |
| 카드뉴스목록 Badge → 텍스트/아이콘 | Task 2 |
| 자체 레이블 (파란 텍스트) | Task 2 |
| 업로드완료 ✓ 아이콘 | Task 2 |
| 직접 입력 폼 시각 정리 | Task 2 |
| 상세 페이지 2컬럼 레이아웃 | Task 3 |
| sticky 우측 패널 (유형·업로드·피드백) | Task 3 |
| 카드 보조정보 접기 (▶ 토글) | Task 3 |
| Badge → 텍스트 경량화 | Task 3 |
| 설정 좌측 사이드바 | Task 4 |
