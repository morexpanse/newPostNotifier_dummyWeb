/**
 * Cachi Test Dummy Server
 * - 의존성 없는(Zero-dependency) Node.js 내장 http 모듈 기반 서버
 * - 정적 웹 서빙(GitHub Pages와 100% 동일한 구조) + 실시간 새 글 주입 API(/api/posts) 지원
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.xml': 'application/xml; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

// 동적 새 글 저장소 (메모리)
const dynamicPosts = [];

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(reqUrl.pathname);

  // 1. CORS 헤더 허용 (모바일 앱 및 원격 cachi server 테스트 용이성)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 2. REST API: 동적 새 글 주입
  if (pathname === '/api/posts' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const accessType = data.accessType || data.access_type || (data.category === 'webtoon' && (data.badgeClass === 'badge-pay' || data.title?.includes('유료')) ? 'paid' : 'free');
        const useType = data.useType || (accessType === 'paid' ? 'EARLY_ACCESS' : accessType === 'wait_free' ? 'WAIT_FREE' : 'FREE');
        const newPost = {
          id: data.id || `custom-${Date.now()}`,
          category: data.category || 'webtoon',
          title: data.title || `[실시간 테스트 글] ${new Date().toLocaleTimeString('ko-KR')}`,
          url: data.url || '/posts/webtoon-151.html',
          badge: data.badge || (accessType === 'paid' ? '선공개' : '무료 공개'),
          accessType: accessType,
          access_type: accessType,
          useType: useType,
          isFree: data.isFree !== undefined ? data.isFree : (accessType === 'free'),
          is_free: data.is_free !== undefined ? data.is_free : (accessType === 'free'),
          charge: data.charge !== undefined ? data.charge : (accessType !== 'free'),
          waitfree_blocked: data.waitfree_blocked !== undefined ? data.waitfree_blocked : (accessType === 'paid'),
          published_at: new Date().toISOString()
        };
        dynamicPosts.unshift(newPost);
        res.writeHead(201, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({ success: true, message: '새 글이 성공적으로 등록되었습니다.', post: newPost, total: dynamicPosts.length }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // REST API: 초기화
  if (pathname === '/api/reset' && req.method === 'POST') {
    dynamicPosts.length = 0;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
    res.end(JSON.stringify({ success: true, message: '모든 동적 새 글이 초기화되었습니다.' }));
    return;
  }

  // REST API: 서버 상태
  if (pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
    res.end(JSON.stringify({
      server: 'Cachi Dummy Server',
      status: 'online',
      port: PORT,
      dynamic_posts_count: dynamicPosts.length,
      dynamic_posts: dynamicPosts
    }));
    return;
  }

  // 3. 정적 파일 서빙
  // 디렉토리 경로 정규화 (예: /boards/webtoon/ -> /boards/webtoon/index.html)
  if (pathname.endsWith('/')) {
    pathname += 'index.html';
  } else if (!path.extname(pathname)) {
    // 확장자가 없는 경우 index.html 확인
    const possibleIndex = path.join(BASE_DIR, pathname, 'index.html');
    if (fs.existsSync(possibleIndex)) {
      pathname = path.join(pathname, 'index.html');
    }
  }

  const filePath = path.join(BASE_DIR, pathname);

  // 보안: 디렉토리 탐색(path traversal) 방지
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>404 Not Found</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>404 Not Found</h2>
          <p>요청하신 페이지(<code>${pathname}</code>)를 찾을 수 없습니다.</p>
          <a href="/">홈으로 가기</a>
        </body>
        </html>
      `);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`  Cachi Dummy Web Server running on port ${PORT}`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  - 웹툰: http://localhost:${PORT}/boards/webtoon/`);
  console.log(`  - 채용: http://localhost:${PORT}/boards/career/`);
  console.log(`  - 기술: http://localhost:${PORT}/boards/tech/`);
  console.log(`  - RSS:  http://localhost:${PORT}/feeds/rss.xml`);
  console.log(`  - API:  http://localhost:${PORT}/feeds/posts.json`);
  console.log(`=================================================`);
});

module.exports = server;
