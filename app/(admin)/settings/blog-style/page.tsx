import { supabaseServer } from '@/lib/supabase/server'
import { BlogStyleClient } from './client'

export const dynamic = 'force-dynamic'

export default async function BlogStylePage() {
  const { data: refs } = await supabaseServer
    .from('blog_style_references')
    .select('*')
    .order('created_at', { ascending: true })
  return <BlogStyleClient initialRefs={refs ?? []} />
}
