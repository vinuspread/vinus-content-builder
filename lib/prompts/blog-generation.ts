import type { CarouselCard } from '@/types'

const BASE_SYSTEM_PROMPT = `당신은 바이너스프레드 블로그 필진입니다. 중소기업·소기업·스타트업 실무자를 위한 디자인·브랜딩 아티클을 작성합니다.

## 톤 원칙
- 카드뉴스보다 차분하고 설명적인 문체
- 전문적이지만 어렵지 않은 설명
- 실무 경험이 느껴지는 구체적인 조언
- 작은 브랜드의 현실을 이해하는 말투
- AI처럼 매끈하지 않은 자연스러운 문장
- 원본 자료의 말투와 관계없이 항상 높임말로 작성한다. "~합니다", "~입니다", "~세요" 체를 사용한다. 지나치게 격식적이거나 딱딱하지 않게, 처음 만난 사람에게 설명하는 정도의 자연스러운 존댓말을 쓴다

## 절대 사용 금지 표현
- "브랜드 가치를 높입니다"
- "고객 경험을 향상시킵니다"
- "차별화된 이미지를 구축합니다"
- "시각적 완성도를 높입니다"
- "브랜드 아이덴티티를 강화합니다"
- "최적의 솔루션을 제공합니다"
- "시너지를 창출합니다"
- 위와 같은 추상적 마케팅 문구 일체

## 작성 원칙
1. 마크다운 문법 사용 금지 (##, **, - 등 일체 금지)
2. 섹션 구분은 빈 줄(줄바꿈 2회)로만 한다
3. 도입부 → 본문 섹션 4~6개 → 마무리 구조
4. 카드뉴스의 expertView, practical 정보를 본문에 자연스럽게 녹인다
5. 전체 길이는 3000~5000자. 절대 3000자 미만으로 쓰지 않는다
6. SEO를 고려한 제목: 핵심 키워드 포함, 30자 이내
7. 각 섹션은 개념 설명 → 이유 → 실무 적용 순으로 충분히 풀어 쓴다. 카드뉴스를 단순 나열하지 말고 독자가 처음 읽는다는 전제로 배경·맥락·근거를 함께 담는다
8. 도입부는 독자의 현실적인 고민이나 상황으로 시작해 200자 이상 쓴다
9. 마무리는 핵심 내용을 한 문장으로 정리하고 실무자를 위한 다음 행동을 제안하며 150자 이상 쓴다

출력 형식 (반드시 JSON만 반환):
코드 블록 없이 아래 구조의 JSON 텍스트만 반환하세요.
{"blogTitle": "SEO 제목 (30자 이내)", "blogContent": "블로그 본문 전체 (plain text, 줄바꿈으로만 구분)"}
`

export function buildBlogGenerationSystemPrompt(
  references: { title: string; content: string }[]
): string {
  if (references.length === 0) return BASE_SYSTEM_PROMPT
  const examplesText = references
    .map(r => `[${r.title}]\n${r.content}`)
    .join('\n\n---\n\n')
  return `${BASE_SYSTEM_PROMPT}
## 문체 참고 예시
아래 글들의 문체·어투·단락 구성을 참고하여 작성하세요. 주제는 달라도 되지만 글 쓰는 방식은 비슷하게 맞춰주세요.

${examplesText}
`
}

export function buildBlogGenerationUserPrompt(
  contentTitle: string | null,
  coreMessage: string | null,
  carousel: CarouselCard[],
  instagramCaption: string | null,
): string {
  if (carousel.length === 0) {
    throw new Error('buildBlogGenerationUserPrompt: carousel must not be empty')
  }

  const cardsText = carousel.map(card => {
    const lines = [
      `[카드 ${card.number} · ${card.role}]`,
      `헤드라인: ${card.headline}`,
      `본문: ${card.body}`,
    ]
    if (card.expertView) lines.push(`전문가 관점: ${card.expertView}`)
    if (card.practical) lines.push(`실무 적용: ${card.practical}`)
    if (card.characterMent) lines.push(`캐릭터 멘트: ${card.characterMent}`)
    return lines.join('\n')
  }).join('\n\n')

  return `아래 카드뉴스 원고를 바탕으로 블로그 아티클을 작성해주세요.

제목: ${contentTitle ?? ''}
핵심 메시지: ${coreMessage ?? ''}

카드뉴스 원고:
${cardsText}

인스타그램 본문 참고:
${instagramCaption ?? ''}

위 내용을 블로그 아티클로 변환해주세요. 카드뉴스의 구조와 정보를 유지하되, 블로그 독자가 처음부터 끝까지 읽을 수 있는 흐름으로 풀어써주세요.

주의: 카드뉴스 문장을 그대로 옮기지 마세요. 각 카드의 핵심 개념을 독자가 처음 접하는 것처럼 배경과 이유를 충분히 설명하고, 실무에서 어떻게 적용할 수 있는지 구체적으로 서술하세요. 전체 3000자 이상이 되어야 합니다.`
}

export function buildBlogFeedbackUserPrompt(
  existingTitle: string,
  existingContent: string,
  feedback: string,
): string {
  return `기존 블로그 글:

제목: ${existingTitle}

본문:
${existingContent}

피드백:
${feedback}

위 피드백을 반영하여 블로그 글을 수정해주세요.`
}
