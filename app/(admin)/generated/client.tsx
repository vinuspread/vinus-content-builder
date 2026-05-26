'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useBatch } from '@/lib/batch-context'

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
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const { job, startBlogBatch } = useBatch()
  const batchProgress = job?.type === 'blog' ? job : null
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

  function showToast(msg: string, duration = 3000) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(msg)
    toastTimerRef.current = setTimeout(() => setToast(''), duration)
  }

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
        showToast('카드뉴스가 생성됐습니다.')
        setOpen(false)
        setTopic('')
        setDetail('')
        router.refresh()
      } else {
        const data = await res.json()
        showToast(`생성 실패: ${data.error ?? '알 수 없는 오류'}`, 4000)
      }
    } catch {
      showToast('네트워크 오류가 발생했습니다.', 4000)
    } finally {
      setGenerating(false)
    }
  }

  function handleBatchBlog() {
    const ids = [...selected]
    if (ids.length === 0) return
    setSelected(new Set())
    startBlogBatch(ids)
  }

  function toggleAll() {
    setSelected(prev => prev.size === contents.length ? new Set() : new Set(contents.map(c => c.id)))
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isBusy = generating || !!batchProgress

  return (
    <div className="space-y-4">
      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-foreground text-background text-sm px-4 py-2.5 shadow-lg">
          {toast}
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">카드뉴스목록</h1>
        <div className="flex items-center gap-1.5">
          {selected.size > 0 && !batchProgress && (
            <Button onClick={handleBatchBlog} size="sm" disabled={isBusy}>
              블로그 생성 ({selected.size}개)
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setOpen(v => !v)} disabled={isBusy}>
            {open ? '취소' : '+ 직접 입력'}
          </Button>
        </div>
      </div>

      {/* 일괄 블로그 생성 진행 바 */}
      {batchProgress && (
        <div className="space-y-1">
          <div className="h-0.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-foreground transition-all duration-300"
              style={{ width: `${Math.round((batchProgress.current / batchProgress.total) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            블로그 생성 중... {batchProgress.current}/{batchProgress.total}
          </p>
        </div>
      )}

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
        {/* 전체 선택 */}
        {contents.length > 0 && (
          <div className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              checked={selected.size === contents.length && contents.length > 0}
              onChange={toggleAll}
              className="h-3.5 w-3.5 rounded border-input accent-foreground"
            />
            <span className="text-xs text-muted-foreground">
              {selected.size > 0 ? `${selected.size}개 선택됨` : '전체 선택'}
            </span>
          </div>
        )}

        {contents.map(content => {
          const isSelf = content.source_content_id === null
          const isPublished = content.is_published
          const p = (n: number) => String(n).padStart(2, '0')
          const d = new Date(content.created_at)
          const dateLabel = isNaN(d.getTime())
            ? '?'
            : `${p(d.getMonth()+1)}.${p(d.getDate())}`

          return (
            <div key={content.id} className="flex items-center gap-3 py-2.5 hover:bg-muted/30 -mx-2 px-2 rounded transition-colors">
              <input
                type="checkbox"
                checked={selected.has(content.id)}
                onChange={() => toggleOne(content.id)}
                disabled={isBusy}
                className="shrink-0 h-3.5 w-3.5 rounded border-input accent-foreground"
                onClick={e => e.stopPropagation()}
              />
              <Link
                href={`/generated/${content.id}`}
                className="flex flex-1 items-center gap-3 min-w-0"
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
            </div>
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
