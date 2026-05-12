'use client'

import { useState } from 'react'
import type { InstagramHashtagItem } from '@/types'

export function HashtagsClient({ initialItems }: { initialItems: InstagramHashtagItem[] }) {
  const [items, setItems] = useState(initialItems)
  const [newTag, setNewTag] = useState('')
  const [lang, setLang] = useState<'ko' | 'en'>('ko')

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

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-sm font-semibold">인스타그램 해시태그</h2>
      <div className="flex gap-2">
        <input placeholder="#해시태그" value={newTag}
          onChange={e => setNewTag(e.target.value)}
          className="border rounded px-3 py-1 text-sm flex-1" />
        <select value={lang} onChange={e => setLang(e.target.value as 'ko' | 'en')}
          className="border rounded px-2 py-1 text-sm">
          <option value="ko">한국어</option>
          <option value="en">영어</option>
        </select>
        <button onClick={handleAdd}
          className="bg-foreground text-background rounded px-3 py-1 text-sm">추가</button>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left text-muted-foreground text-xs">
            <th className="py-2 pr-4">해시태그</th>
            <th className="py-2 pr-4">언어</th>
            <th className="py-2 pr-4">활성</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} className="border-b">
              <td className="py-2 pr-4 font-mono text-xs">{item.hashtag}</td>
              <td className="py-2 pr-4 text-xs">{item.language}</td>
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
