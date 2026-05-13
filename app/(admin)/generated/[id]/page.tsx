import { supabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { GeneratedDetailClient } from './client'

export default async function GeneratedDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data: content } = await supabaseServer
    .from('generated_contents')
    .select('*, content_type:content_types(name), source_content:collected_contents(title, original_url)')
    .eq('id', id)
    .single()
  if (!content) notFound()
  return <GeneratedDetailClient content={content} />
}
