'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/settings/content-types', label: '콘텐츠 유형' },
  { href: '/settings/whitelist', label: 'Instagram 계정' },
  { href: '/settings/hashtags', label: '해시태그' },
  { href: '/settings/rss', label: 'RSS 소스' },
  { href: '/settings/filters', label: '수집 필터' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold mb-4">설정</h1>
        <nav className="flex gap-0 border-b">
          {tabs.map(tab => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors',
                  active
                    ? 'border-foreground font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div>{children}</div>
    </div>
  )
}
