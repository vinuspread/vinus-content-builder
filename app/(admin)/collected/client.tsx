'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { CollectedContent, ContentType } from '@/types'
import { Button } from '@/components/ui/button'

export function CollectedList({
  contents,
  contentTypes,
}: {
  contents: CollectedContent[]
  contentTypes: Pick<ContentType, 'id' | 'name'>[]
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
      const d = data.debug ?? {}
      const debugStr = d.whitelistCount !== undefined
        ? ` (계정 ${d.whitelistCount}개, 해시태그 ${d.hashtagCount}개 활성)`
        : ''
      if (data.errors?.length) {
        setMsg(`수집 완료 — Instagram ${data.instagram}개, RSS ${data.rss}개${debugStr} · 오류: ${data.errors.join(', ')}`)
      } else {
        setMsg(`수집 완료 — Instagram ${data.instagram}개, RSS ${data.rss}개${debugStr}`)
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
          <option value="">수집일</option>
          <option value="likes">반응 수</option>
          <option value="published">발행일</option>
        </select>
      </div>

      {/* 목록 */}
      <div className="divide-y divide-border/40">
        {contents.map(content => {
          const d = new Date(content.collected_at)
          const p = (n: number) => String(n).padStart(2, '0')
          const dateLabel = isNaN(d.getTime()) ? '' : `${p(d.getMonth() + 1)}.${p(d.getDate())}`
          return (
            <div key={content.id} className="flex items-center gap-3 py-2.5">
              <span className="shrink-0 text-xs text-muted-foreground w-[72px]">
                {content.source_type === 'instagram' ? 'Instagram' : 'RSS'}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground w-24 truncate">
                {content.source_name}
              </span>
              <span className="flex-1 text-sm truncate">
                {content.title ?? content.caption?.slice(0, 80)}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground w-10 text-right">
                {dateLabel}
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
                  onClick={() => handleGenerate(content.id)}
                  disabled={generating === content.id}
                  className="h-7 text-xs w-full"
                >
                  {generating === content.id
                    ? `생성 중... ${generateElapsed}초`
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
