import { supabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
import { FiltersClient } from './client'

export default async function FiltersPage() {
  const { data } = await supabaseServer.from('collection_filters').select('*')
  return <FiltersClient initialFilters={data ?? []} />
}
