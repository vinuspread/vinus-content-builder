'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/settings/content-types', label: '콘텐츠 유형' },
  { href: '/settings/whitelist', label: 'Instagram 계정' },
  { href: '/settings/hashtags', label: '해시태그' },
  { href: '/settings/rss', label: 'RSS 소스' },
  { href: '/settings/filters', label: '수집 필터' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="flex gap-8">
      <nav className="w-40 shrink-0 space-y-0.5 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">설정</p>
        {navItems.map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block px-3 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
