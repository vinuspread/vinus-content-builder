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
