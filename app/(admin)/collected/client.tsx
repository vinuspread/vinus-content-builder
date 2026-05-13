'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { CollectedContent, ContentType } from '@/types'

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

  async function handleCollect() {
    setCollecting(true)
    setMsg('')
    const res = await fetch('/api/collect', { method: 'POST' })
    const data = await res.json()
    if (data.errors?.length) {
      setMsg(`수집 완료: Instagram ${data.instagram}개, RSS ${data.rss}개 (오류: ${data.errors.join(', ')})`)
    } else {
      setMsg(`수집 완료: Instagram ${data.instagram}개, RSS ${data.rss}개`)
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
    setMsg(`분류 완료: ${data.classified}개`)
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
      const { id } = await res.json()
      router.push(`/generated/${id}`)
    } else {
      setMsg('생성 실패')
      setGenerating(null)
    }
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-sm font-semibold">수집콘텐츠</h1>
        <button
          onClick={handleCollect}
          disabled={collecting}
          className="bg-foreground text-background rounded px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          {collecting ? '수집 중...' : '수집 실행'}
        </button>
        <button
          onClick={handleClassifyAll}
          disabled={classifying}
          className="border rounded px-3 py-1.5 text-xs disabled:opacity-50"
        >
          {classifying ? '분류 중...' : '미분류 자동 분류'}
        </button>
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
        <div className="ml-auto flex items-center gap-2">
          <select
            onChange={e => updateFilter('source', e.target.value)}
            defaultValue={searchParams.get('source') ?? ''}
            className="border rounded px-2 py-1 text-xs"
          >
            <option value="">전체 출처</option>
            <option value="instagram">인스타그램</option>
            <option value="rss">RSS</option>
          </select>
          <select
            onChange={e => updateFilter('type', e.target.value)}
            defaultValue={searchParams.get('type') ?? ''}
            className="border rounded px-2 py-1 text-xs"
          >
            <option value="">전체 유형</option>
            {contentTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            onChange={e => updateFilter('sort', e.target.value)}
            defaultValue={searchParams.get('sort') ?? ''}
            className="border rounded px-2 py-1 text-xs"
          >
            <option value="">반응 수</option>
            <option value="collected">수집일</option>
            <option value="published">발행일</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {contents.map(content => (
          <div key={content.id} className="border rounded-lg p-4 flex gap-4">
            {content.thumbnail_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={content.thumbnail_url}
                alt=""
                className="w-16 h-16 object-cover rounded flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{content.source_type}</span>
                <span className="text-xs text-muted-foreground">{content.source_name}</span>
                {content.like_count > 0 && (
                  <span className="text-xs text-muted-foreground">♥ {content.like_count.toLocaleString()}</span>
                )}
              </div>
              <p className="text-sm font-medium line-clamp-1">
                {content.title ?? content.caption?.slice(0, 60)}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {content.caption?.slice(0, 120)}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <select
                  defaultValue={content.content_type_id ?? ''}
                  onChange={e => handleTypeChange(content.id, e.target.value)}
                  className="border rounded px-2 py-0.5 text-xs"
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
                  className="text-xs text-muted-foreground hover:underline"
                >
                  원본
                </a>
                <button
                  onClick={() => handleGenerate(content.id)}
                  disabled={generating === content.id}
                  className="ml-auto bg-foreground text-background rounded px-3 py-1 text-xs disabled:opacity-50"
                >
                  {generating === content.id ? '생성 중...' : '콘텐츠로 생성하기'}
                </button>
              </div>
            </div>
          </div>
        ))}
        {contents.length === 0 && (
          <p className="text-sm text-muted-foreground py-12 text-center">
            수집된 콘텐츠가 없습니다. 수집 실행 버튼을 눌러주세요.
          </p>
        )}
      </div>
    </div>
  )
}
