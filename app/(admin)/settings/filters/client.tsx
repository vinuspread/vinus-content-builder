'use client'

import { useState } from 'react'
import type { CollectionFilter } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
    <div className="max-w-lg space-y-5">
      <div className="space-y-4">
        {filters.map((filter, i) => (
          <div key={filter.id} className="space-y-1.5">
            <Label>{filter.label ?? filter.filter_key}</Label>
            <Input
              value={filter.filter_value}
              onChange={e => {
                const updated = [...filters]
                updated[i] = { ...filter, filter_value: e.target.value }
                setFilters(updated)
              }}
            />
          </div>
        ))}
      </div>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
      <Button onClick={handleSave} disabled={saving}>
        {saving ? '저장 중...' : '저장'}
      </Button>
    </div>
  )
}
