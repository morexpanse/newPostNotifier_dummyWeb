/**
 * Automated Verification Script for StoryLab Cachi Dummy Web
 * 4대 이슈(타이틀/og:title 분리, 고유 링크 부여, 404 방지, 시연용 클린 UI) 검증 포함
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
    'posts/webtoon-152.html',
    'posts/webtoon-42.html',
    'posts/webtoon-41.html',
    'posts/webtoon-10.html',
    'posts/webtoon-9.html',
    'posts/webtoon-88.html',
    'posts/webtoon-87.html',
    'posts/webtoon-65.html',
    'posts/webtoon-64.html',
    'posts/webtoon-20.html',
    'posts/webtoon-19.html',
    'posts/career-notice-1.html',
    'posts/career-104.html',
    'posts/career-103.html',
    'posts/career-102.html',
    'posts/career-101.html',
    'posts/career-100.html',
    'posts/career-99.html',
    'posts/career-98.html',
    'posts/career-97.html',
    'posts/career-96.html',
    'posts/career-95.html',
    'posts/career-105.html',
    'posts/tech-301.html',
    'posts/tech-302.html',
    'posts/tech-298.html',
    'posts/tech-295.html',
    'posts/tech-290.html',
    'posts/tech-285.html',
    'posts/tech-280.html',
    'posts/tech-275.html',
    'feeds/rss.xml',
    'feeds/posts.json',
    'boards/webtoon/rss.xml',
    'boards/career/rss.xml',
    'boards/tech/rss.xml',
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

  // Test 2: Issue 1 - Page Title & og:title Isolation
  console.log('\n🏷️ 2. Verifying Title & OG:Title Isolation across Boards...');
  const webtoonHtml = fs.readFileSync(path.join(BASE_DIR, 'boards/webtoon/index.html'), 'utf8');
  const careerHtml = fs.readFileSync(path.join(BASE_DIR, 'boards/career/index.html'), 'utf8');
  const techHtml = fs.readFileSync(path.join(BASE_DIR, 'boards/tech/index.html'), 'utf8');

  assert(webtoonHtml.includes('<title>스토리랩 웹툰 (StoryLab)</title>'), 'Webtoon title is isolated to "스토리랩 웹툰 (StoryLab)"');
  assert(webtoonHtml.includes('property="og:title" content="스토리랩 웹툰 (StoryLab)"'), 'Webtoon og:title is isolated');
  assert(webtoonHtml.includes('스토리랩 웹툰'), 'Webtoon brand name is updated in header');

  assert(careerHtml.includes('<title>커리어허브 채용 (CareerHub)</title>'), 'Career title is isolated to "커리어허브 채용 (CareerHub)"');
  assert(careerHtml.includes('property="og:title" content="커리어허브 채용 (CareerHub)"'), 'Career og:title is isolated');
  assert(careerHtml.includes('CareerHub'), 'Career brand name is updated in header');

  assert(techHtml.includes('<title>테크로그 엔지니어링 (TechLog)</title>'), 'Tech title is isolated to "테크로그 엔지니어링 (TechLog)"');
  assert(techHtml.includes('property="og:title" content="테크로그 엔지니어링 (TechLog)"'), 'Tech og:title is isolated');
  assert(techHtml.includes('TechLog'), 'Tech brand name is updated in header');

  // Test 3: Issue 3 - Unique Post Links (No duplicate hrefs) and No Broken Links (Zero 404s)
  console.log('\n🔗 3. Verifying Unique URLs and Zero Broken Links in Boards...');
  function extractPostLinks(html, boardDir) {
    const matches = [...html.matchAll(/href="(\.\.\/\.\.\/posts\/[^"]+)"/g)];
    return matches.map(m => {
      const relPath = m[1];
      const absPath = path.resolve(path.join(BASE_DIR, boardDir), relPath);
      return { relPath, absPath };
    });
  }

  const webtoonLinks = extractPostLinks(webtoonHtml, 'boards/webtoon');
  const careerLinks = extractPostLinks(careerHtml, 'boards/career');
  const techLinks = extractPostLinks(techHtml, 'boards/tech');

  // Uniqueness check
  const checkUniqueness = (links, name) => {
    const hrefs = links.map(l => l.relPath);
    const set = new Set(hrefs);
    assert(set.size === hrefs.length && hrefs.length > 0, `${name} has ${hrefs.length} total links, all 100% unique`);
  };

  checkUniqueness(webtoonLinks, 'Webtoon Board');
  checkUniqueness(careerLinks, 'Career Board');
  checkUniqueness(techLinks, 'Tech Board');

  // Broken link check
  const allBoardLinks = [...webtoonLinks, ...careerLinks, ...techLinks];
  let brokenCount = 0;
  for (const link of allBoardLinks) {
    if (!fs.existsSync(link.absPath)) {
      brokenCount++;
      console.error(`  ❌ Missing target file for link: ${link.relPath} (Expected at ${link.absPath})`);
    }
  }
  assert(brokenCount === 0, `All post links point to existing static HTML files (${allBoardLinks.length}/${allBoardLinks.length} valid, zero 404)`);

  // Test 4: Issue 4 - Clean Recording View (No simulation toolbar / guide banner by default)
  console.log('\n🎬 4. Verifying Clean Recording Presentation...');
  assert(!webtoonHtml.includes('demo-toolbar.js'), 'Webtoon index does NOT load demo toolbar script by default');
  assert(!careerHtml.includes('demo-toolbar.js'), 'Career index does NOT load demo toolbar script by default');
  assert(!techHtml.includes('demo-toolbar.js'), 'Tech index does NOT load demo toolbar script by default');
  assert(!webtoonHtml.includes('cachi-guide'), 'Webtoon index does NOT show cachi guide banner');
  assert(!careerHtml.includes('cachi-guide'), 'Career index does NOT show cachi guide banner');
  assert(!techHtml.includes('cachi-guide'), 'Tech index does NOT show cachi guide banner');

  // Test 5: Feeds & RSS Validation
  console.log('\n📡 5. Verifying Feeds & Metadata...');
  const rssContent = fs.readFileSync(path.join(BASE_DIR, 'feeds/rss.xml'), 'utf8');
  assert(rssContent.includes('<rss version="2.0"'), 'Total RSS feed is valid XML RSS 2.0');

  const webtoonRss = fs.readFileSync(path.join(BASE_DIR, 'boards/webtoon/rss.xml'), 'utf8');
  assert(webtoonRss.includes('스토리랩 웹툰 (StoryLab) - 피드'), 'Webtoon RSS has specific isolated title');

  const careerRss = fs.readFileSync(path.join(BASE_DIR, 'boards/career/rss.xml'), 'utf8');
  assert(careerRss.includes('커리어허브 채용 (CareerHub) - 피드'), 'Career RSS has specific isolated title');

  const techRss = fs.readFileSync(path.join(BASE_DIR, 'boards/tech/rss.xml'), 'utf8');
  assert(techRss.includes('테크로그 엔지니어링 (TechLog) - 피드'), 'Tech RSS has specific isolated title');

  // Test 6: Local Server HTTP Responses
  console.log('\n🚀 6. Verifying Server HTTP Responses...');
  const server = require('../server.js');
  const TEST_PORT = 3456;
  
  await new Promise((resolve) => {
    server.close(() => {
      server.listen(TEST_PORT, resolve);
    });
  });

  const fetchUrl = (urlPath) => {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path: urlPath,
        method: 'GET'
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      });
      req.on('error', reject);
      req.end();
    });
  };

  try {
    const resHome = await fetchUrl('/');
    assert(resHome.statusCode === 200, 'GET / returns 200 OK');

    const resWebtoon = await fetchUrl('/boards/webtoon/');
    assert(resWebtoon.statusCode === 200, 'GET /boards/webtoon/ returns 200 OK');
    assert(resWebtoon.data.includes('스토리랩 웹툰 (StoryLab)'), 'GET /boards/webtoon/ returns isolated title');

    const resCareer = await fetchUrl('/boards/career/');
    assert(resCareer.statusCode === 200, 'GET /boards/career/ returns 200 OK');
    assert(resCareer.data.includes('커리어허브 채용 (CareerHub)'), 'GET /boards/career/ returns isolated title');

    const resTech = await fetchUrl('/boards/tech/');
    assert(resTech.statusCode === 200, 'GET /boards/tech/ returns 200 OK');
    assert(resTech.data.includes('테크로그 엔지니어링 (TechLog)'), 'GET /boards/tech/ returns isolated title');

    const resDetail1 = await fetchUrl('/posts/webtoon-152.html');
    assert(resDetail1.statusCode === 200, 'GET /posts/webtoon-152.html returns 200 OK');

    const resDetail2 = await fetchUrl('/posts/career-104.html');
    assert(resDetail2.statusCode === 200, 'GET /posts/career-104.html returns 200 OK');

    const resDetail3 = await fetchUrl('/posts/tech-298.html');
    assert(resDetail3.statusCode === 200, 'GET /posts/tech-298.html returns 200 OK');
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
