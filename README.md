# WeP-Stock Frontend

전국 보건기관 의료물품 통합 재고관리 웹서비스 **WeP-Stock** 의 프론트엔드 — Next.js App Router 기반 역할별(중앙/기관) 2-뷰 대시보드입니다.

## 소개

[DGU-TeamLex/backend](https://github.com/DGU-TeamLex/backend) 의 REST API 를 소비해, 전국 보건소·보건지소·보건진료소의 의료물품 재고 상태를 한 화면에서 보여줍니다.

핵심 질문 3가지 — **무엇이 언제 부족해지는가 · 지금 재고는 어떤 상태인가 · 얼마를 언제 발주해야 하는가** — 를 전면에 두고 화면을 구성했으며, 로그인한 사용자의 역할(`CENTRAL` / `INSTITUTION`)에 따라 내비게이션과 접근 가능한 페이지가 달라집니다.

실데이터 기반 화면과 아직 목업인 화면은 `MockBanner` 컴포넌트로 화면 안에서 명시적으로 구분합니다.

## ✨ 주요 기능

### 역할 기반 화면 분기 (RBAC)

| 역할 | 랜딩 | 내비게이션 |
|---|---|---|
| `CENTRAL` (중앙관리자) | `/` | 예측 · 재고·발주 · 데이터 (+ 관리자 콘솔) |
| `INSTITUTION` (기관 담당자) | `/my` | 내 기관 재고 · 알림 |

`RequireRole` 컴포넌트가 페이지를 감싸 미로그인 시 `/login`, 권한 밖 접근 시 역할별 홈으로 리다이렉트합니다.

### 페이지

| 경로 | 화면 | 접근 | 소비 API |
|---|---|---|---|
| `/` | **재고 공급 부족 예상** — 예측 수요율(직전 3개월 실적)로 소진 시점을 추정하고 리드타임과 비교해 발주 시급도를 판정. 비의료품·휴면 품목은 제외 | CENTRAL | `/inventory-policy`, `/dashboard/central` |
| `/inventory` | **재고·발주** — SS/ROP·상태·발주권고 표. 기관·품목 컬럼 필터와 임계값 필터 제공 | 로그인 | `/inventory-policy` |
| `/data` | **데이터** — 가명처리 XLSX 업로드 → 검증 → 적재 배치 이력, 표준화 검수 큐, 외부지표 | CENTRAL | `/imports`, `/standardization/queue`, `/external-indicators` |
| `/my` | **내 기관 재고** — 소속 기관의 재고·알림 현황 | INSTITUTION | `/dashboard/institution/{id}` |
| `/alerts` | **알림** — 재고미달·공급위험·유효기간임박 알림 목록 | 로그인 | `/alerts` |
| `/admin` | **관리자 콘솔** — 계정 조회·생성·역할 변경 | CENTRAL | `/users` (GET·POST·PATCH) |
| `/supply-risk` | **공급위험 조기경보(모듈 C)** — 품목군 위험 점수/레벨·근거 | CENTRAL | `/supply-risk` |
| `/login` | 로그인 | 공개 | `POST /auth/login` |

### 인증

- 로그인 성공 시 백엔드가 발급한 JWT 를 `localStorage`(`wep-stock-auth` 키)에 저장하고, 새로고침 시 세션을 복원합니다.
- 모든 API 호출은 `Authorization: Bearer <token>` 헤더를 자동으로 붙입니다.
- `api.ts` 는 React 트리 바깥에서도 호출되므로 Context 대신 `getStoredToken()` 헬퍼로 `localStorage` 를 직접 읽습니다.
- 쓰기 요청 실패 시 백엔드의 `detail` 메시지를 그대로 노출해 원인을 즉시 확인할 수 있게 했습니다.

### 재고 소진 예상 곡선 (`DepletionChart`)

차트 라이브러리 없이 **직접 구현한 SVG 차트**입니다. 단일 시리즈라 범례 대신 제목이 시리즈를 지칭하고, 기준선은 전부 직접 라벨링합니다.

- 투영선 — 브랜드 액센트(teal), 유일한 데이터 시리즈
- ROP — warn 색 파선(발주 시점 트리거)
- SS — 선이 아닌 **위험 구역 음영**. ROP 와 색이 인접해 구분에 실패하므로 마크 종류 자체를 분리
- 리드타임 — 중립 수직 파선(상태색이 아닌 주석)

### 디자인 시스템

`app/components/ui.tsx` 에 `Card` · `Kpi` · `Stat` · `DistBar` · `Tabs` · `RiskBadge` · `StatusBadge` · `EmptyState` · `MockBanner` · `Skeleton*`(로딩 스켈레톤) 등 공용 컴포넌트를 모아 화면 간 일관성을 유지합니다. `app/lib/format.ts` 는 위험도·상태·알림유형·기관유형 라벨과 색 클래스 매핑을 한곳에서 관리합니다.

## 🛠 기술 스택

| 영역 | 사용 기술 |
|---|---|
| **Framework** | Next.js 14 (App Router), React 18 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 3, PostCSS, Autoprefixer |
| **Font** | `next/font/google` — Gowun Batang(제목, 한국어 세리프) · IBM Plex Sans KR(본문/UI) |
| **State** | React Context (`AuthProvider`) + `localStorage` |
| **Chart** | 자체 구현 SVG (외부 차트 라이브러리 미사용) |
| **Deploy** | Vercel |

의존성은 `next` · `react` · `react-dom` 뿐입니다 — UI/차트/상태관리 라이브러리를 추가하지 않고 직접 구성했습니다.

### 컬러 토큰 (`tailwind.config.ts`)

`paper` `surface` `ink`(+muted/faint) `line` `accent`(+dark/soft) 와 상태색 `ok` `caution` `warn` `crit`(각각 soft 변형 포함)을 Tailwind theme 에 정의해 상태 표현을 통일했습니다.

## 🏗 아키텍처

```
app/
├── layout.tsx                 폰트 변수 주입 · AuthProvider · Nav 를 감싸는 루트 레이아웃
├── page.tsx                   / (예측 — 재고 공급 부족 예상)
├── inventory|data|my|alerts|admin|supply-risk|login/page.tsx
├── components/
│   ├── Nav.tsx                역할별 메뉴 · 로그인 상태 · 모바일 하단 탭
│   ├── RequireRole.tsx        로그인/역할 가드 (미충족 시 리다이렉트)
│   ├── DepletionChart.tsx     재고 소진 예상 SVG 차트
│   └── ui.tsx                 공용 UI 컴포넌트 모음
└── lib/
    ├── api.ts                 API_BASE · getJSON / sendJSON / useApi 훅
    ├── auth-context.tsx       AuthProvider · useAuth · getStoredToken · roleHome
    └── format.ts              라벨·색 클래스 매핑, 숫자 포맷
        │
        ▼  fetch(`${NEXT_PUBLIC_API_URL}${path}`, Bearer JWT, cache: "no-store")
   DGU-TeamLex/backend  (FastAPI on Vercel)
```

### 레거시 경로 리다이렉트

리디자인으로 통합·삭제된 경로는 `next.config.mjs` 에서 영구 리다이렉트(308)합니다.

```
/central  → /
/items    → /inventory
/imports  → /data
```

## 🚀 시작하기

### 1. 설치

```bash
npm install
```

### 2. 환경변수

| 변수 | 필수 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | | 백엔드 API 베이스 URL. **미설정 시 `http://localhost:8000/api/v1` 로 폴백**하므로 로컬 개발에서는 생략 가능 |

프로덕션 값은 `.env.production` 에 커밋되어 있습니다.

```bash
# .env.local (로컬에서 다른 백엔드를 바라볼 때)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### 3. 실행

```bash
npm run dev     # 개발 서버 (http://localhost:3000)
npm run build   # 프로덕션 빌드
npm run start   # 빌드 결과 서빙
npm run lint    # ESLint
```

백엔드를 함께 띄우려면 [DGU-TeamLex/backend](https://github.com/DGU-TeamLex/backend) 에서 `uvicorn api.index:app --reload` 를 실행하세요. 로그인 계정은 백엔드의 `scripts/seed_users.py` 로 생성합니다.

## 📁 구조

```
.
├── app/
│   ├── layout.tsx             # 루트 레이아웃 (폰트 · AuthProvider · Nav)
│   ├── globals.css            # Tailwind 엔트리 · 전역 스타일
│   ├── page.tsx               # / 예측
│   ├── inventory/page.tsx     # 재고·발주
│   ├── data/page.tsx          # 데이터 인테이크 (CENTRAL)
│   ├── my/page.tsx            # 내 기관 재고 (INSTITUTION)
│   ├── alerts/page.tsx        # 알림
│   ├── admin/page.tsx         # 관리자 콘솔 (CENTRAL)
│   ├── supply-risk/page.tsx   # 공급위험 조기경보 (CENTRAL)
│   ├── login/page.tsx         # 로그인
│   ├── components/            # Nav · RequireRole · DepletionChart · ui
│   └── lib/                   # api · auth-context · format
├── tailwind.config.ts         # 컬러 토큰 · 폰트 변수 · shadow
├── next.config.mjs            # 레거시 경로 리다이렉트
├── .env.production            # 배포용 API URL
└── package.json
```

## 👤 기여도 & 개발 환경

| 항목 | 내용 |
|---|---|
| **기여 비율** | **100%** (단독 개발) |
| **커밋** | 26 / 26 (본인 / 전체 사람 커밋) |
| **참여 인원** | 1명 |
| **AI 코딩 도구** | Claude Code |

<sub>기여 비율은 커밋 author 이메일 기준 집계이며 봇·자동화 커밋은 제외했습니다.</sub>
