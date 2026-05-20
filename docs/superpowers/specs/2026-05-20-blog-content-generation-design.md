# 블로그 콘텐츠 생성 기능 설계

## 개요

카드뉴스(generated_contents)를 원본으로 블로그 아티클을 생성하는 기능. Claude가 카드 6장의 구조화된 내용을 plain text 블로그 글(1500~3000자)로 변환한다. 생성된 블로그 글은 별도 모듈로 관리하며, 사용자가 회사 웹사이트 CMS에 복사-붙여넣기로 발행한다.

**핵심 워크플로우:**
카드뉴스 상세 → "블로그 생성" 버튼 → `/blog/[id]` 상세 → 전체 복사 → CMS 붙여넣기

---

## 데이터 모델

### 새 테이블: `blog_contents`

```sql
CREATE TABLE blog_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_content_id UUID NOT NULL UNIQUE REFERENCES generated_contents(id) ON DELETE CASCADE,
  blog_title TEXT NOT NULL,
  blog_content TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_blog_contents_updated_at
  BEFORE UPDATE ON blog_contents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

- `generated_content_id`에 UNIQUE 제약 — 카드뉴스 1개당 블로그 1개. 재생성은 INSERT가 아닌 UPDATE (UPSERT)로 처리
- CASCADE DELETE: 카드뉴스 삭제 시 블로그도 함께 삭제

---

## 파일 구조

| 파일 | 역할 |
|------|------|
| `supabase/migrations/20260520_blog_contents.sql` | 테이블 생성 마이그레이션 |
| `app/(admin)/blog/page.tsx` | 블로그 목록 서버 컴포넌트 |
| `app/(admin)/blog/client.tsx` | 블로그 목록 클라이언트 컴포넌트 |
| `app/(admin)/blog/[id]/page.tsx` | 블로그 상세 서버 컴포넌트 |
| `app/(admin)/blog/[id]/client.tsx` | 블로그 상세 클라이언트 컴포넌트 |
| `app/api/blog/generate/route.ts` | 카드뉴스 → 블로그 생성 API |
| `app/api/blog/feedback/route.ts` | 피드백 재생성 API |
| `app/api/blog/[id]/route.ts` | PATCH (발행 상태), DELETE |
| `lib/prompts/blog-generation.ts` | 블로그 생성 시스템 프롬프트 + 유저 프롬프트 |
| `components/admin-nav.tsx` | "블로그" 메뉴 추가 |
| `app/(admin)/generated/[id]/client.tsx` | "블로그 생성" 버튼 추가 |
| `types/index.ts` | `BlogContent` 타입 추가 |

---

## API 설계

### `POST /api/blog/generate`

**Request:** `{ generatedContentId: string }`

**처리:**
1. `generated_contents` 조회 (carousel_content, 전체 필드)
2. Claude Sonnet 4.6 호출 (blog-generation 프롬프트)
3. `blog_contents` UPSERT (`ON CONFLICT (generated_content_id) DO UPDATE`) — 재생성 시 기존 행 덮어씀
4. `{ id: string }` 반환 → 클라이언트가 `/blog/[id]`로 이동

**설정:** `maxDuration = 120`, `max_tokens = 4000`

### `POST /api/blog/feedback`

**Request:** `{ blogContentId: string, feedback: string }`

**처리:**
1. `blog_contents` 조회 (blog_title, blog_content)
2. Claude Sonnet 4.6 호출 (기존 블로그 + 피드백)
3. `blog_contents` UPDATE (blog_title, blog_content)
4. `{ ok: true }` 반환

**설정:** `maxDuration = 120`, `max_tokens = 4000`

### `PATCH /api/blog/[id]`

**Request:** `{ is_published: boolean }`

**처리:** `blog_contents` UPDATE → `{ ok: true }`

### `DELETE /api/blog/[id]`

**처리:** `blog_contents` DELETE → `{ ok: true }`

---

## 프롬프트 설계

### 시스템 프롬프트 (`BLOG_GENERATION_SYSTEM_PROMPT`)

- 역할: 바이너스프레드 블로그 필진. 중소기업·스타트업 실무자를 위한 디자인/브랜딩 아티클 작성
- 톤: 카드뉴스보다 차분하고 설명적. 전문성 있되 어렵지 않게
- 금지 표현: 카드뉴스와 동일 (브랜드 가치를 높입니다, 고객 경험 향상 등)
- 구조: 도입부 → 본문 섹션 → 마무리 (마크다운 없음, 줄바꿈으로만 구분)
- 길이: 내용 깊이에 따라 1500~3000자 자율 조정
- 출력 형식: JSON `{ "blogTitle": string, "blogContent": string }`

### 유저 프롬프트 구성

카드뉴스의 아래 정보를 Claude에 전달:
- `contentTitle`, `coreMessage`
- 각 카드: `number`, `role`, `headline`, `body`, `expertView`, `practical`, `characterMent`
- `instagramCaption`, `hashtags`

---

## 블로그 본문 구조

Claude가 plain text로 생성하는 구조:

```
[도입부] 약 200자
카드뉴스 후킹 카드 기반. 독자 공감 → 문제 제기.

