'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const navItems = [
  { href: '/collected', label: '수집콘텐츠' },
  { href: '/generated', label: '제작콘텐츠' },
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
    <nav className="flex items-center gap-6 px-6 py-3 border-b text-sm">
      <span className="font-semibold mr-2">바이너스 빌더</span>
      {navItems.map(item => {
        const active = item.prefix
          ? pathname.startsWith(item.prefix)
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? 'font-medium' : 'text-muted-foreground hover:text-foreground'}
          >
            {item.label}
          </Link>
        )
      })}
      <button
        onClick={handleLogout}
        className="ml-auto text-muted-foreground hover:text-foreground text-sm"
      >
        로그아웃
      </button>
    </nav>
  )
}
