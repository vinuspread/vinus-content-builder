import { supabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BlogDetailClient } from './client'

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data: blog } = await supabaseServer
    .from('blog_contents')
    .select('*, generated_content:generated_contents(id, content_title, content_type:content_types(name))')
    .eq('id', id)
    .single()
  if (!blog) notFound()
  return <BlogDetailClient blog={blog} />
}
