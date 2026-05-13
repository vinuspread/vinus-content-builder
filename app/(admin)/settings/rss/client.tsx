'use client'

import { useState } from 'react'
import type { RssSource } from '@/types'

const RSS_GROUPS = ['디자인 실무 팁', '웹사이트 / UX / 모션', 'AI 디자인 / AI 영상', '브랜드 / 마케팅 / 스타트업', '디자인 의뢰 / 제작 가이드']

export function RssClient({ initialSources }: { initialSources: RssSource[] }) {
  const [sources, setSources] = useState(initialSources)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newGroup, setNewGroup] = useState(RSS_GROUPS[0])

  async function handleAdd() {
    if (!newName.trim() || !newUrl.trim()) return
    const res = await fetch('/api/settings/rss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), url: newUrl.trim(), group_name: newGroup }),
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

  return (
    <div className="max-w-3xl space-y-4">
      <h2 className="text-sm font-semibold">RSS 소스 관리</h2>
      <div className="flex gap-2 flex-wrap">
        <input placeholder="RSS 이름" value={newName}
          onChange={e => setNewName(e.target.value)}
          className="border rounded px-3 py-1 text-sm w-36" />
        <input placeholder="RSS URL" value={newUrl}
          onChange={e => setNewUrl(e.target.value)}
          className="border rounded px-3 py-1 text-sm flex-1 min-w-48" />
        <select value={newGroup} onChange={e => setNewGroup(e.target.value)}
          className="border rounded px-2 py-1 text-sm">
          {RSS_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <button onClick={handleAdd}
          className="bg-foreground text-background rounded px-3 py-1 text-sm">추가</button>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left text-muted-foreground text-xs">
            <th className="py-2 pr-3">이름</th>
            <th className="py-2 pr-3">그룹</th>
            <th className="py-2 pr-3">URL</th>
            <th className="py-2 pr-3">활성</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {sources.map(source => (
            <tr key={source.id} className="border-b">
              <td className="py-2 pr-3 text-xs">{source.name}</td>
              <td className="py-2 pr-3 text-xs text-muted-foreground">{source.group_name}</td>
              <td className="py-2 pr-3 text-xs font-mono truncate max-w-48">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {source.url}
                </a>
              </td>
              <td className="py-2 pr-3">
                <input type="checkbox" checked={source.is_active}
                  onChange={e => handleToggle(source.id, e.target.checked)} />
              </td>
              <td className="py-2">
                <button onClick={() => handleDelete(source.id)}
                  className="text-xs text-red-500">삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
