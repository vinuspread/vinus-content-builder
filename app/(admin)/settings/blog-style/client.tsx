'use client'

import { useState } from 'react'
import type { BlogStyleReference } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function BlogStyleClient({ initialRefs }: { initialRefs: BlogStyleReference[] }) {
  const [refs, setRefs] = useState(initialRefs)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [msg, setMsg] = useState('')

  async function handleAdd() {
    if (!newTitle.trim() || !newContent.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/settings/blog-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), content: newContent.trim() }),
      })
      if (res.ok) {
        const { item } = await res.json()
        setRefs([...refs, item])
        setNewTitle('')
        setNewContent('')
        setMsg('추가됐습니다.')
      } else {
        setMsg('추가 실패')
      }
    } catch {
      setMsg('추가 실패')
    } finally {
      setAdding(false)
    }
  }

  function startEdit(ref: BlogStyleReference) {
    setEditingId(ref.id)
    setEditTitle(ref.title)
    setEditContent(ref.content)
    setMsg('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditTitle('')
    setEditContent('')
  }

  async function handleSaveEdit(id: string) {
    if (!editTitle.trim() || !editContent.trim()) return
    try {
      const res = await fetch(`/api/settings/blog-style/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim(), content: editContent.trim() }),
      })
      if (res.ok) {
        setRefs(refs.map(r => r.id === id ? { ...r, title: editTitle.trim(), content: editContent.trim() } : r))
        cancelEdit()
        setMsg('수정됐습니다.')
      } else {
        setMsg('수정 실패')
      }
    } catch {
      setMsg('수정 실패')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('이 참고 글을 삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/settings/blog-style/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setRefs(refs.filter(r => r.id !== id))
        setMsg('삭제됐습니다.')
      } else {
        setMsg('삭제 실패')
      }
    } catch {
      setMsg('삭제 실패')
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">블로그 스타일 참고 글</h2>
        <p className="text-xs text-muted-foreground">
          등록된 글의 문체·구성을 참고해 블로그를 생성합니다. 3~5개가 적당합니다.
        </p>
      </div>

      {/* 등록된 참고 글 목록 */}
      <div className="space-y-3">
        {refs.map(ref => (
          <div key={ref.id} className="border border-border/60 rounded-lg p-4 space-y-3">
            {editingId === ref.id ? (
              <>
                <Input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="제목"
                  className="text-sm"
                />
                <Textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={8}
                  className="text-sm font-mono"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleSaveEdit(ref.id)} disabled={!editTitle.trim() || !editContent.trim()}>
                    저장
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    취소
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{ref.title}</p>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => startEdit(ref)}>
                      수정
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleDelete(ref.id)}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-3">
                  {ref.content}
                </p>
                <p className="text-xs text-muted-foreground">{ref.content.length.toLocaleString()}자</p>
              </>
            )}
          </div>
        ))}
        {refs.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">등록된 참고 글이 없습니다.</p>
        )}
      </div>

      {/* 새 참고 글 추가 */}
      <div className="border-t border-border/40 pt-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">참고 글 추가</p>
        <Input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="제목 (예: 브랜딩 아티클 샘플)"
          className="text-sm"
        />
        <Textarea
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          placeholder="참고할 블로그 글 본문을 붙여넣으세요."
          rows={10}
          className="text-sm font-mono"
        />
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={adding || !newTitle.trim() || !newContent.trim()}
          >
            {adding ? '추가 중...' : '추가'}
          </Button>
          {newContent && (
            <span className="text-xs text-muted-foreground">{newContent.length.toLocaleString()}자</span>
          )}
        </div>
      </div>

      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  )
}
