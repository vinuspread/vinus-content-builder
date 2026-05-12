'use client'

import { useState } from 'react'
import type { CollectionFilter } from '@/types'

export function FiltersClient({ initialFilters }: { initialFilters: CollectionFilter[] }) {
  const [filters, setFilters] = useState(initialFilters)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/settings/filters', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filters),
    })
    setMessage(res.ok ? '저장됐습니다.' : '저장 실패')
    setSaving(false)
  }

  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-sm font-semibold">수집 필터 설정</h2>
      {filters.map((filter, i) => (
        <div key={filter.id} className="flex items-center gap-3">
          <label className="text-sm w-44 shrink-0">{filter.label ?? filter.filter_key}</label>
          <input
            type="text"
            value={filter.filter_value}
            onChange={e => {
              const updated = [...filters]
              updated[i] = { ...filter, filter_value: e.target.value }
              setFilters(updated)
            }}
            className="border rounded px-3 py-1 text-sm flex-1"
          />
        </div>
      ))}
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
      <button onClick={handleSave} disabled={saving}
        className="bg-foreground text-background rounded px-4 py-2 text-sm disabled:opacity-50">
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  )
}
