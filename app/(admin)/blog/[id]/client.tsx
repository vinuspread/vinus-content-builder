'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { BlogContent } from '@/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function BlogDetailClient({ blog: initial }: { blog: BlogContent }) {
  const [blog, setBlog] = useState(initial)
  const [feedback, setFeedback] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [regenElapsed, setRegenElapsed] = useState(0)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const regenTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const router = useRouter()

  useEffect(() => {
    setBlog(initial)
  }, [initial])

  useEffect(() => {
    if (regenerating) {
      setRegenElapsed(0)
      regenTimerRef.current = setInterval(() => setRegenElapsed(s => s + 1), 1000)
    } else {
      if (regenTimerRef.current) clearInterval(regenTimerRef.current)
    }
    return () => { if (regenTimerRef.current) clearInterval(regenTimerRef.current) }
  }, [regenerating])

  function handleCopy() {
    const text = `${blog.blog_title}\n\n${blog.blog_content}`
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => setMsg('클립보드 복사에 실패했습니다.'))
  }

  async function handleDelete() {
    if (!window.confirm('이 블로그 글을 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/blog/${blog.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/blog')
        router.refresh()
      } else {
        setMsg('삭제 실패')
      }
    } catch {
      setMsg('삭제 실패')
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/blog/${blog.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: blog.is_published }),
      })
      setMsg(res.ok ? '저장됐습니다.' : '저장 실패')
    } catch {
      setMsg('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  async function handleRegenerate() {
    if (!window.confirm(
      '현재 블로그 글을 보관하고 싶으시면 먼저 복사해주세요.\n재생성하면 현재 내용이 덮어씌워집니다.\n\n계속하시겠습니까?'
    )) return
    setRegenerating(true)
    setMsg('')
    try {
      const res = await fetch('/api/blog/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogContentId: blog.id, feedback }),
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

  const generatedContent = blog.generated_content as {
    id: string
    content_title: string | null
    content_type: { name: string } | null
  } | null

  return (
    <div className="space-y-4">
      {/* 상단 바 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/blog')}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← 목록
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs h-7">
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

      {/* 제목 */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {generatedContent?.content_type?.name ?? '미분류'}
          </span>
          {blog.is_published && <span className="text-xs text-green-600">✓ 발행 완료</span>}
        </div>
        <h1 className="text-xl font-semibold leading-snug">{blog.blog_title}</h1>
      </div>

      {/* 2컬럼 본문 */}
      <div className="flex gap-8 items-start">
        {/* 왼쪽: 블로그 본문 */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">블로그 본문</p>
          <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
            {blog.blog_content}
          </p>
        </div>

        {/* 오른쪽: 액션 패널 (sticky) */}
        <div className="w-64 shrink-0 sticky top-20 self-start space-y-6">
          {/* 원본 카드뉴스 링크 */}
          {generatedContent && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">원본 카드뉴스</p>
              <a
                href={`/generated/${generatedContent.id}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {generatedContent.content_title ?? '(제목 없음)'} ↗
              </a>
            </div>
          )}

          <div className="border-t border-border/40" />

          {/* 발행 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">발행</p>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="rounded"
                checked={blog.is_published}
                onChange={e => setBlog({ ...blog, is_published: e.target.checked })}
              />
              발행 완료
            </label>
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="w-full">
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
