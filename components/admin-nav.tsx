'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/collected', label: '수집콘텐츠', prefix: '/collected' },
  { href: '/generated', label: '제작콘텐츠', prefix: '/generated' },
  { href: '/settings/content-types', label: '설정', prefix: '/settings' },
]

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-6 gap-6">
        <span className="font-semibold text-sm tracking-tight">바이너스 빌더</span>
        <nav className="flex items-center gap-1">
          {navLinks.map(link => {
            const active = pathname.startsWith(link.prefix)
            return (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={active ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn('text-sm', !active && 'text-muted-foreground')}
                >
                  {link.label}
                </Button>
              </Link>
            )
          })}
        </nav>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
            로그아웃
          </Button>
        </div>
      </div>
    </header>
  )
}
