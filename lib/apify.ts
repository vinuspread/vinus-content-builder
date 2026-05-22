import 'server-only'
import { supabaseServer } from '@/lib/supabase/server'

const APIFY_BASE_URL = 'https://api.apify.com/v2'
const INSTAGRAM_SCRAPER_ACTOR = 'apify~instagram-scraper'

type ApifyInstagramPost = {
  id: string
  url: string
  shortCode: string
  caption: string | null
  likesCount: number
  commentsCount: number
  videoViewCount: number | null
  timestamp: string
  displayUrl: string | null
  ownerUsername: string
  ownerFullName: string | null
  hashtags: string[]
  mentions: string[]
}

async function runApifyActor(input: Record<string, unknown>): Promise<ApifyInstagramPost[]> {
  const token = process.env.APIFY_API_TOKEN
  if (!token) throw new Error('APIFY_API_TOKEN not set')

  const runRes = await fetch(`${APIFY_BASE_URL}/acts/${INSTAGRAM_SCRAPER_ACTOR}/runs?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!runRes.ok) throw new Error(`Apify run failed: ${runRes.status}`)
  const runData = await runRes.json()
  const runId: string = runData.data.id
  const datasetId: string = runData.data.defaultDatasetId

  let succeeded = false
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 10000))
    const statusRes = await fetch(`${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`)
    const statusData = await statusRes.json()
    const status: string = statusData.data.status
    console.log(`[apify] run ${runId} status: ${status} (attempt ${i + 1})`)
    if (status === 'SUCCEEDED') { succeeded = true; break }
    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Apify run ${status}`)
    }
  }
  if (!succeeded) throw new Error('Apify run timed out (polling limit reached)')

  const itemsRes = await fetch(`${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${token}&limit=200`)
  if (!itemsRes.ok) throw new Error(`Apify dataset fetch failed: ${itemsRes.status}`)
  return itemsRes.json()
}

async function getFilters(): Promise<{ minLikes: number; minFollowers: number; adKeywords: string[] }> {
  const { data } = await supabaseServer.from('collection_filters').select('*')
  const map: Record<string, string> = {}
  for (const f of data ?? []) map[f.filter_key] = f.filter_value
  return {
    minLikes: parseInt(map['min_likes'] ?? '500'),
    minFollowers: parseInt(map['min_followers'] ?? '1000'),
    adKeywords: (map['ad_keywords'] ?? '광고,협찬,할인,이벤트').split(',').map(k => k.trim()),
  }
}

function isNoise(post: ApifyInstagramPost, filters: { minLikes: number; adKeywords: string[] }): boolean {
  if (post.likesCount < filters.minLikes) return true
  const text = (post.caption ?? '').toLowerCase()
  if (filters.adKeywords.some(k => text.includes(k))) return true
  return false
}

export async function collectInstagramWhitelist(handles: string[], limit = 20): Promise<ApifyInstagramPost[]> {
  const filters = await getFilters()
  const posts = await runApifyActor({
    usernames: handles.map(h => h.replace('@', '')),
    resultsLimit: limit,
    addParentData: false,
  })
  return posts.filter(p => !isNoise(p, filters))
}

export async function collectInstagramHashtags(hashtags: string[], limit = 10): Promise<ApifyInstagramPost[]> {
  const filters = await getFilters()
  const posts = await runApifyActor({
    hashtags: hashtags.map(h => h.replace('#', '')),
    resultsLimit: limit,
    addParentData: false,
  })
  return posts.filter(p => !isNoise(p, filters))
}

export function normalizeInstagramPost(post: ApifyInstagramPost) {
  return {
    source_type: 'instagram' as const,
    source_name: post.ownerUsername,
    original_url: post.url,
    title: null,
    caption: post.caption,
    thumbnail_url: post.displayUrl,
    like_count: post.likesCount,
    comment_count: post.commentsCount,
    share_count: 0,
    view_count: post.videoViewCount ?? 0,
    published_at: post.timestamp,
    keywords: [...(post.hashtags ?? []), ...(post.mentions ?? [])],
    raw_data: post as unknown as Record<string, unknown>,
  }
}
