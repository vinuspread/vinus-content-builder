import { supabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
import { WhitelistClient } from './client'

export default async function WhitelistPage() {
  const { data } = await supabaseServer
    .from('instagram_whitelist').select('*').order('created_at')
  return <WhitelistClient initialItems={data ?? []} />
}
