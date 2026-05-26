'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useBatch } from '@/lib/batch-context'

const navLinks = [
  { href: '/collected', label: '수집콘텐츠', prefix: '/collected' },
  { href: '/generated', label: '카드뉴스목록', prefix: '/generated' },
  { href: '/blog', label: '블로그목록', prefix: '/blog' },
  { href: '/settings/content-types', label: '설정', prefix: '/settings' },
]

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { job, lastResult, clearResult } = useBatch()

  useEffect(() => {
    if (!lastResult) return
    const timer = setTimeout(clearResult, 5000)
    return () => clearTimeout(timer)
  }, [lastResult, clearResult])

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
  }

  const typeName = (job?.type ?? lastResult?.type) === 'cardnews' ? '카드뉴스' : '블로그'

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      {job && (
        <>
          <div className="h-0.5 w-full bg-muted overflow-hidden absolute bottom-0 left-0">
            <div
              className="h-full bg-foreground transition-all duration-300"
              style={{ width: `${Math.round((job.current / job.total) * 100)}%` }}
            />
          </div>
          <div className="absolute bottom-1.5 right-6 text-[10px] text-muted-foreground">
            {typeName} 생성 중 {job.current}/{job.total}
            {job.failed > 0 && ` · 실패 ${job.failed}개`}
          </div>
        </>
      )}
      {!job && lastResult && (
        <div className="absolute bottom-1.5 right-6 text-[10px] text-muted-foreground">
          {typeName} 생성 완료 — {lastResult.succeeded}개 성공
          {lastResult.failed > 0 && (
            <span className="text-destructive"> · {lastResult.failed}개 실패{lastResult.errors[0] ? `: ${lastResult.errors[0]}` : ''}</span>
          )}
        </div>
      )}
      <div className="flex h-14 items-center px-6 gap-8">
        <span className="font-bold text-sm tracking-tight text-foreground">바이너스 빌더</span>
        <nav className="flex items-center gap-2">
          {navLinks.map(link => {
            const active = pathname.startsWith(link.prefix)
            return (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={active ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'text-sm font-medium transition-none',
                    !active && 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {link.label}
                </Button>
              </Link>
            )
          })}
        </nav>
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground transition-none"
          >
            로그아웃
          </Button>
        </div>
      </div>
    </header>
  )
}
