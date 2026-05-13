'use client'

import { useState } from 'react'
import type { InstagramWhitelistItem } from '@/types'

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
      <h2 className="text-sm font-semibold">인스타그램 화이트리스트</h2>

      {/* 탭 */}
      <div className="flex gap-1 border-b">
        {(['ko', 'en'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${
              tab === t ? 'border-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'ko' ? '국내' : '해외'} ({items.filter(i => (i.region ?? 'en') === t).length})
          </button>
        ))}
      </div>

      {/* 추가 폼 */}
      <div className="flex gap-2 flex-wrap">
        <input placeholder="@handle" value={newHandle}
          onChange={e => setNewHandle(e.target.value)}
          className="border rounded px-3 py-1 text-sm w-36" />
        <input placeholder="메모 (선택)" value={newDesc}
          onChange={e => setNewDesc(e.target.value)}
          className="border rounded px-3 py-1 text-sm flex-1 min-w-32" />
        <select value={newRegion} onChange={e => setNewRegion(e.target.value as Tab)}
          className="border rounded px-2 py-1 text-sm">
          <option value="ko">국내</option>
          <option value="en">해외</option>
        </select>
        <button onClick={handleAdd}
          className="bg-foreground text-background rounded px-3 py-1 text-sm">추가</button>
      </div>

      {/* 리스트 */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left text-muted-foreground text-xs">
            <th className="py-2 pr-4">핸들</th>
            <th className="py-2 pr-4">메모</th>
            <th className="py-2 pr-4">활성</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(item => (
            <tr key={item.id} className="border-b">
              <td className="py-2 pr-4 font-mono text-xs">
                <a
                  href={`https://instagram.com/${item.handle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {item.handle}
                </a>
              </td>
              <td className="py-2 pr-4 text-muted-foreground text-xs">{item.description}</td>
              <td className="py-2 pr-4">
                <input type="checkbox" checked={item.is_active}
                  onChange={e => handleToggle(item.id, e.target.checked)} />
              </td>
              <td className="py-2">
                <button onClick={() => handleDelete(item.id)}
                  className="text-xs text-red-500">삭제</button>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-xs text-muted-foreground">
                {tab === 'ko' ? '국내' : '해외'} 계정이 없습니다
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
