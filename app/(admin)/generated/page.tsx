import { supabaseServer } from '@/lib/supabase/server'
import { GeneratedPageClient } from './client'

export default async function GeneratedPage() {
  const { data: contents } = await supabaseServer
    .from('generated_contents')
    .select('*, content_type:content_types(name)')
    .order('created_at', { ascending: false })
    .limit(100)

  return <GeneratedPageClient contents={contents ?? []} />
}
