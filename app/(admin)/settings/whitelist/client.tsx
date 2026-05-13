'use client'

import { useState } from 'react'
import type { InstagramWhitelistItem } from '@/types'

export function WhitelistClient({ initialItems }: { initialItems: InstagramWhitelistItem[] }) {
  const [items, setItems] = useState(initialItems)
  const [newHandle, setNewHandle] = useState('')
  const [newDesc, setNewDesc] = useState('')

  async function handleAdd() {
    if (!newHandle.trim()) return
    const res = await fetch('/api/settings/whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: newHandle.trim(), description: newDesc.trim() || null }),
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

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-sm font-semibold">인스타그램 화이트리스트</h2>
      <div className="flex gap-2">
        <input placeholder="@handle" value={newHandle}
          onChange={e => setNewHandle(e.target.value)}
          className="border rounded px-3 py-1 text-sm flex-1" />
        <input placeholder="메모 (선택)" value={newDesc}
          onChange={e => setNewDesc(e.target.value)}
          className="border rounded px-3 py-1 text-sm flex-1" />
        <button onClick={handleAdd}
          className="bg-foreground text-background rounded px-3 py-1 text-sm">추가</button>
      </div>
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
          {items.map(item => (
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
        </tbody>
      </table>
    </div>
  )
}
