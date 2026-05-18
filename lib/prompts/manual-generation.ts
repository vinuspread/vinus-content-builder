export function buildManualGenerationUserPrompt(
  topic: string,
  content: string,
  searchResults: string
): string {
  return `다음 정보를 바탕으로 바이너스 SNS 카드뉴스 원고를 작성해주세요.

주제: ${topic}
보충 내용: ${content.trim() || '없음'}
웹 검색 참고 자료:
${searchResults.trim() || '없음'}

위 정보를 바탕으로, 바이너스의 톤과 기준에 맞게 독자적인 카드뉴스 원고를 작성하세요.
검색 결과를 그대로 요약하지 말고, 바이너스 독자(중소기업·스타트업 실무자)에게 맞게 재해석하세요.`
}
