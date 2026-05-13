'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { GeneratedContent } from '@/types'

export function GeneratedDetailClient({ content: initial }: { content: GeneratedContent }) {
  const [content, setContent] = useState(initial)
  const [feedback, setFeedback] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const router = useRouter()

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
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold flex-1">{content.content_title}</h1>
        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
          {(content.content_type as { name: string } | null)?.name ?? '미분류'}
        </span>
        {sourceContent?.original_url && (
          <a
            href={sourceContent.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:underline"
          >
            원본 링크
          </a>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">핵심 메시지</p>
        <p className="text-sm">{content.core_message}</p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          카드뉴스 ({content.carousel_content.length}장)
        </p>
        {content.carousel_content.map(card => (
          <div key={card.number} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">
                {card.number}. {card.role}
              </span>
            </div>
            <p className="text-sm font-medium">{card.headline}</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{card.body}</p>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">인스타그램 본문</p>
        <p className="text-sm whitespace-pre-line">{content.instagram_caption}</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">해시태그</p>
        <p className="text-sm text-muted-foreground">{content.hashtags.join(' ')}</p>
      </div>

      {/* 피드백 재생성 */}
      <div className="border rounded-lg p-4 space-y-3">
        <p className="text-xs font-medium">피드백 재생성</p>
        <textarea
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          placeholder="수정 의견을 입력하세요. 예: 2~4번 카드 내용이 너무 추상적입니다. 구체적인 사례를 추가해주세요."
          rows={3}
          className="w-full border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-foreground"
        />
        <button
          onClick={handleRegenerate}
          disabled={regenerating || !feedback.trim()}
          className="bg-foreground text-background rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          {regenerating ? '재생성 중...' : '피드백 반영하여 다시 생성'}
        </button>
      </div>

      {/* 업로드 완료 체크 */}
      <div className="border rounded-lg p-4 space-y-3">
        <p className="text-xs font-medium">업로드 완료 체크</p>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={content.is_published}
            onChange={e => setContent({ ...content, is_published: e.target.checked })}
          />
          바이너스 SNS에 업로드 완료
        </label>
        <input
          type="url"
          placeholder="인스타그램 게시물 URL"
          value={content.instagram_post_url ?? ''}
          onChange={e => setContent({ ...content, instagram_post_url: e.target.value })}
          className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
        />
        <button
          onClick={handleSaveUpload}
          disabled={saving}
          className="border rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  )
}
