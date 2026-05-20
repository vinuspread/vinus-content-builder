'use client'

import Link from 'next/link'
import type { BlogContent } from '@/types'
import { cn } from '@/lib/utils'

export function BlogListClient({ blogs }: { blogs: BlogContent[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">블로그목록</h1>
      </div>

      <div className="divide-y divide-border/40">
        {blogs.map(blog => {
          const p = (n: number) => String(n).padStart(2, '0')
          const d = new Date(blog.created_at)
          const dateLabel = isNaN(d.getTime())
            ? '?'
            : `${p(d.getMonth() + 1)}.${p(d.getDate())}`
          const typeName = (blog.generated_content as { content_type: { name: string } | null } | null)
            ?.content_type?.name ?? '미분류'

          return (
            <Link
              key={blog.id}
              href={`/blog/${blog.id}`}
              className="flex items-center gap-3 py-2.5 hover:bg-muted/30 -mx-2 px-2 rounded transition-colors"
            >
              <span className={cn('flex-1 text-sm truncate', blog.is_published && 'text-muted-foreground')}>
                {blog.blog_title}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground w-14 text-right">
                {typeName}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground w-10 text-right">
                {dateLabel}
              </span>
              {blog.is_published && (
                <span className="shrink-0 text-xs text-muted-foreground">✓</span>
              )}
            </Link>
          )
        })}
        {blogs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">아직 작성된 블로그 글이 없습니다</p>
            <p className="text-xs text-muted-foreground mt-1">카드뉴스 상세에서 블로그를 생성하세요</p>
          </div>
        )}
      </div>
    </div>
  )
}
