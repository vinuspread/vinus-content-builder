'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { CollectedContent, ContentType } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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
    const res = await fetch('/api/collect', { method: 'POST' })
    const data = await res.json()
    if (data.errors?.length) {
      setMsg(`수집 완료 — Instagram ${data.instagram}개, RSS ${data.rss}개 · 오류: ${data.errors.join(', ')}`)
    } else {
      setMsg(`수집 완료 — Instagram ${data.instagram}개, RSS ${data.rss}개`)
    }
    setCollecting(false)
    router.refresh()
  }

  async function handleClassifyAll() {
    setClassifying(true)
    setMsg('')
    const res = await fetch('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    const data = await res.json()
    setMsg(`분류 완료 — ${data.classified}개`)
    setClassifying(false)
    router.refresh()
  }

  async function handleGenerate(contentId: string) {
    setGenerating(contentId)
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceContentId: contentId }),
    })
    if (res.ok) {
      setMsg('생성 완료')
    } else {
      setMsg('생성 실패')
    }
    setGenerating(null)
  }

  async function handleTypeChange(contentId: string, typeId: string) {
    await fetch('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId, manualTypeId: typeId }),
    })
    router.refresh()
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
    <div className="space-y-5">
      {/* 헤더 액션 바 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="mr-2">
          <h1 className="text-lg font-semibold leading-tight">
            수집콘텐츠
            <span className="ml-2 text-sm font-normal text-muted-foreground">{contents.length}개</span>
          </h1>
          {collectedLabel && (
            <p className="text-xs text-muted-foreground">{collectedLabel} 수집</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Button onClick={handleCollect} disabled={collecting} size="sm">
            {collecting ? `수집 중... ${collectElapsed}초` : '수집 실행'}
          </Button>
          {collecting && (
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground transition-all duration-1000"
                style={{ width: `${Math.min(92, Math.round(92 * (1 - Math.exp(-collectElapsed / 30))))}%` }}
              />
            </div>
          )}
        </div>
        <Button onClick={handleClassifyAll} disabled={classifying} variant="outline" size="sm">
          {classifying ? '분류 중...' : '미분류 자동 분류'}
        </Button>
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
        <div className="ml-auto flex items-center gap-2">
          <select
            onChange={e => updateFilter('source', e.target.value)}
            defaultValue={searchParams.get('source') ?? ''}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">전체 출처</option>
            <option value="instagram">인스타그램</option>
            <option value="rss">RSS</option>
          </select>
          <select
            onChange={e => updateFilter('type', e.target.value)}
            defaultValue={searchParams.get('type') ?? ''}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">전체 유형</option>
            {contentTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            onChange={e => updateFilter('sort', e.target.value)}
            defaultValue={searchParams.get('sort') ?? ''}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">반응 수</option>
            <option value="collected">수집일</option>
            <option value="published">발행일</option>
          </select>
        </div>
      </div>

      {/* 콘텐츠 목록 */}
      <div className="space-y-2">
        {contents.map(content => (
          <div
            key={content.id}
            className="flex gap-4 rounded-xl border bg-card p-4 ring-1 ring-foreground/5"
          >
            {content.thumbnail_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={content.thumbnail_url}
                alt=""
                className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">
                  {content.source_type === 'instagram' ? 'Instagram' : 'RSS'}
                </Badge>
                {generatedSet.has(content.id) && (
                  <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">생성완료</Badge>
                )}
                <span className="text-xs text-muted-foreground font-medium">{content.source_name}</span>
                {content.like_count > 0 && (
                  <span className="text-xs text-muted-foreground">♥ {content.like_count.toLocaleString()}</span>
                )}
              </div>
              <p className="text-sm font-medium leading-snug line-clamp-1">
                {content.title ?? content.caption?.slice(0, 80)}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {content.caption?.slice(0, 140)}
              </p>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <select
                  defaultValue={content.content_type_id ?? ''}
                  onChange={e => handleTypeChange(content.id, e.target.value)}
                  className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">유형 미분류</option>
                  {contentTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <a
                  href={content.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  원본 →
                </a>
                <div className="ml-auto flex flex-col items-end gap-1">
                  <Button
                    size="sm"
                    variant={generatedSet.has(content.id) ? 'secondary' : 'outline'}
                    onClick={() => !generatedSet.has(content.id) && handleGenerate(content.id)}
                    disabled={generating === content.id || generatedSet.has(content.id)}
                    className="h-7 text-xs"
                  >
                    {generating === content.id
                      ? `생성 중... ${generateElapsed}초`
                      : generatedSet.has(content.id)
                      ? '생성완료'
                      : '카드뉴스 생성'}
                  </Button>
                  {generating === content.id && (
                    <div className="h-1 w-24 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-foreground transition-all duration-1000"
                        style={{ width: `${Math.min(92, Math.round(92 * (1 - Math.exp(-generateElapsed / 25))))}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {contents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm font-medium text-muted-foreground">수집된 콘텐츠가 없습니다</p>
            <p className="text-xs text-muted-foreground mt-1">수집 실행 버튼을 눌러 콘텐츠를 가져오세요</p>
          </div>
        )}
      </div>
    </div>
  )
}
