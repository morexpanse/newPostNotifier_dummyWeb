# StoryLab (스토리랩) - cachi 알림 테스트 & 홍보용 더미 웹사이트

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
4. **크롤러 친화적 시뮬레이션 환경 (정적 & 동적 하이브리드)**:
   - **GitHub Pages 정적 배포 호환**: 빌드 없이 정적 호스팅 가능하며, 새 글이 HTML 소스에 실제 반영된 `new-post.html` 프리셋 제공.
   - **로컬 실시간 서버(`server.js`)**: 의존성 없는 내장 HTTP 서버로 구동되어 REST API(`POST /api/posts`)를 통해 실시간 새 글 주입 가능.
5. **Cachi 전용 데모 툴바 탑재**:
   - 상단 고정 툴바로 "📋 게시판 URL 복사", "⚡ 새 글 발생 시뮬레이션", "🔄 원복" 버튼 제공.

---

## 📂 서브 주소 및 추천 크롤러 셀렉터 가이드

| 게시판명 | 서브 URL | 레이아웃 형태 | 추천 크롤러 셀렉터 (Title / Link) |
| :--- | :--- | :--- | :--- |
| **메인 포털** | `/` (`index.html`) | 통합 피드 & 허브 | `ul.board-list li a.post-title` |
| **웹툰·연재** | `/boards/webtoon/` | 리스트 (`ul > li`) | `.post-item .post-title`, `li[data-post-id] a` |
| **채용·공고** | `/boards/career/` | 테이블 (`table > tr > td`) | `.board-table tbody tr td.col-title a` |
| **기술·공지** | `/boards/tech/` | 카드 (`section > article`) | `article.card-article .card-title a` |
| **RSS 피드** | `/feeds/rss.xml` | XML RSS 2.0 | `//item/title`, `//item/link` |
| **JSON API** | `/feeds/posts.json` | JSON REST API | `$.items[*].title`, `$.items[*].url` |

---

## ⚡ 새 글 알림 감지 테스트 시나리오

### 방법 1: GitHub Pages 및 정적 호스팅 환경에서 테스트
1. cachi app의 **[+ 새 알림 추가]**에 기본 게시판 주소를 등록합니다. (예: `.../boards/webtoon/`)
2. cachi server가 최초 수집을 완료하여 초기 상태(150화까지)를 저장합니다.
3. 웹 브라우저에서 상단 툴바의 **[⚡ 새 글 발생 시뮬레이션]**을 누르거나, cachi app/server의 대상 URL을 `.../boards/webtoon/new-post.html`로 전환합니다.
4. cachi server가 151화를 감지하고 스마트폰 cachi app으로 푸시 알림이 발송됩니다.
5. 푸시 알림을 누르면 `/posts/webtoon-151.html` 상세 페이지로 이동하며 테스트가 성공합니다.

### 방법 2: 로컬 동적 서버(`server.js`)를 통한 실시간 테스트
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

1. 모바일 뷰(반응형) 폭 390px ~ 430px (iPhone / Galaxy 기본 뷰포트)에 맞춰져 있어 화면 녹화 시 실제 웹툰/취업 플랫폼과 동일한 느낌을 줍니다.
2. 메인 페이지의 "📋 URL 복사" 버튼을 누르면 "URL 복사 완료" 토스트가 떠서 데모 영상 촬영 시 복사 제스처가 명확히 표현됩니다.
3. 새 글 알림을 클릭했을 때 나타나는 상세 글 상단에 연한 녹색의 **"🎉 cachi 알림 테스트 성공!"** 배너가 표시되어 성공적인 앱 동작을 시각적으로 어필할 수 있습니다.
