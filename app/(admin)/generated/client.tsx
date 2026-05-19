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
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (generating) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [generating])

  useEffect(() => {
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }
  }, [])

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
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        setToast('카드뉴스가 생성됐습니다.')
        toastTimerRef.current = setTimeout(() => setToast(''), 3000)
        setOpen(false)
        setTopic('')
        setDetail('')
        router.refresh()
      } else {
        const data = await res.json()
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        setToast(`생성 실패: ${data.error ?? '알 수 없는 오류'}`)
        toastTimerRef.current = setTimeout(() => setToast(''), 4000)
      }
    } catch {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      setToast('네트워크 오류가 발생했습니다.')
      toastTimerRef.current = setTimeout(() => setToast(''), 4000)
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
          const dateLabel = isNaN(d.getTime())
            ? '?'
            : `${p(d.getMonth()+1)}.${p(d.getDate())}`

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
