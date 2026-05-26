'use client'

import { useState } from 'react'
import type { RssSource } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const RSS_GROUPS = ['디자인 실무 팁', '웹사이트 / UX / 모션', 'AI 디자인 / AI 영상', '브랜드 / 마케팅 / 스타트업', '디자인 의뢰 / 제작 가이드']

export function RssClient({ initialSources }: { initialSources: RssSource[] }) {
  const [sources, setSources] = useState(initialSources)
  const [tab, setTab] = useState(RSS_GROUPS[0])
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')

  async function handleAdd() {
    if (!newName.trim() || !newUrl.trim()) return
    const res = await fetch('/api/settings/rss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), url: newUrl.trim(), group_name: tab }),
    })
    if (res.ok) {
      const { item } = await res.json()
      setSources([...sources, item])
      setNewName('')
      setNewUrl('')
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/settings/rss/${id}`, { method: 'DELETE' })
    setSources(sources.filter(s => s.id !== id))
  }

  async function handleToggle(id: string, isActive: boolean) {
    await fetch(`/api/settings/rss/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    })
    setSources(sources.map(s => s.id === id ? { ...s, is_active: isActive } : s))
  }

  const filtered = sources.filter(s => s.group_name === tab)

  return (
    <div className="max-w-3xl space-y-4">
      {/* 카테고리 탭 */}
      <div className="flex flex-wrap gap-0 border-b">
        {RSS_GROUPS.map(g => {
          const count = sources.filter(s => s.group_name === g).length
          return (
            <button
              key={g}
              onClick={() => setTab(g)}
              className={`px-4 py-2.5 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors ${
                tab === g
                  ? 'border-foreground font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {g} ({count})
            </button>
          )
        })}
      </div>

      {/* 추가 폼 */}
      <div className="flex gap-2 flex-wrap">
        <Input placeholder="RSS 이름" value={newName} onChange={e => setNewName(e.target.value)} className="w-36" />
        <Input placeholder="RSS URL" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="flex-1 min-w-48" />
        <Button onClick={handleAdd}>추가</Button>
      </div>

      {/* RSS 소스 목록 */}
      <div className="space-y-1">
        {filtered.map(source => (
          <div key={source.id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 ring-1 ring-foreground/5">
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-sm font-medium">{source.name}</p>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-muted-foreground hover:text-foreground hover:underline truncate block"
              >
                {source.url}
              </a>
            </div>
            <Badge
              variant={source.is_active ? 'secondary' : 'outline'}
              className="cursor-pointer shrink-0"
              onClick={() => handleToggle(source.id, !source.is_active)}
            >
              {source.is_active ? '활성' : '비활성'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(source.id)} className="text-destructive hover:text-destructive h-7 px-2 shrink-0">
              삭제
            </Button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">이 카테고리에 RSS 소스가 없습니다</p>
        )}
      </div>
    </div>
  )
}
