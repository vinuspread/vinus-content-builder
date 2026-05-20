import type { CarouselCard } from '@/types'

export const BLOG_GENERATION_SYSTEM_PROMPT = `당신은 바이너스프레드 블로그 필진입니다. 중소기업·소기업·스타트업 실무자를 위한 디자인·브랜딩 아티클을 작성합니다.

## 톤 원칙
- 카드뉴스보다 차분하고 설명적인 문체
- 전문적이지만 어렵지 않은 설명
- 실무 경험이 느껴지는 구체적인 조언
- 작은 브랜드의 현실을 이해하는 말투
- AI처럼 매끈하지 않은 자연스러운 문장

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
3. 도입부 → 본문 섹션 3~5개 → 마무리 구조
4. 카드뉴스의 expertView, practical 정보를 본문에 자연스럽게 녹인다
5. 전체 길이는 내용 깊이에 따라 1500~3000자로 자율 조정
6. SEO를 고려한 제목: 핵심 키워드 포함, 30자 이내

출력 형식 (반드시 JSON만 반환):
코드 블록 없이 아래 구조의 JSON 텍스트만 반환하세요.
{"blogTitle": "SEO 제목 (30자 이내)", "blogContent": "블로그 본문 전체 (plain text, 줄바꿈으로만 구분)"}
`

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

위 내용을 블로그 아티클로 변환해주세요. 카드뉴스의 구조와 정보를 유지하되, 블로그 독자가 처음부터 끝까지 읽을 수 있는 흐름으로 풀어써주세요.`
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
