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

  if (generatedContentIds.length > 0) {
    query = query.not('id', 'in', `(${generatedContentIds.join(',')})`)
  }

  if (params.source) query = query.eq('source_type', params.source)
  if (params.type) query = query.eq('content_type_id', params.type)

  const sortField = params.sort === 'published' ? 'published_at'
    : params.sort === 'likes' ? 'like_count'
    : 'collected_at'
  query = query.order(sortField, { ascending: false }).limit(100)

  const { data: contents } = await query

  return (
    <CollectedList
      contents={contents ?? []}
      contentTypes={contentTypes ?? []}
    />
  )
}
