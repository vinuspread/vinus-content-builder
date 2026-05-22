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

  // 카드뉴스 생성에 사용된 항목 ID 조회 (보존 대상)
  const { data: generatedIds } = await supabaseServer
    .from('generated_contents')
    .select('source_content_id')
    .not('source_content_id', 'is', null)
  const usedIds = (generatedIds ?? []).map(r => r.source_content_id as string)

  // 미사용 수집 콘텐츠 전체 삭제
  if (usedIds.length > 0) {
    await supabaseServer.from('collected_contents').delete().not('id', 'in', `(${usedIds.join(',')})`)
  } else {
    await supabaseServer.from('collected_contents').delete().not('id', 'is', null)
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
