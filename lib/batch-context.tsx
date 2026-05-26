'use client'

import { createContext, useContext, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type BatchJob = {
  type: 'cardnews' | 'blog'
  current: number
  total: number
  failed: number
}

type BatchResult = {
  type: 'cardnews' | 'blog'
  succeeded: number
  failed: number
  errors: string[]
}

type BatchContextValue = {
  job: BatchJob | null
  lastResult: BatchResult | null
  clearResult: () => void
  startCardnewsBatch: (ids: string[]) => void
  startBlogBatch: (ids: string[]) => void
}

const BatchContext = createContext<BatchContextValue>({
  job: null,
  lastResult: null,
  clearResult: () => {},
  startCardnewsBatch: () => {},
  startBlogBatch: () => {},
})

export function BatchProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [job, setJob] = useState<BatchJob | null>(null)
  const [lastResult, setLastResult] = useState<BatchResult | null>(null)
  const runningRef = useRef(false)

  const clearResult = useCallback(() => setLastResult(null), [])

  const startCardnewsBatch = useCallback(async (ids: string[]) => {
    if (runningRef.current || ids.length === 0) return
    runningRef.current = true
    let done = 0
    let failed = 0
    const errors: string[] = []
    try {
      setJob({ type: 'cardnews', current: 0, total: ids.length, failed: 0 })
      for (const id of ids) {
        setJob({ type: 'cardnews', current: done, total: ids.length, failed })
        try {
          const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceContentId: id }),
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            failed++
            errors.push(data.error ?? `${res.status}`)
          }
        } catch (e) {
          failed++
          errors.push(e instanceof Error ? e.message : 'network error')
        }
        done++
      }
    } finally {
      setJob(null)
      runningRef.current = false
      setLastResult({ type: 'cardnews', succeeded: ids.length - failed, failed, errors })
      router.refresh()
    }
  }, [router])

  const startBlogBatch = useCallback(async (ids: string[]) => {
    if (runningRef.current || ids.length === 0) return
    runningRef.current = true
    let done = 0
    let failed = 0
    const errors: string[] = []
    try {
      setJob({ type: 'blog', current: 0, total: ids.length, failed: 0 })
      for (const id of ids) {
        setJob({ type: 'blog', current: done, total: ids.length, failed })
        try {
          const res = await fetch('/api/blog/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ generatedContentId: id }),
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            failed++
            errors.push(data.error ?? `${res.status}`)
          }
        } catch (e) {
          failed++
          errors.push(e instanceof Error ? e.message : 'network error')
        }
        done++
      }
    } finally {
      setJob(null)
      runningRef.current = false
      setLastResult({ type: 'blog', succeeded: ids.length - failed, failed, errors })
      router.refresh()
    }
  }, [router])

  return (
    <BatchContext.Provider value={{ job, lastResult, clearResult, startCardnewsBatch, startBlogBatch }}>
      {children}
    </BatchContext.Provider>
  )
}

export function useBatch() {
  return useContext(BatchContext)
}
