'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
      <nav className="flex gap-1 border-b pb-0">
        {tabs.map(tab => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3 py-2 text-sm border-b-2 -mb-px ${
                active
                  ? 'border-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
      <div>{children}</div>
    </div>
  )
}
