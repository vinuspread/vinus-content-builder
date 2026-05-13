'use client'

import { useState } from 'react'
import type { InstagramHashtagItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export function HashtagsClient({ initialItems }: { initialItems: InstagramHashtagItem[] }) {
  const [items, setItems] = useState(initialItems)
  const [newTag, setNewTag] = useState('')
  const [lang, setLang] = useState<'ko' | 'en'>('ko')
  const [tab, setTab] = useState<'ko' | 'en'>('ko')

  async function handleAdd() {
    if (!newTag.trim()) return
    const res = await fetch('/api/settings/hashtags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hashtag: newTag.trim(), language: lang }),
    })
    if (res.ok) {
      const { item } = await res.json()
      setItems([...items, item])
      setNewTag('')
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/settings/hashtags/${id}`, { method: 'DELETE' })
    setItems(items.filter(i => i.id !== id))
  }

  async function handleToggle(id: string, isActive: boolean) {
    await fetch(`/api/settings/hashtags/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    })
    setItems(items.map(i => i.id === id ? { ...i, is_active: isActive } : i))
  }

  const filtered = items.filter(i => i.language === tab)

  return (
    <div className="max-w-2xl space-y-4">
      {/* 탭 */}
      <div className="flex gap-0 border-b">
        {(['ko', 'en'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-foreground font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'ko' ? '한국어' : '영어'} ({items.filter(i => i.language === t).length})
          </button>
        ))}
      </div>

      {/* 추가 폼 */}
      <div className="flex gap-2">
        <Input
          placeholder="#해시태그"
          value={newTag}
          onChange={e => setNewTag(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="flex-1"
        />
        <select
          value={lang}
          onChange={e => setLang(e.target.value as 'ko' | 'en')}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="ko">한국어</option>
          <option value="en">영어</option>
        </select>
        <Button onClick={handleAdd}>추가</Button>
      </div>

      {/* 해시태그 목록 */}
      <div className="space-y-1">
        {filtered.map(item => (
          <div key={item.id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5 ring-1 ring-foreground/5">
            <span className="font-mono text-sm flex-1">{item.hashtag}</span>
            <Badge variant={item.is_active ? 'secondary' : 'outline'} className="cursor-pointer" onClick={() => handleToggle(item.id, !item.is_active)}>
              {item.is_active ? '활성' : '비활성'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-destructive hover:text-destructive h-7 px-2">
              삭제
            </Button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            {tab === 'ko' ? '한국어' : '영어'} 해시태그가 없습니다
          </p>
        )}
      </div>
    </div>
  )
}
