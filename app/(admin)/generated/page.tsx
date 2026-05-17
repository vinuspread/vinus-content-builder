import { supabaseServer } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export default async function GeneratedPage() {
  const { data: contents } = await supabaseServer
    .from('generated_contents')
    .select('*, content_type:content_types(name)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold">카드뉴스목록</h1>
      <div className="space-y-2">
        {(contents ?? []).map(content => (
          <Link
            key={content.id}
            href={`/generated/${content.id}`}
            className="flex items-start gap-4 rounded-xl border bg-card p-4 ring-1 ring-foreground/5 hover:bg-muted/40 transition-colors"
          >
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">
                  {(content.content_type as { name: string } | null)?.name ?? '미분류'}
                </Badge>
                {content.is_published && (
                  <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                    업로드 완료
                  </Badge>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(content.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>
              <p className="text-sm font-medium leading-snug">{content.content_title ?? '(제목 없음)'}</p>
              <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">{content.core_message}</p>
            </div>
          </Link>
        ))}
        {(contents ?? []).length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm font-medium text-muted-foreground">아직 제작된 콘텐츠가 없습니다</p>
            <p className="text-xs text-muted-foreground mt-1">수집콘텐츠에서 카드뉴스 생성을 눌러보세요</p>
          </div>
        )}
      </div>
    </div>
  )
}
