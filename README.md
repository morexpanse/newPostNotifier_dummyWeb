# 까치 더미 웹 (Cachi Dummy Web) - cachi 알림 테스트 & 홍보용 더미 웹사이트

본 프로젝트는 **cachi app** (새 글 알림 모바일 애플리케이션)과 **cachi server** (크롤링 및 새 글 감지 백엔드 서버)의 기능 검증, 통합 테스트, 데모 영상 및 스크린샷 홍보를 위한 공식 더미 웹사이트입니다.

---

## 🌟 주요 특징 및 개선 사항

1. **독립된 서브 주소(Sub-path) 구조**:
   - 기존의 단일 페이지(`index.html`) 방식에서 탈피하여, 게시판별 고유 URL을 제공합니다.
   - 사용자가 cachi app에서 특정 게시판(웹툰, 채용, 기술 등)만 개별 등록하여 수집을 모니터링할 수 있습니다.
2. **다양한 크롤링 마크업 패턴 완비**:
   - **웹툰·연재**: `<ul>` / `<li>` 표준 리스트형 (회차, 뱃지, 별점)
   - **채용·공고**: `<table>` / `<tr>` / `<td>` 공공기관·대학교 스타일 테이블형
   - **기술·공지**: `<section>` / `<article>` 카드형 블로그 구조
3. **실제 상세 글(Post Detail) 페이지 및 딥링크**:
   - 각 글마다 `/posts/*.html` 본문 페이지를 제공하여, cachi app에서 푸시 알림 클릭 시 인앱 브라우저로 실제 본문이 정상 열람되는 엔드투엔드 UX를 검증할 수 있습니다.
4. **크롤러 친화적 환경 (정적 & 동적 하이브리드)**:
   - **GitHub Pages 정적 배포 호환**: 빌드 없이 정적 호스팅 가능하며, 웹툰 게시판은 JSON API(`episodes.json`) CSR을 지원.
   - **로컬 실시간 서버(`server.js`)**: 의존성 없는 내장 HTTP 서버로 구동되어 REST API(`POST /api/posts`)를 통해 실시간 새 글 주입 가능.
5. **Cachi 전용 데모 도우미 탑재**:
   - 상단 도우미 바로 "📋 게시판 URL 복사" 및 클립보드 간편 등록 지원.

---

## 📂 서브 주소 및 추천 크롤러 셀렉터 가이드

| 게시판명 | 서브 URL | 레이아웃 형태 | 추천 크롤러 셀렉터 (Title / Link) |
| :--- | :--- | :--- | :--- |
| **메인 포털** | `/` (`index.html`) | 통합 피드 & 허브 | `ul.board-list li a.post-title` |
| **웹툰·연재** | `/boards/webtoon/` | CSR 동적 리스트 (`episodes.json`) | `json_api` 자동 탐색 또는 `.post-item .post-title` |
| **웹툰 API** | `/boards/webtoon/episodes.json` | JSON REST API (회차 전용) | `$.episodes[*].title`, `$.episodes[*].url` |
| **채용·공고** | `/boards/career/` | 테이블 (`table > tr > td`) | `.board-table tbody tr td.col-title a` |
| **채용 RSS** | `/boards/career/rss.xml` | XML RSS 2.0 (채용 전용) | `//item/title`, `//item/link` |
| **기술·공지** | `/boards/tech/` | 카드 (`section > article`) | `article.card-article .card-title a` |
| **기술 RSS** | `/boards/tech/rss.xml` | XML RSS 2.0 (기술 전용) | `//item/title`, `//item/link` |
| **전체 통합 RSS** | `/feeds/rss.xml` | XML RSS 2.0 (전체 피드) | `//item/title`, `//item/link` |
| **전체 JSON API** | `/feeds/posts.json` | JSON REST API | `$.items[*].title`, `$.items[*].url` |

### 🔒 웹툰 동적 탐색(`json_api`) 및 유·무료(`determineAccessType`) 호환 가이드
웹툰 게시판(`/boards/webtoon/`)은 RSS/XML 링크가 일절 존재하지 않으며, 초기 HTML에는 회차 링크가 비어 있어 크롤러가 `json_api` 데이터 소스(`/boards/webtoon/episodes.json`)를 자동으로 탐색하도록 설계되었습니다.

