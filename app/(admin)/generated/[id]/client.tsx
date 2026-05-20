'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { GeneratedContent } from '@/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function GeneratedDetailClient({ content: initial }: { content: GeneratedContent }) {
  const [content, setContent] = useState(initial)
  const [feedback, setFeedback] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [regenElapsed, setRegenElapsed] = useState(0)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const regenTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (regenerating) {
      setRegenElapsed(0)
      regenTimerRef.current = setInterval(() => setRegenElapsed(s => s + 1), 1000)
    } else {
      if (regenTimerRef.current) clearInterval(regenTimerRef.current)
    }
    return () => { if (regenTimerRef.current) clearInterval(regenTimerRef.current) }
  }, [regenerating])

  function handleCopyAll() {
    const lines: string[] = []
    lines.push(`제목: ${content.content_title ?? ''}`)
    lines.push(`핵심 메시지: ${content.core_message ?? ''}`)
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
    lines.push(`인스타그램 본문: ${content.instagram_caption ?? ''}`)
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
        const data = await res.json().catch(() => ({}))
        setMsg(`재생성 실패: ${data.error ?? res.status}`)
      }
    } catch (e) {
      setMsg(`재생성 실패: ${e instanceof Error ? e.message : '네트워크 오류'}`)
    } finally {
      setRegenerating(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('이 카드뉴스를 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/generated/${content.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/generated')
        router.refresh()
      } else {
        setMsg('삭제 실패')
      }
    } catch {
      setMsg('삭제 실패')
    }
  }

  async function handleSaveUpload() {
    setSaving(true)
    try {
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
    } catch {
      setMsg('저장 실패')
    } finally {
      setSaving(false)
    }
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

                {card.expertView && (
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">전문가 관점</p>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-3">{card.expertView}</p>
                  </div>
                )}
                {card.practical && (
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">실무 적용</p>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-3">{card.practical}</p>
                  </div>
                )}
                {card.characterMent && (
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">캐릭터 멘트</p>
                    <p className="text-xs font-medium pl-3">&ldquo;{card.characterMent}&rdquo;</p>
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
