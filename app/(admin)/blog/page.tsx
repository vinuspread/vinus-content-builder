import { supabaseServer } from '@/lib/supabase/server'
import { BlogListClient } from './client'

export const dynamic = 'force-dynamic'

export default async function BlogPage() {
  const { data: blogs } = await supabaseServer
    .from('blog_contents')
    .select('*, generated_content:generated_contents(content_title, content_type:content_types(name))')
    .order('created_at', { ascending: false })
    .limit(100)

  return <BlogListClient blogs={blogs ?? []} />
}
