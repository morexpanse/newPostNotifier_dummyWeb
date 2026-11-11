/**
 * Automated Verification Script for StoryLab Cachi Dummy Web
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const BASE_DIR = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log('🧪 Starting Verification Tests for StoryLab Dummy Web...\n');

  // Test 1: File Existence Checks
  console.log('📁 1. Verifying Required Files and Directory Structure...');
  const expectedFiles = [
    'index.html',
    'boards/webtoon/index.html',
    'boards/webtoon/new-post.html',
    'boards/career/index.html',
    'boards/career/new-post.html',
    'boards/tech/index.html',
    'boards/tech/new-post.html',
    'posts/webtoon-150.html',
    'posts/webtoon-151.html',
    'posts/career-201.html',
    'posts/career-202.html',
    'posts/tech-301.html',
    'posts/tech-302.html',
    'feeds/rss.xml',
    'feeds/posts.json',
    'assets/css/style.css',
    'assets/js/main.js',
    'assets/js/demo-toolbar.js',
    'server.js',
    'package.json'
  ];

  for (const file of expectedFiles) {
    const fullPath = path.join(BASE_DIR, file);
    assert(fs.existsSync(fullPath), `File exists: ${file}`);
  }

  // Test 2: Crawler Simulation on Static HTML
  console.log('\n🕷️ 2. Verifying Crawler HTML Parsing (Static Isolation)...');
  
  // Webtoon Default vs New
  const webtoonDefault = fs.readFileSync(path.join(BASE_DIR, 'boards/webtoon/index.html'), 'utf8');
  const webtoonNew = fs.readFileSync(path.join(BASE_DIR, 'boards/webtoon/new-post.html'), 'utf8');
  assert(webtoonDefault.includes('달빛 아뜰리에 - 제 150화'), 'Webtoon default includes 150화');
  assert(!webtoonDefault.includes('달빛 아뜰리에 - 제 151화'), 'Webtoon default does NOT include 151화 (No false positives for crawlers!)');
  assert(webtoonNew.includes('달빛 아뜰리에 - 제 151화'), 'Webtoon new-post includes 151화');
  assert(webtoonNew.includes('data-post-id="151"'), 'Webtoon new-post has data-post-id="151" attribute');

  // Career Default vs New
  const careerDefault = fs.readFileSync(path.join(BASE_DIR, 'boards/career/index.html'), 'utf8');
  const careerNew = fs.readFileSync(path.join(BASE_DIR, 'boards/career/new-post.html'), 'utf8');
  assert(careerDefault.includes('table class="board-table"'), 'Career board uses semantic <table> markup');
  assert(careerDefault.includes('104'), 'Career default includes notice 104');
  assert(!careerDefault.includes('105'), 'Career default does NOT include notice 105');
  assert(careerNew.includes('105'), 'Career new-post includes notice 105');
  assert(careerNew.includes('data-post-id="career-105"'), 'Career new-post has data-post-id="career-105"');

  // Tech Default vs New
  const techDefault = fs.readFileSync(path.join(BASE_DIR, 'boards/tech/index.html'), 'utf8');
  const techNew = fs.readFileSync(path.join(BASE_DIR, 'boards/tech/new-post.html'), 'utf8');
  assert(techDefault.includes('card-article'), 'Tech board uses card-article structure');
  assert(techDefault.includes('v2.4.0 릴리즈 노트'), 'Tech default includes release note 301');
  assert(!techDefault.includes('OAuth 2.1 토큰 갱신 프로토콜 변경'), 'Tech default does NOT include notice 302');
  assert(techNew.includes('OAuth 2.1 토큰 갱신 프로토콜 변경'), 'Tech new-post includes notice 302');
  assert(techNew.includes('data-post-id="tech-302"'), 'Tech new-post has data-post-id="tech-302"');

  // Feeds Validation
  console.log('\n📡 3. Verifying Feeds & Metadata...');
  const rssContent = fs.readFileSync(path.join(BASE_DIR, 'feeds/rss.xml'), 'utf8');
  assert(rssContent.includes('<rss version="2.0"'), 'RSS feed is valid XML RSS 2.0');
  assert(rssContent.includes('<item>'), 'RSS feed contains items');

  const jsonContent = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'feeds/posts.json'), 'utf8'));
  assert(Array.isArray(jsonContent.items) && jsonContent.items.length > 0, 'JSON feed contains valid items array');
  assert(jsonContent.items[0].id === 'webtoon-151', 'JSON feed has recent post webtoon-151');

  // Test 3: Local Server Verification
  console.log('\n🚀 4. Verifying Server HTTP Responses...');
  const server = require('../server.js');
  const TEST_PORT = 3456;
  
  await new Promise((resolve) => {
    // re-listen or use existing
    server.close(() => {
      server.listen(TEST_PORT, resolve);
    });
  });

  const fetchUrl = (urlPath, options = {}) => {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path: urlPath,
        method: options.method || 'GET',
        headers: options.headers || {}
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve({ statusCode: res.statusCode, data, headers: res.headers }));
      });
      req.on('error', reject);
      if (options.body) req.write(options.body);
      req.end();
    });
  };

  try {
    const resHome = await fetchUrl('/');
    assert(resHome.statusCode === 200, 'GET / returns 200 OK');
    assert(resHome.data.includes('스토리랩 더미 포털'), 'GET / contains portal content');

    const resWebtoon = await fetchUrl('/boards/webtoon/');
    assert(resWebtoon.statusCode === 200, 'GET /boards/webtoon/ returns 200 OK');

    const resCareer = await fetchUrl('/boards/career/');
    assert(resCareer.statusCode === 200, 'GET /boards/career/ returns 200 OK');

    const resTech = await fetchUrl('/boards/tech/');
    assert(resTech.statusCode === 200, 'GET /boards/tech/ returns 200 OK');

    const resDetail = await fetchUrl('/posts/webtoon-151.html');
    assert(resDetail.statusCode === 200, 'GET /posts/webtoon-151.html returns 200 OK');

    const resStatus = await fetchUrl('/api/status');
    assert(resStatus.statusCode === 200, 'GET /api/status returns 200 OK');

    const resAddPost = await fetchUrl('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'webtoon', title: '자동화 테스트 새 글', url: '/posts/webtoon-151.html' })
    });
    assert(resAddPost.statusCode === 201, 'POST /api/posts adds post and returns 201 Created');

    const resStatusAfter = await fetchUrl('/api/status');
    const statusJson = JSON.parse(resStatusAfter.data);
    assert(statusJson.dynamic_posts_count === 1, 'API status reflects new post count 1');

    const resReset = await fetchUrl('/api/reset', { method: 'POST' });
    assert(resReset.statusCode === 200, 'POST /api/reset returns 200 OK');
  } finally {
    server.close();
  }

  console.log(`\n========================================`);
  console.log(`🎯 Test Summary: ${passedTests}/${totalTests} tests passed.`);
  console.log(`========================================\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