`episodes.json` 내부에는 카카오 웹툰/카카오페이지 규격에 맞춘 메타데이터가 완벽하게 제공됩니다:
- **`id`**: `ID_CANDIDATE_FIELDS` 매칭용 (`"webtoon-152"`)
- **`no`**: `meta.sequence` 추출용 숫자 회차 (`152`, `150`, `149` 등)
- **`title`**: `TITLE_CANDIDATE_FIELDS` 매칭용
- **`accessType`**: `"paid"` (선공개/유료) | `"wait_free"` (기다무) | `"free"` (무료 공개)
- **`freeAt`**: 유료 회차 무료 전환 예정 시각 (`"2026-11-17T22:00:00+09:00"`)
- **`publishedAt`**: ISO 8601 발행 시각

---

## ⚡ 알림 감지 테스트 방법

### 로컬 동적 서버(`server.js`)를 통한 실시간 테스트
```bash
# 로컬 서버 구동 (기본 포트: 3000, Node.js 기본 내장 모듈 사용 - npm install 불필요)
npm start
# 또는
node server.js
```

1. cachi app 또는 cachi server의 수집 URL로 `http://localhost:3000/boards/webtoon/` (또는 로컬 IP / ngrok 주소) 등록.
2. 실시간 새 글 추가 API 호출:
   ```bash
   curl -X POST http://localhost:3000/api/posts \
        -H "Content-Type: application/json" \
        -d '{"category": "webtoon", "title": "달빛 아뜰리에 151화 [실시간 등록]", "url": "/posts/webtoon-151.html"}'
   ```
3. cachi server가 다음 크롤링 주기에서 새 글을 즉시 감지하여 푸시 알림 발송.
4. 테스트 후 초기 상태로 리셋:
   ```bash
   curl -X POST http://localhost:3000/api/reset
   ```

---

## 🧪 자동화 검증 테스트 실행

프로젝트의 모든 파일 경로, 크롤러 HTML 파싱 정합성, 정적 분기, 서버 API 응답을 한 번에 검증합니다:

```bash
npm test
# 또는
node test/verify.js
```

---

## 📱 앱스토어 스크린샷 및 프로모션 영상 촬영 팁

### 1. 모바일 브라우저 주소창(`newPostNotifier_dummyWeb`) 노출 최소화 팁
- **GitHub 저장소 이름 변경 (가장 깔끔한 방법)**:
  - GitHub 레포지토리 Settings에서 Repository name을 `cachi-dummy` 등으로 변경하면, 주소창에 `morexpanse.github.io/cachi-dummy/boards/webtoon/`처럼 간결하게 표시됩니다.
- **모바일 스크롤 주소창 축소 연출**:
  - 모바일 사파리/크롬 브라우저에서 페이지를 아래로 살짝 1~2cm 스크롤하면 상단 주소창이 자동으로 최소화(숨김)됩니다. 이 상태에서 [공유하기 ➔ 까치]를 실행하면 주소창 텍스트가 거의 보이지 않아 몰입감이 극대화됩니다.

### 2. 페이지별 독립 브랜딩 & 메타데이터
- **웹툰·연재**: `<title>까치 웹툰 (Cachi Webtoon)</title>`, `og:title="까치 웹툰 (Cachi Webtoon)"`
- **채용·공고**: `<title>까치 채용 (Cachi Career)</title>`, `og:title="까치 채용 (Cachi Career)"`
- **기술·공지**: `<title>까치 테크 (Cachi Tech)</title>`, `og:title="까치 테크 (Cachi Tech)"`
- 까치 앱에서 [공유하기 ➔ 까치] 시 다른 상용 브랜드와 혼동되지 않고 까치 전용 더미 사이트로 직관적으로 등록 및 테스트할 수 있습니다.

### 3. 모든 게시글의 100% 고유 URL 완비 (Unique URLs)
- 모든 게시글 `<a>` 태그에 고유한 상세 주소(`/posts/webtoon-*.html`, `/posts/career-*.html`, `/posts/tech-*.html`)가 부여되어 있습니다.
- 실제 클릭 시에도 404 에러 없이 깔끔한 본문이 열려 크롤러 중복 방지 및 사용자 UX 테스트를 완벽히 지원합니다.

### 4. 클린 시연 모드 (새 글 시뮬레이션/툴바 숨김)
- 기본 상태에서는 테스트용 상단 툴바와 가이드 배너가 화면에 전혀 노출되지 않는 **순수 서비스 웹사이트 모드**로 동작합니다.
- 디버깅용 툴바가 필요한 경우에만 URL 뒤에 `?demo=1`을 붙여 접속하시면 상단 보조 툴바가 활성화됩니다.
