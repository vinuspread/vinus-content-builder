import { supabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
import { ContentTypesClient } from './client'

export default async function ContentTypesPage() {
  const { data: types } = await supabaseServer
    .from('content_types')
    .select('*')
    .order('sort_order')
  return <ContentTypesClient initialTypes={types ?? []} />
}
