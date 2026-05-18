# 직접 입력 카드뉴스 생성 기능 설계

## 개요

사용자가 주제와 내용을 직접 입력하면 Tavily 웹검색으로 관련 정보를 수집하고, Claude API를 통해 카드뉴스 원고를 생성하는 기능.

생성된 콘텐츠는 기존 카드뉴스목록에 함께 표시되며 '자체콘텐츠' 뱃지로 구분된다.

---

## 흐름

```
주제 + 내용 입력
→ Tavily 웹검색 (주제 기반)
→ 검색 결과 + 입력 내용 → Claude 전달
→ 카드뉴스 6장 생성
→ generated_contents 저장 (source_content_id = null)
→ 토스트 메시지 + 카드뉴스목록 새로고침
```

---

## UI 변경

### 카드뉴스목록 페이지 (`app/(admin)/generated/page.tsx`)

- 헤더에 `+ 직접 입력` 버튼 추가
- 클릭 시 인라인 폼 펼침 (토글)
- 폼 닫기: 취소 버튼 또는 생성 완료 시

**입력 폼**
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| 주제 | Input | ✅ | 카드뉴스 주제 |
| 내용 | Textarea | ❌ | 방향이나 핵심 포인트 (입력할수록 품질 향상) |

**상태**
- 생성 중: 버튼 "생성 중..." + disabled
- 완료: 토스트 "카드뉴스가 생성됐습니다." + 폼 닫힘 + 목록 새로고침

### 자체콘텐츠 뱃지

- 식별 기준: `source_content_id === null`
- 카드뉴스목록 리스트 아이템에 `자체콘텐츠` 뱃지 추가
- 상세 페이지 메타 영역에 동일 뱃지 추가

---

## 새 파일

### `lib/tavily.ts`

Tavily Search API 래퍼.

```ts
export async function tavilySearch(query: string): Promise<string>
```

- 환경변수 `TAVILY_API_KEY` 사용
- `search_depth: "basic"`, `max_results: 5`
- 검색 결과를 Claude에 넘기기 좋은 텍스트 형태로 반환
- 토큰이 없으면 빈 문자열 반환 (검색 없이 생성 가능하도록 graceful fallback)

### `lib/prompts/manual-generation.ts`

수동 입력용 user 프롬프트 빌더. 기존 `GENERATION_SYSTEM_PROMPT` 재사용.

```ts
export function buildManualGenerationUserPrompt(
  topic: string,
  content: string,
  searchResults: string
): string
```

프롬프트 구조:
```
주제: {topic}
보충 내용: {content || '없음'}
웹 검색 참고 자료:
{searchResults || '없음'}

위 정보를 바탕으로 바이너스 SNS 카드뉴스 원고를 작성하세요.
원본을 요약하지 말고, 바이너스 독자(중소기업·스타트업 실무자)에게 맞게 재해석하세요.
```

### `app/api/generate/manual/route.ts`

```
POST /api/generate/manual
Body: { topic: string, content?: string }
Response: { id: string }
```

처리 순서:
1. 인증 확인
2. `topic` 필수 검증
3. Tavily로 주제 웹검색
4. `buildManualGenerationUserPrompt` 호출
5. Claude API 호출 (`GENERATION_SYSTEM_PROMPT` + manual user prompt, max_tokens: 8192)
6. JSON 파싱 + carousel.length === 6 검증
7. `generated_contents` insert (`source_content_id: null`, `content_type_id: null`)
8. `{ id }` 반환

`maxDuration = 60`

---

## 수정 파일

### `app/(admin)/generated/page.tsx`

- 서버 컴포넌트 유지, 클라이언트 인터랙션은 새 `GeneratedPageClient` 컴포넌트로 분리
- `+ 직접 입력` 폼 + 토스트 로직 포함

### `app/(admin)/generated/[id]/client.tsx`

- `source_content_id === null` 이면 `자체콘텐츠` 뱃지 렌더링

---

## 환경변수

| 키 | 설명 |
|----|------|
| `TAVILY_API_KEY` | Tavily Search API 키 (없으면 검색 없이 생성) |

Vercel 환경변수에 추가 필요.

---

## 제약

- DB 스키마 변경 없음 (`source_content_id` 이미 nullable)
- 콘텐츠 유형은 생성 시 미선택, 이후 수동 변경 가능
- 자체콘텐츠는 수집콘텐츠 목록에 표시되지 않음
