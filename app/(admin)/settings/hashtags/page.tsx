import { supabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
import { HashtagsClient } from './client'

export default async function HashtagsPage() {
  const { data } = await supabaseServer
    .from('instagram_hashtags').select('*').order('created_at')
  return <HashtagsClient initialItems={data ?? []} />
}
