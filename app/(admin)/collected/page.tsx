import { supabaseServer } from '@/lib/supabase/server'
import { CollectedList } from './client'

export default async function CollectedPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; type?: string; sort?: string }>
}) {
  const params = await searchParams

  const { data: contentTypes } = await supabaseServer
    .from('content_types')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order')

  const { data: generatedIds } = await supabaseServer
    .from('generated_contents')
    .select('source_content_id')
    .not('source_content_id', 'is', null)

  const generatedContentIds = (generatedIds ?? []).map(r => r.source_content_id as string)

  let query = supabaseServer
    .from('collected_contents')
    .select('*, content_type:content_types(id, name)')
    .limit(100)

  if (params.source) query = query.eq('source_type', params.source)
  if (params.type) query = query.eq('content_type_id', params.type)

  const sortField = params.sort === 'collected' ? 'collected_at'
    : params.sort === 'published' ? 'published_at'
    : 'like_count'
  query = query.order(sortField, { ascending: false })

  const { data: contents } = await query

  return (
    <CollectedList
      contents={contents ?? []}
      contentTypes={contentTypes ?? []}
      generatedContentIds={generatedContentIds}
    />
  )
}
