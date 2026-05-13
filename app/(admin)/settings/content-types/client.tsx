'use client'

import { useState } from 'react'
import type { ContentType } from '@/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ContentTypesClient({ initialTypes }: { initialTypes: ContentType[] }) {
  const [types, setTypes] = useState(initialTypes)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const total = types.filter(t => t.is_active).reduce((s, t) => s + Number(t.target_ratio), 0)

  async function handleSave() {
    if (Math.round(total) !== 100) {
      setMessage('목표 비율 합계가 100%가 아닙니다.')
      return
    }
    setSaving(true)
    const res = await fetch('/api/settings/content-types', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(types),
    })
    setMessage(res.ok ? '저장됐습니다.' : '저장 실패')
    setSaving(false)
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">활성 유형의 목표 비율 합계가 100%여야 저장됩니다</p>
        <span className={cn('text-sm font-semibold tabular-nums', Math.round(total) === 100 ? 'text-green-600' : 'text-destructive')}>
          합계 {total.toFixed(0)}%
        </span>
      </div>
      <div className="space-y-2">
        {types.map((type, i) => (
          <div key={type.id} className="rounded-xl border bg-card p-4 ring-1 ring-foreground/5">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={type.is_active}
                onChange={e => {
                  const updated = [...types]
                  updated[i] = { ...type, is_active: e.target.checked }
                  setTypes(updated)
                }}
              />
              <div className="flex-1 space-y-0.5">
                <p className="text-sm font-medium">{type.name}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{type.description}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={type.target_ratio}
                  onChange={e => {
                    const updated = [...types]
                    updated[i] = { ...type, target_ratio: Number(e.target.value) }
                    setTypes(updated)
                  }}
                  className="w-14 rounded-md border border-input bg-background px-2 py-1 text-sm text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
      <Button onClick={handleSave} disabled={saving || Math.round(total) !== 100}>
        {saving ? '저장 중...' : '저장'}
      </Button>
    </div>
  )
}
