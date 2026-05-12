export const contentTypes = [
  {
    id: 1,
    name: '실무 디자인 인사이트',
    keywords: [
      '컬러',
      '폰트',
      '레이아웃',
      '여백',
      '정보 우선순위',
      '시선 흐름',
      '강조',
      '이미지 사용',
      '브랜드 디자인',
      'UI',
      'UX',
      'typography',
      'color',
      'layout',
      'spacing',
      'grid',
      'visual hierarchy',
    ],
  },
  {
    id: 2,
    name: '웹사이트 경험과 모션',
    keywords: [
      '웹사이트',
      '모션',
      '인터랙션',
      'CTA',
      '스크롤',
      '마이크로 인터랙션',
      '애니메이션',
      '전환',
      'web design',
      'motion',
      'interaction',
      'animation',
      'scroll',
      'transition',
    ],
  },
  {
    id: 3,
    name: 'AI 비주얼 트렌드와 활용',
    keywords: [
      'AI',
      '인공지능',
      'Midjourney',
      'Stable Diffusion',
      'DALL-E',
      'Sora',
      '생성형',
      'generative',
      'AI image',
      'AI video',
      'AI design',
      'Figma AI',
    ],
  },
  {
    id: 4,
    name: '디자인 의뢰 전 가이드',
    keywords: [
      '의뢰',
      '외주',
      '브리핑',
      '견적',
      '제안서',
      '로고 제작',
      '홈페이지 제작',
      '브랜딩 의뢰',
      'brief',
      'client',
      'design brief',
      'freelance',
    ],
  },
  {
    id: 5,
    name: '바이너스 관점과 작업 해설',
    keywords: [
      '바이너스',
      'vinus',
      '포트폴리오',
      '작업 해설',
      '디자인 철학',
      '케이스 스터디',
      'case study',
      'portfolio',
    ],
  },
];

export function buildClassificationPrompt(
  caption: string,
  keywords: string[],
  sourceName: string
): string {
  const typeList = contentTypes
    .map(
      (t) =>
        `ID ${t.id}: ${t.name}\n  키워드 예시: ${t.keywords.slice(0, 6).join(', ')}`
    )
    .join('\n\n');

  return `당신은 바이너스프레드 SNS 콘텐츠 분류 시스템입니다. 아래 콘텐츠를 5개 유형 중 하나로 분류하세요.

콘텐츠 유형:
${typeList}

분류할 콘텐츠:
- 출처: ${sourceName}
- 핵심 키워드: ${keywords.join(', ')}
- 내용 요약: ${caption.slice(0, 500)}

규칙:
- 반드시 ID 번호 하나만 응답하세요 (1, 2, 3, 4, 5 중 하나)
- 가장 가까운 유형을 선택하세요
- 다른 텍스트는 절대 포함하지 마세요`;
}
