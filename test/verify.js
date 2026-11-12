/**
 * Automated Verification Script for StoryLab Cachi Dummy Web
 * - 4대 이슈(타이틀/og:title 분리, 고유 링크 부여, 404 방지, 시연용 클린 UI)
 * - 게시판과 RSS 간 상시 1:1 동기화 및 전역 링크 고유성(Global Uniqueness) 완벽 검증
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

function extractRssItems(xmlContent) {
  const items = [];
  const itemMatches = [...xmlContent.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  for (const m of itemMatches) {
    const itemBlock = m[1];
    const extractTag = (tag) => {
      const match = itemBlock.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
      return match ? match[1].trim() : undefined;
    };

    items.push({
      title: extractTag('title') || '',
      link: extractTag('link') || '',
      guid: extractTag('guid') || '',
      accessType: extractTag('accessType'),
      access_type: extractTag('access_type'),
      useType: extractTag('useType'),
      isFree: extractTag('isFree'),
      is_free: extractTag('is_free'),
      charge: extractTag('charge'),
      waitfree_blocked: extractTag('waitfree_blocked'),
      freeChangeDt: extractTag('freeChangeDt'),
      free_change_dt: extractTag('free_change_dt')
    });
  }
  return items;
}

function extractHtmlItems(htmlContent, boardType) {
  const items = [];
  if (boardType === 'webtoon') {
    const matches = [...htmlContent.matchAll(/<li class="post-item"[^>]*>[\s\S]*?<a href="([^"]+)" class="post-title">([\s\S]*?)<\/a>/g)];
    for (const m of matches) {
      items.push({ href: m[1].trim(), title: m[2].trim() });
    }
  } else if (boardType === 'career') {
    const matches = [...htmlContent.matchAll(/<tr[^>]*data-post-id="[^"]*"[^>]*>[\s\S]*?<a href="([^"]+)" class="post-title">([\s\S]*?)<\/a>/g)];
    for (const m of matches) {
      items.push({ href: m[1].trim(), title: m[2].trim() });
    }
  } else if (boardType === 'tech') {
    const matches = [...htmlContent.matchAll(/<article class="card-article"[^>]*>[\s\S]*?<a href="([^"]+)" class="post-title">([\s\S]*?)<\/a>/g)];
    for (const m of matches) {
      items.push({ href: m[1].trim(), title: m[2].trim() });
    }
  }
  return items;
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
    'data/posts.json',
    'scripts/sync.js',
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

  // Test 2: Title & OG:Title Isolation across Boards
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

  // Test 3: Issue 3 - Link Uniqueness in HTML Boards
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

  // Test 4: RSS Link Uniqueness (No duplicate links in ANY RSS feed)
  console.log('\n📡 4. Verifying RSS Feed Link Uniqueness (No Duplicate URLs in RSS)...');
  const checkRssUniqueness = (filePath, feedName) => {
    const content = fs.readFileSync(path.join(BASE_DIR, filePath), 'utf8');
    const items = extractRssItems(content);
    const links = items.map(i => i.link);
    const set = new Set(links);
    assert(set.size === links.length && links.length > 0, `${feedName} (${filePath}) has ${links.length} items, all links 100% unique`);
  };

  checkRssUniqueness('boards/webtoon/rss.xml', 'Webtoon RSS Feed');
  checkRssUniqueness('boards/career/rss.xml', 'Career RSS Feed');
  checkRssUniqueness('boards/tech/rss.xml', 'Tech RSS Feed');
  checkRssUniqueness('feeds/rss.xml', 'Total Combined RSS Feed');

  // Test 5: Exact 1:1 Board-to-RSS Synchronization
  console.log('\n🔄 5. Verifying Exact 1:1 Board HTML <-> RSS XML Synchronization...');
  const verifyBoardRssSync = (boardName, htmlContent, boardType, rssPath) => {
    const rssContent = fs.readFileSync(path.join(BASE_DIR, rssPath), 'utf8');
    const htmlItems = extractHtmlItems(htmlContent, boardType);
    const rssItems = extractRssItems(rssContent);

    assert(htmlItems.length === rssItems.length, `${boardName}: HTML count (${htmlItems.length}) matches RSS count (${rssItems.length}) 1:1`);

    let syncErrors = 0;
    for (let i = 0; i < htmlItems.length; i++) {
      const h = htmlItems[i];
      const r = rssItems[i];

      const htmlFileName = path.basename(h.href);
      const rssFileName = path.basename(r.link);

      if (htmlFileName !== rssFileName) {
        console.error(`  ❌ [${boardName} #${i}] URL Mismatch: HTML=${htmlFileName} vs RSS=${rssFileName}`);
        syncErrors++;
      }
    }
    assert(syncErrors === 0, `${boardName}: All ${htmlItems.length} items have identical URLs and sequence in HTML and RSS`);
  };

  verifyBoardRssSync('Webtoon', webtoonHtml, 'webtoon', 'boards/webtoon/rss.xml');
  verifyBoardRssSync('Career', careerHtml, 'career', 'boards/career/rss.xml');
  verifyBoardRssSync('Tech', techHtml, 'tech', 'boards/tech/rss.xml');

  // Test 6: Portal index.html and JSON Feed Uniqueness
  console.log('\n🌐 6. Verifying Portal index.html & JSON API Uniqueness...');
  const portalHtml = fs.readFileSync(path.join(BASE_DIR, 'index.html'), 'utf8');
  const portalLinks = [...portalHtml.matchAll(/href="(\.\/posts\/[^"]+)"/g)].map(m => m[1]);
  const portalSet = new Set(portalLinks);
  assert(portalSet.size === portalLinks.length && portalLinks.length > 0, `Portal index.html has ${portalLinks.length} overview links, all 100% unique`);

  const jsonFeed = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'feeds/posts.json'), 'utf8'));
  const jsonUrls = jsonFeed.items.map(i => i.url);
  const jsonSet = new Set(jsonUrls);
  assert(jsonSet.size === jsonUrls.length && jsonUrls.length > 0, `feeds/posts.json has ${jsonUrls.length} items, all URLs 100% unique`);

  // Test 7: Clean Recording View (No simulation toolbar / guide banner by default)
  console.log('\n🎬 7. Verifying Clean Recording Presentation...');
  assert(!webtoonHtml.includes('demo-toolbar.js'), 'Webtoon index does NOT load demo toolbar script by default');
  assert(!careerHtml.includes('demo-toolbar.js'), 'Career index does NOT load demo toolbar script by default');
  assert(!techHtml.includes('demo-toolbar.js'), 'Tech index does NOT load demo toolbar script by default');
  assert(!webtoonHtml.includes('cachi-guide'), 'Webtoon index does NOT show cachi guide banner');
  assert(!careerHtml.includes('cachi-guide'), 'Career index does NOT show cachi guide banner');
  assert(!techHtml.includes('cachi-guide'), 'Tech index does NOT show cachi guide banner');

  // Test 8: Local Server HTTP Responses
  console.log('\n🚀 8. Verifying Server HTTP Responses...');
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

    const resWebtoonRss = await fetchUrl('/boards/webtoon/rss.xml');
    assert(resWebtoonRss.statusCode === 200, 'GET /boards/webtoon/rss.xml returns 200 OK');

    const resCareerRss = await fetchUrl('/boards/career/rss.xml');
    assert(resCareerRss.statusCode === 200, 'GET /boards/career/rss.xml returns 200 OK');

    const resTechRss = await fetchUrl('/boards/tech/rss.xml');
    assert(resTechRss.statusCode === 200, 'GET /boards/tech/rss.xml returns 200 OK');

    const resFeedRss = await fetchUrl('/feeds/rss.xml');
    assert(resFeedRss.statusCode === 200, 'GET /feeds/rss.xml returns 200 OK');

    const resFeedJson = await fetchUrl('/feeds/posts.json');
    assert(resFeedJson.statusCode === 200, 'GET /feeds/posts.json returns 200 OK');
  } finally {
    server.close();
  }

  // Test 9: Kakao Webtoon determineAccessType Compatibility
  console.log('\n🔒 9. Verifying Kakao Webtoon determineAccessType Compatibility...');
  function determineAccessType(record) {
    if (
      record.accessType === 'free' ||
      record.accessType === 'wait_free' ||
      record.accessType === 'paid'
    ) {
      return record.accessType;
    }
    if (
      record.access_type === 'free' ||
      record.access_type === 'wait_free' ||
      record.access_type === 'paid'
    ) {
      return record.access_type;
    }

    if (record.useType === 'FREE') {
      return 'free';
    }
    if (record.useType === 'WAIT_FREE' || record.useType === 'WAIT_FOR_FREE') {
      return 'wait_free';
    }
    if (record.useType === 'EARLY_ACCESS' || record.useType === 'PAY') {
      return 'paid';
    }

    const isFree =
      record.is_free === true ||
      record.is_free === 'true' ||
      record.isFree === true ||
      record.isFree === 'true' ||
      record.charge === false ||
      record.charge === 'false';

    if (isFree) {
      return 'free';
    }

    const isNotFree =
      record.is_free === false ||
      record.is_free === 'false' ||
      record.isFree === false ||
      record.isFree === 'false' ||
      record.charge === true ||
      record.charge === 'true';

    if (isNotFree) {
      if (
        record.waitfree_blocked === true ||
        record.waitfree_blocked === 'true'
      ) {
        return 'paid';
      }

      const freeChangeDt =
        typeof record.free_change_dt === 'string'
          ? record.free_change_dt
          : typeof record.freeChangeDt === 'string'
            ? record.freeChangeDt
            : undefined;

      if (freeChangeDt) {
        const parsedFreeTime = Date.parse(freeChangeDt);
        if (!isNaN(parsedFreeTime) && parsedFreeTime > Date.now()) {
          return 'paid';
        }
      }

      if (
        record.waitfree_blocked === false ||
        record.waitfree_blocked === 'false'
      ) {
        return 'wait_free';
      }

      return 'paid';
    }

    return undefined;
  }

  // 9-1. Test determineAccessType on data/posts.json
  const postsJsonData = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'data/posts.json'), 'utf8'));
  let postsJsonFailures = 0;
  for (const post of postsJsonData.posts) {
    const determined = determineAccessType(post);
    if (!determined || determined !== post.accessType) {
      postsJsonFailures++;
      console.error(`  ❌ Mismatch for post ${post.id}: determined=${determined} vs expected=${post.accessType}`);
    }
  }
  assert(postsJsonFailures === 0, `All ${postsJsonData.posts.length} posts in data/posts.json resolve correctly with determineAccessType()`);

  // 9-2. Test determineAccessType on feeds/posts.json
  const feedsJsonData = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'feeds/posts.json'), 'utf8'));
  let feedsJsonFailures = 0;
  for (const item of feedsJsonData.items) {
    const determined = determineAccessType(item);
    if (!determined || determined !== item.accessType) {
      feedsJsonFailures++;
      console.error(`  ❌ Mismatch for feed item ${item.id}: determined=${determined} vs expected=${item.accessType}`);
    }
  }
  assert(feedsJsonFailures === 0, `All ${feedsJsonData.items.length} items in feeds/posts.json resolve correctly with determineAccessType()`);

  // 9-3. Test determineAccessType on parsed HTML data-attributes
  const webtoonIndexHtml = fs.readFileSync(path.join(BASE_DIR, 'boards/webtoon/index.html'), 'utf8');
  const liMatches = [...webtoonIndexHtml.matchAll(/<li class="post-item"([^>]*)>/g)];
  let htmlAttrFailures = 0;
  for (const m of liMatches) {
    const attrStr = m[1];
    const extractAttr = (name) => {
      const match = attrStr.match(new RegExp(`${name}="([^"]*)"`));
      return match ? match[1] : undefined;
    };
    const htmlRecord = {
      postId: extractAttr('data-post-id'),
      accessType: extractAttr('data-access-type'),
      access_type: extractAttr('data-access_type'),
      useType: extractAttr('data-use-type'),
      isFree: extractAttr('data-is-free'),
      is_free: extractAttr('data-is_free'),
      charge: extractAttr('data-charge'),
      waitfree_blocked: extractAttr('data-waitfree-blocked'),
      freeChangeDt: extractAttr('data-free-change-dt'),
      free_change_dt: extractAttr('data-free_change_dt')
    };

    const determined = determineAccessType(htmlRecord);
    if (!determined) {
      htmlAttrFailures++;
      console.error(`  ❌ Failed to determine access type from HTML for post ${htmlRecord.postId}`);
    }
  }
  assert(htmlAttrFailures === 0 && liMatches.length > 0, `All ${liMatches.length} items parsed from boards/webtoon/index.html HTML attributes resolve via determineAccessType()`);

  // 9-4. Test determineAccessType on parsed RSS XML items (boards/webtoon/rss.xml)
  const webtoonRssXml = fs.readFileSync(path.join(BASE_DIR, 'boards/webtoon/rss.xml'), 'utf8');
  const webtoonRssItems = extractRssItems(webtoonRssXml);
  let rssFailures = 0;
  for (const item of webtoonRssItems) {
    const determined = determineAccessType(item);
    if (!determined) {
      rssFailures++;
      console.error(`  ❌ Failed to determine access type from RSS for item ${item.title}`);
    }
  }
  assert(rssFailures === 0 && webtoonRssItems.length > 0, `All ${webtoonRssItems.length} items parsed from boards/webtoon/rss.xml XML tags resolve via determineAccessType()`);

  // 9-5. Test determineAccessType on total combined feeds/rss.xml
  const totalRssXml = fs.readFileSync(path.join(BASE_DIR, 'feeds/rss.xml'), 'utf8');
  const totalRssItems = extractRssItems(totalRssXml);
  let totalRssFailures = 0;
  for (const item of totalRssItems) {
    const determined = determineAccessType(item);
    if (!determined) {
      totalRssFailures++;
      console.error(`  ❌ Failed to determine access type from total RSS for item ${item.title}`);
    }
  }
  assert(totalRssFailures === 0 && totalRssItems.length > 0, `All ${totalRssItems.length} items parsed from feeds/rss.xml XML tags resolve via determineAccessType()`);

  // 9-6. Verify specific types: webtoon-152 is paid, webtoon-150 is free, webtoon-149 is wait_free
  const p152 = postsJsonData.posts.find(p => p.id === 'webtoon-152');
  const p150 = postsJsonData.posts.find(p => p.id === 'webtoon-150');
  const p149 = postsJsonData.posts.find(p => p.id === 'webtoon-149');
  assert(determineAccessType(p152) === 'paid', 'webtoon-152 resolves to "paid"');
  assert(determineAccessType(p150) === 'free', 'webtoon-150 resolves to "free"');
  assert(determineAccessType(p149) === 'wait_free', 'webtoon-149 resolves to "wait_free"');

  // 9-7. Verify specific types from RSS: first item is paid (152), second is free (150), third is wait_free (149)
  assert(determineAccessType(webtoonRssItems[0]) === 'paid', 'webtoon RSS first item (152) resolves to "paid"');
  assert(determineAccessType(webtoonRssItems[1]) === 'free', 'webtoon RSS second item (150) resolves to "free"');
  assert(determineAccessType(webtoonRssItems[2]) === 'wait_free', 'webtoon RSS third item (149) resolves to "wait_free"');

  // 9-8. Verify no remaining Naver 'cookie' terms in webtoon files
  assert(!webtoonIndexHtml.includes('쿠키'), 'boards/webtoon/index.html does not contain Naver "쿠키" term');
  assert(!JSON.stringify(postsJsonData).includes('쿠키'), 'data/posts.json does not contain Naver "쿠키" term');
  assert(!webtoonRssXml.includes('쿠키'), 'boards/webtoon/rss.xml does not contain Naver "쿠키" term');

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
