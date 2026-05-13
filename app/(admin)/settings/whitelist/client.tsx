'use client'

import { useState } from 'react'
import type { InstagramWhitelistItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type Tab = 'ko' | 'en'

export function WhitelistClient({ initialItems }: { initialItems: InstagramWhitelistItem[] }) {
  const [items, setItems] = useState(initialItems)
  const [tab, setTab] = useState<Tab>('ko')
  const [newHandle, setNewHandle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newRegion, setNewRegion] = useState<Tab>('ko')

  async function handleAdd() {
    if (!newHandle.trim()) return
    const res = await fetch('/api/settings/whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: newHandle.trim(), description: newDesc.trim() || null, region: newRegion }),
    })
    if (res.ok) {
      const { item } = await res.json()
      setItems([...items, item])
      setNewHandle('')
      setNewDesc('')
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/settings/whitelist/${id}`, { method: 'DELETE' })
    setItems(items.filter(i => i.id !== id))
  }

  async function handleToggle(id: string, isActive: boolean) {
    await fetch(`/api/settings/whitelist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    })
    setItems(items.map(i => i.id === id ? { ...i, is_active: isActive } : i))
  }

  const filtered = items.filter(i => (i.region ?? 'en') === tab)

  return (
    <div className="max-w-2xl space-y-4">
      {/* 탭 */}
      <div className="flex gap-0 border-b">
        {(['ko', 'en'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-foreground font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'ko' ? '국내' : '해외'} ({items.filter(i => (i.region ?? 'en') === t).length})
          </button>
        ))}
      </div>

      {/* 추가 폼 */}
      <div className="flex gap-2 flex-wrap">
        <Input placeholder="@handle" value={newHandle} onChange={e => setNewHandle(e.target.value)} className="w-36" />
        <Input placeholder="메모 (선택)" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="flex-1 min-w-32" />
        <select
          value={newRegion}
          onChange={e => setNewRegion(e.target.value as Tab)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="ko">국내</option>
          <option value="en">해외</option>
        </select>
        <Button onClick={handleAdd}>추가</Button>
      </div>

      {/* 계정 목록 */}
      <div className="space-y-1">
        {filtered.map(item => (
          <div key={item.id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 ring-1 ring-foreground/5">
            <a
              href={`https://instagram.com/${item.handle.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm hover:underline min-w-32"
            >
              {item.handle}
            </a>
            <span className="text-xs text-muted-foreground flex-1 truncate">{item.description}</span>
            <Badge
              variant={item.is_active ? 'secondary' : 'outline'}
              className="cursor-pointer shrink-0"
              onClick={() => handleToggle(item.id, !item.is_active)}
            >
              {item.is_active ? '활성' : '비활성'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-destructive hover:text-destructive h-7 px-2 shrink-0">
              삭제
            </Button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            {tab === 'ko' ? '국내' : '해외'} 계정이 없습니다
          </p>
        )}
      </div>
    </div>
  )
}
