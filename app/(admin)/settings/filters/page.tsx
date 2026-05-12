import { supabaseServer } from '@/lib/supabase/server'
import { FiltersClient } from './client'

export default async function FiltersPage() {
  const { data } = await supabaseServer.from('collection_filters').select('*')
  return <FiltersClient initialFilters={data ?? []} />
}
