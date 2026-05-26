'use client'

import { createContext, useContext, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type BatchJob = {
  type: 'cardnews' | 'blog'
  current: number
  total: number
  failed: number
}

type BatchContextValue = {
  job: BatchJob | null
  startCardnewsBatch: (ids: string[]) => void
  startBlogBatch: (ids: string[]) => void
}

const BatchContext = createContext<BatchContextValue>({
  job: null,
  startCardnewsBatch: () => {},
  startBlogBatch: () => {},
})

export function BatchProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [job, setJob] = useState<BatchJob | null>(null)
  const runningRef = useRef(false)

  const startCardnewsBatch = useCallback(async (ids: string[]) => {
    if (runningRef.current || ids.length === 0) return
    runningRef.current = true
    let done = 0
    let failed = 0
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
          if (!res.ok) failed++
        } catch {
          failed++
        }
        done++
      }
    } finally {
      setJob(null)
      runningRef.current = false
      router.refresh()
    }
  }, [router])

  const startBlogBatch = useCallback(async (ids: string[]) => {
    if (runningRef.current || ids.length === 0) return
    runningRef.current = true
    let done = 0
    let failed = 0
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
          if (!res.ok) failed++
        } catch {
          failed++
        }
        done++
      }
    } finally {
      setJob(null)
      runningRef.current = false
      router.refresh()
    }
  }, [router])

  return (
    <BatchContext.Provider value={{ job, startCardnewsBatch, startBlogBatch }}>
      {children}
    </BatchContext.Provider>
  )
}

export function useBatch() {
  return useContext(BatchContext)
}
