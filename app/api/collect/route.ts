import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { collectInstagramWhitelist, collectInstagramHashtags, normalizeInstagramPost } from '@/lib/apify'
import { collectRss } from '@/lib/rss'

export const maxDuration = 300

export async function POST() {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = { instagram: 0, rss: 0, skipped: 0, errors: [] as string[], debug: {} as Record<string, unknown> }

  const { data: filters } = await supabaseServer.from('collection_filters').select('*')
  const filterMap: Record<string, string> = {}
  for (const f of filters ?? []) filterMap[f.filter_key] = f.filter_value
  const whitelistRatio = parseInt(filterMap['whitelist_ratio'] ?? '70')

  const { data: whitelist } = await supabaseServer
    .from('instagram_whitelist').select('handle').eq('is_active', true)
  const { data: hashtags } = await supabaseServer
    .from('instagram_hashtags').select('hashtag').eq('is_active', true)

  const whitelistHandles = (whitelist ?? []).map(w => w.handle)
  const hashtagList = (hashtags ?? []).map(h => h.hashtag)

  results.debug = {
    whitelistCount: whitelistHandles.length,
    hashtagCount: hashtagList.length,
    whitelistRatio,
  }

  const totalInstagram = 30
  const whitelistCount = Math.round(totalInstagram * whitelistRatio / 100)
  const hashtagCount = totalInstagram - whitelistCount

  try {
    if (whitelistHandles.length > 0) {
      const posts = await collectInstagramWhitelist(whitelistHandles, whitelistCount)
      for (const post of posts) {
        const normalized = normalizeInstagramPost(post)
        const { error } = await supabaseServer
          .from('collected_contents')
          .upsert(normalized, { onConflict: 'original_url', ignoreDuplicates: true })
        if (!error) results.instagram++
        else results.skipped++
      }
    }
    if (hashtagList.length > 0) {
      const posts = await collectInstagramHashtags(hashtagList, hashtagCount)
      for (const post of posts) {
        const normalized = normalizeInstagramPost(post)
        const { error } = await supabaseServer
          .from('collected_contents')
          .upsert(normalized, { onConflict: 'original_url', ignoreDuplicates: true })
        if (!error) results.instagram++
        else results.skipped++
      }
    }
  } catch (e) {
    results.errors.push(`Instagram: ${e instanceof Error ? e.message : String(e)}`)
  }

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
