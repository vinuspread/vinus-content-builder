# 바이너스 콘텐츠 빌더 — 디자인 시스템

## 디자인 수정 구조

| 무엇을 바꾸고 싶을 때 | 어디를 수정하면 되는지 |
|---|---|
| 색상, 폰트, 라운드 등 전체 토큰 | `app/globals.css` `:root` 블록 |
| 버튼 스타일 | `components/ui/button.tsx` |
| 카드, 인풋, 배지 등 컴포넌트 | `components/ui/*.tsx` |
| 네비게이션 레이아웃 | `components/admin-nav.tsx` |
| 특정 페이지 레이아웃 | `app/(admin)/[페이지]/client.tsx` |

---

## 폰트

**Pretendard Variable** — CDN으로 로드 (`app/layout.tsx` `<head>`)

```css
--font-sans: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
```

폰트 교체: `app/globals.css`의 `--font-sans` 값만 바꾸면 전체 적용.

---

## 색상 토큰 (`app/globals.css`)

oklch 색공간 기반. 아래 변수를 수정하면 전체 색상이 바뀜.

```css
:root {
  --background       /* 페이지 배경 */
  --foreground       /* 기본 텍스트 */
  --primary          /* 주요 버튼 배경 */
  --primary-foreground  /* 주요 버튼 텍스트 */
  --secondary        /* 보조 배경 (Badge, 탭 활성 등) */
  --muted            /* 흐린 배경 */
  --muted-foreground /* 보조 텍스트 */
  --border           /* 테두리 */
  --input            /* 인풋 테두리 */
  --ring             /* 포커스 링 */
  --destructive      /* 삭제·오류 색상 */
  --radius           /* 전체 border-radius 기준값 */
}
```

---

## 컴포넌트 목록 (`components/ui/`)

| 파일 | 컴포넌트 | 주요 variant |
|---|---|---|
| `button.tsx` | `Button` | `default` `outline` `secondary` `ghost` `destructive` `link` |
| `badge.tsx` | `Badge` | `default` `secondary` `outline` `destructive` `ghost` |
| `card.tsx` | `Card` `CardHeader` `CardTitle` `CardDescription` `CardContent` `CardFooter` | `size="default"` `size="sm"` |
| `input.tsx` | `Input` | — |
| `textarea.tsx` | `Textarea` | — |
| `label.tsx` | `Label` | — |
| `select.tsx` | `Select` | — |
| `switch.tsx` | `Switch` | — |
| `tabs.tsx` | `Tabs` `TabsList` `TabsTrigger` `TabsContent` | `variant="default"` `variant="line"` |
| `dialog.tsx` | `Dialog` 등 | — |

모두 [base-ui](https://base-ui.com) 기반. Tailwind 유틸리티 클래스로 스타일링.

---

## 페이지별 파일 구조

```
app/
├── layout.tsx                        # 루트 레이아웃 (폰트 CDN, metadata)
├── login/page.tsx                    # 로그인 페이지
└── (admin)/
    ├── layout.tsx                    # AdminNav 포함 어드민 레이아웃
    ├── collected/
    │   ├── page.tsx                  # 서버: DB 조회
    │   └── client.tsx                # 클라이언트: 수집·분류·생성 액션
    ├── generated/
    │   ├── page.tsx                  # 제작 콘텐츠 목록
    │   └── [id]/
    │       ├── page.tsx              # 서버: 상세 조회
    │       └── client.tsx            # 클라이언트: 피드백 재생성, 업로드 체크
    └── settings/
        ├── layout.tsx                # 설정 서브탭 네비게이션
        ├── content-types/client.tsx  # 콘텐츠 유형 비율 설정
        ├── whitelist/client.tsx      # Instagram 계정 (국내/해외 탭)
        ├── hashtags/client.tsx       # 해시태그 (한국어/영어 탭)
        ├── rss/client.tsx            # RSS 소스 (카테고리 탭)
        └── filters/client.tsx        # 수집 필터 값 설정

components/
├── admin-nav.tsx                     # 상단 네비게이션 바
└── ui/                               # 재사용 UI 컴포넌트 (위 목록 참고)
```

---

## UI 수정 시 참고 사항

- 모든 페이지는 `components/ui/` 컴포넌트를 사용. 날 HTML 태그(`<button>`, `<input>`)를 직접 쓰지 않음
- `cn()` 유틸리티(`lib/utils.ts`)로 조건부 클래스 병합
- 서버 컴포넌트(`page.tsx`)는 데이터 패칭만 담당, 인터랙션은 `client.tsx`에서 처리
- 디자인 토큰 변경 시 다크모드(`.dark` 블록)도 같이 수정 필요
