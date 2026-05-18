import 'server-only'

export async function tavilySearch(query: string): Promise<string> {
  const token = process.env.TAVILY_API_KEY
  if (!token) return ''

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: token,
      query,
      search_depth: 'basic',
      max_results: 5,
      include_answer: true,
    }),
  })

  if (!res.ok) return ''

  const data = await res.json()

  const parts: string[] = []
  if (data.answer) parts.push(`요약: ${data.answer}`)
  for (const r of data.results ?? []) {
    parts.push(`\n출처: ${r.url}\n${r.content ?? ''}`)
  }
  return parts.join('\n')
}
