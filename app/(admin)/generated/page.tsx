import { supabaseServer } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function GeneratedPage() {
  const { data: contents } = await supabaseServer
    .from('generated_contents')
    .select('*, content_type:content_types(name)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-4">
      <h1 className="text-sm font-semibold">제작콘텐츠</h1>
      <div className="space-y-2">
        {(contents ?? []).map(content => (
          <Link
            key={content.id}
            href={`/generated/${content.id}`}
            className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                {(content.content_type as { name: string } | null)?.name ?? '미분류'}
              </span>
              {content.is_published && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  업로드 완료
                </span>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(content.created_at).toLocaleDateString('ko-KR')}
              </span>
            </div>
            <p className="text-sm font-medium">{content.content_title ?? '(제목 없음)'}</p>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{content.core_message}</p>
          </Link>
        ))}
        {(contents ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground py-12 text-center">
            아직 제작된 콘텐츠가 없습니다.
          </p>
        )}
      </div>
    </div>
  )
}
