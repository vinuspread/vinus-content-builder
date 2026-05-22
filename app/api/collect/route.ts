import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { collectRss } from '@/lib/rss'

export const maxDuration = 300

export async function POST() {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = { instagram: 0, rss: 0, skipped: 0, errors: [] as string[] }

  try {
    const rssItems = await collectRss(15)
    for (const item of rssItems) {
      const { error } = await supabaseServer
        .from('collected_contents')
        .upsert(item, { onConflict: 'original_url', ignoreDuplicates: true })
      if (!error) results.rss++
      else results.skipped++
    }
  } catch (e) {
    results.errors.push(`RSS: ${e instanceof Error ? e.message : String(e)}`)
  }

  return NextResponse.json(results)
}