[본문 섹션 3~5개] 약 1800자
각 섹션은 카드 1~2장을 확장.
expertView, practical 내용을 본문에 자연스럽게 녹임.
섹션 구분은 빈 줄로만.

[마무리] 약 200자
카드뉴스 결론 카드 기반. 실무자 관점의 핵심 정리.
```

---

## UI 설계

### 블로그 목록 (`/blog`)

```
블로그목록

브랜드 컬러를 잘못 쓰는 이유     브랜딩   05.19  ✓
여름 시즌 컬러 팔레트 가이드      미분류   05.20
```

- 행 기반 (`divide-y divide-border/40`)
- 컬럼: 제목(flex-1) / 유형(w-14, 원본 카드뉴스의 content_type) / 날짜(w-10) / 발행 ✓
- 행 클릭 → `/blog/[id]`

### 블로그 상세 (`/blog/[id]`)

2컬럼 레이아웃 (카드뉴스 상세와 동일한 패턴):

- **좌측 (flex-1):** 블로그 제목 + 본문 전문 (whitespace-pre-line)
- **우측 (w-64, sticky):**
  - 원본 카드뉴스 링크 `→ 카드뉴스 보기 ↗`
  - 발행 완료 체크박스 + 저장 버튼
  - 피드백 재생성 (Textarea + 재생성 버튼 + 진행 바)

- 상단 바: `← 목록` / `전체 복사` / `삭제`

### 카드뉴스 상세 우측 패널 변경

기존 패널 하단에 블로그 섹션 추가:

```
─────────────────
블로그
[블로그 생성]          ← 미생성 상태
```

생성 완료 후:
```
─────────────────
블로그
→ 블로그 보기 ↗        ← 링크로 변경
```

생성 중:
```
[블로그 생성 중... 12초]
[████████░░░░░░░░] 진행 바
```

### AdminNav 변경

```tsx
{ href: '/blog', label: '블로그목록', prefix: '/blog' }
```
수집콘텐츠 / 카드뉴스목록 / **블로그목록** / 설정

---

## 타입 정의

```typescript
export type BlogContent = {
  id: string
  generated_content_id: string
  blog_title: string
  blog_content: string
  is_published: boolean
  created_at: string
  updated_at: string
  generated_content?: GeneratedContent | null
}
```

---

## 에러 처리

- Claude 응답에 JSON 없음 → 500, 로그 출력
- JSON 파싱 실패 → 500, 로그 출력
- `generated_content_id` 없음 → 404
- 생성 중 네트워크 오류 → 클라이언트에 실제 에러 메시지 표시
- 피드백 재생성도 동일한 에러 처리 패턴

---

## 제외 항목 (YAGNI)

- 블로그 목록 필터/정렬 (추후 필요시 추가)
- CMS 직접 발행 API 연동
- 블로그 SEO 메타데이터 별도 관리
- 블로그 버전 히스토리
