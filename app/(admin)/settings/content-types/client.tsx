'use client'

import { useState } from 'react'
import type { ContentType } from '@/types'

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
        <h2 className="text-sm font-semibold">콘텐츠 유형 설정</h2>
        <span className={`text-xs ${Math.round(total) === 100 ? 'text-green-600' : 'text-red-500'}`}>
          합계: {total.toFixed(0)}%
        </span>
      </div>
      {types.map((type, i) => (
        <div key={type.id} className="border rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={type.is_active}
              onChange={e => {
                const updated = [...types]
                updated[i] = { ...type, is_active: e.target.checked }
                setTypes(updated)
              }}
            />
            <span className="text-sm font-medium">{type.name}</span>
            <div className="ml-auto flex items-center gap-2">
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
                className="w-16 border rounded px-2 py-1 text-sm text-right"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pl-6">{type.description}</p>
        </div>
      ))}
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
      <button
        onClick={handleSave}
        disabled={saving || Math.round(total) !== 100}
        className="bg-foreground text-background rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  )
}
