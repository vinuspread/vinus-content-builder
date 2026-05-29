import 'server-only'
import Parser from 'rss-parser'
import { supabaseServer } from '@/lib/supabase/server'

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'VinusContentBuilder/1.0' },
})

type RssItem = {
  title?: string
  link?: string
  contentSnippet?: string
  isoDate?: string
  pubDate?: string
}

async function getAdKeywords(): Promise<string[]> {
  const { data } = await supabaseServer
    .from('collection_filters')
    .select('filter_value')
    .eq('filter_key', 'ad_keywords')
    .single()
  if (!data?.filter_value) return ['광고', '협찬', '할인', '이벤트']
  return data.filter_value.split(',').map((k: string) => k.trim()).filter(Boolean)
}

function containsAdKeyword(text: string, adKeywords: string[]): boolean {
  const lower = text.toLowerCase()
  return adKeywords.some(k => lower.includes(k.toLowerCase()))
}

export async function collectRss(limitPerFeed = 10) {
  const [sourcesResult, adKeywords] = await Promise.all([
    supabaseServer.from('rss_sources').select('*').eq('is_active', true),
    getAdKeywords(),
  ])

  const results: Array<{
    source_type: 'rss'
    source_name: string
    original_url: string
    title: string | null
    caption: string | null
    thumbnail_url: null
    like_count: 0
    comment_count: 0
    share_count: 0
    view_count: 0
    published_at: string | null
    keywords: string[]
    raw_data: Record<string, unknown>
  }> = []

  for (const source of sourcesResult.data ?? []) {
    try {
      const feed = await parser.parseURL(source.url)
      const items = (feed.items as RssItem[]).slice(0, limitPerFeed)
      for (const item of items) {
        if (!item.link) continue
        const text = `${item.title ?? ''} ${item.contentSnippet ?? ''}`
        if (containsAdKeyword(text, adKeywords)) continue
        results.push({
          source_type: 'rss',
          source_name: source.name,
          original_url: item.link,
          title: item.title ?? null,
          caption: item.contentSnippet ?? null,
          thumbnail_url: null,
          like_count: 0,
          comment_count: 0,
          share_count: 0,
          view_count: 0,
          published_at: item.isoDate ?? item.pubDate ?? null,
          keywords: extractKeywords(item.title ?? '', item.contentSnippet ?? ''),
          raw_data: item as unknown as Record<string, unknown>,
        })
      }
    } catch (err) {
      console.error(`RSS parse error for ${source.url}:`, err)
    }
  }
  return results
}

function extractKeywords(title: string, content: string): string[] {
  const text = `${title} ${content}`.toLowerCase()
  const candidates = [
    'ui', 'ux', 'design', 'web', 'mobile', 'brand', 'font', 'color', 'layout',
    'motion', 'animation', 'figma', 'ai', 'typography', 'logo', 'ux디자인',
    'ui디자인', '웹디자인', '브랜딩', '폰트', '컬러', '레이아웃', '모션',
  ]
  return candidates.filter(k => text.includes(k))
}
