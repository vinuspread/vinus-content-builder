import { supabaseServer } from '@/lib/supabase/server'
import { RssClient } from './client'

export const dynamic = 'force-dynamic'

export default async function RssPage() {
  const { data } = await supabaseServer
    .from('rss_sources').select('*').order('created_at')
  return <RssClient initialSources={data ?? []} />
}
