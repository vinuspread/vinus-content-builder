'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { GeneratedContent } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

export function GeneratedDetailClient({ content: initial }: { content: GeneratedContent }) {
  const [content, setContent] = useState(initial)
  const [feedback, setFeedback] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const router = useRouter()

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
    setRegenerating(false)
  }

  async function handleDelete() {
    if (!window.confirm('이 제작콘텐츠를 삭제하시겠습니까?')) return
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

  return (
    <div className="max-w-2xl space-y-6">
      {/* 목록으로 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/generated')}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← 목록
        </button>
        <Button variant="outline" size="sm" onClick={handleCopyAll} className="text-xs h-7">
          {copied ? '복사됨 ✓' : '전체 복사'}
        </Button>
      </div>

      {/* 제목 + 메타 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">
            {(content.content_type as { name: string } | null)?.name ?? '미분류'}
          </Badge>
          {content.source_content_id === null && (
            <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
              자체콘텐츠
            </Badge>
          )}
          {content.is_published && (
            <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
              업로드 완료
            </Badge>
          )}
          {sourceContent?.original_url && (
            <a
              href={sourceContent.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              원본 링크 →
            </a>
          )}
        </div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-semibold leading-snug">{content.content_title}</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-destructive hover:text-destructive shrink-0 h-7 px-2"
          >
            삭제
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{content.core_message}</p>
      </div>

      {/* 카드뉴스 슬라이드 */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          카드뉴스 · {content.carousel_content.length}장
        </p>
        {content.carousel_content.map(card => (
          <Card key={card.number} size="sm">
            <CardHeader className="pb-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {card.number}
                </span>
                <Badge variant="outline" className="text-xs">{card.role}</Badge>
              </div>
              <CardTitle className="text-sm font-semibold leading-snug">{card.headline}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{card.body}</p>
              {card.expertView && (
                <div className="rounded-md bg-muted/40 px-3 py-2 space-y-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">전문가 관점</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{card.expertView}</p>
                </div>
              )}
              {card.practical && (
                <div className="rounded-md bg-muted/40 px-3 py-2 space-y-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">실무 적용</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{card.practical}</p>
                </div>
              )}
              {(card.characterMent || card.characterVisual) && (
                <div className="rounded-md border border-dashed px-3 py-2 space-y-2">
                  {card.characterMent && (
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">캐릭터 멘트</p>
                      <p className="text-xs font-medium">&ldquo;{card.characterMent}&rdquo;</p>
                    </div>
                  )}
                  {card.characterVisual && (
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">비주얼 지시</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{card.characterVisual}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 인스타그램 본문 */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">인스타그램 본문</p>
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-sm whitespace-pre-line leading-relaxed">{content.instagram_caption}</p>
        </div>
      </div>

      {/* 해시태그 */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">해시태그</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{content.hashtags.join(' ')}</p>
      </div>

      {/* 피드백 재생성 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">피드백 재생성</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="수정 의견을 입력하세요. 예: 2~4번 카드 내용이 너무 추상적입니다. 구체적인 사례를 추가해주세요."
            rows={3}
          />
          <Button
            onClick={handleRegenerate}
            disabled={regenerating || !feedback.trim()}
          >
            {regenerating ? '재생성 중...' : '피드백 반영하여 다시 생성'}
          </Button>
        </CardContent>
      </Card>

      {/* 업로드 완료 체크 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">업로드 완료 체크</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="rounded"
              checked={content.is_published}
              onChange={e => setContent({ ...content, is_published: e.target.checked })}
            />
            바이너스 SNS에 업로드 완료
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="post-url">인스타그램 게시물 URL</Label>
            <Input
              id="post-url"
              type="url"
              placeholder="https://www.instagram.com/p/..."
              value={content.instagram_post_url ?? ''}
              onChange={e => setContent({ ...content, instagram_post_url: e.target.value })}
            />
          </div>
          <Button variant="outline" onClick={handleSaveUpload} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </Button>
        </CardContent>
      </Card>

      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  )
}
