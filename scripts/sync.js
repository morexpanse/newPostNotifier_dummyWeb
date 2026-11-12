/**
 * StoryLab Cachi Auto-Sync Engine
 * Single Source of Truth (data/posts.json) -> Boards HTML, RSS Feeds, JSON API, Posts HTML
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT_DIR, 'data', 'posts.json');
const BASE_DOMAIN = 'https://morexpanse.github.io/newPostNotifier_dummyWeb';

function loadData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function validateUniqueness(posts) {
  const urlSet = new Set();
  const duplicateUrls = [];

  for (const post of posts) {
    if (urlSet.has(post.url)) {
      duplicateUrls.push(post.url);
    }
    urlSet.add(post.url);
  }

  if (duplicateUrls.length > 0) {
    throw new Error(`[Sync Error] Duplicate post URLs detected in SSOT: ${duplicateUrls.join(', ')}`);
  }
}

function generateRssXml(title, link, description, items) {
  const lastBuildDate = items.length > 0 ? items[0].pubDate : 'Tue, 10 Nov 2026 22:50:00 +0900';
  const atomLink = `${BASE_DOMAIN}/${link.replace(/^\//, '')}rss.xml`;

  let itemsXml = items.map(p => `  <item>
    <title>${escapeXml(p.title)}</title>
    <link>${BASE_DOMAIN}/${p.url}</link>
    <guid isPermaLink="true">${BASE_DOMAIN}/${p.url}</guid>
    <pubDate>${p.pubDate}</pubDate>
    <category>${escapeXml(p.board === 'webtoon' ? '웹툰·연재' : p.board === 'career' ? '채용·공고' : '기술·공지')}</category>
    <description>${escapeXml(p.description)}</description>
  </item>`).join('\n\n');

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escapeXml(title)}</title>
  <link>${BASE_DOMAIN}/${link}</link>
  <description>${escapeXml(description)}</description>
  <language>ko-kr</language>
  <lastBuildDate>${lastBuildDate}</lastBuildDate>
  <atom:link href="${atomLink}" rel="self" type="application/rss+xml" />

${itemsXml}
</channel>
</rss>
`;
}

function escapeXml(unsafe) {
  return String(unsafe || '').replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

function renderWebtoonHtmlItems(posts) {
  return posts.map(p => {
    const accessType = p.accessType || p.access_type || 'free';
    const useType = p.useType || 'FREE';
    const isFree = p.isFree !== undefined ? p.isFree : (p.is_free !== undefined ? p.is_free : true);
    const charge = p.charge !== undefined ? p.charge : false;
    const waitfreeBlocked = p.waitfree_blocked !== undefined ? p.waitfree_blocked : false;
    const freeChangeDtAttr = p.freeChangeDt ? ` data-free-change-dt="${p.freeChangeDt}" data-free_change_dt="${p.freeChangeDt}"` : '';

    return `        <!-- Post ${p.id} -->
        <li class="post-item" data-post-id="${p.id.replace('webtoon-', '')}" data-access-type="${accessType}" data-access_type="${accessType}" data-use-type="${useType}" data-is-free="${isFree}" data-is_free="${isFree}" data-charge="${charge}" data-waitfree-blocked="${waitfreeBlocked}" data-waitfree_blocked="${waitfreeBlocked}"${freeChangeDtAttr}>
          <div class="post-thumb">${p.thumb || '🎨'}</div>
          <div class="post-main-content">
            <div class="post-header-line">
              <span class="badge ${p.badgeClass || 'badge-free'}">${p.badge}</span>
            </div>
            <a href="../../${p.url}" class="post-title">${p.title}</a>
            <div class="post-meta-line">
              <time datetime="${p.isoDate}">${p.timeDisplay}</time>
              <span>·</span>
              <span>${p.meta}</span>
            </div>
          </div>
        </li>`;
  }).join('\n\n');
}

function renderCareerHtmlItems(posts) {
  return posts.map(p => `            <!-- Item ${p.id} -->
            <tr${p.is_pinned ? ' class="pinned-row"' : ''} data-post-id="${p.id}">
              <td class="col-num">${p.is_pinned ? '<span class="badge badge-pin">공지</span>' : p.numDisplay}</td>
              <td class="col-type"><span class="badge badge-job">${p.typeBadge || '공고'}</span></td>
              <td class="col-title">
                <a href="../../${p.url}" class="post-title">${p.title}</a>
              </td>
              <td class="col-date"><time datetime="${p.isoDate.split('T')[0]}">${p.isoDate.split('T')[0]}</time></td>
              <td class="col-status"><span class="badge ${p.badge.includes('마감') ? 'badge-pay' : 'badge-free'}">${p.badge}</span></td>
            </tr>`).join('\n\n');
}

function renderTechHtmlItems(posts) {
  return posts.map(p => `      <!-- Card ${p.id} -->
      <article class="card-article" data-post-id="${p.id}">
        <div class="card-top">
          <div class="card-tags">
            ${(p.tags || []).map(t => `<span class="card-tag">${t}</span>`).join('\n            ')}
          </div>
          <span class="badge badge-tech">${p.badge}</span>
        </div>
        <h2 class="card-title">
          <a href="../../${p.url}" class="post-title">${p.title}</a>
        </h2>
        <p class="card-desc">
          ${p.description}
        </p>
        <div class="card-footer">
          <time datetime="${p.isoDate.split('T')[0]}">${p.isoDate.split('T')[0]}</time>
          <span>·</span>
          <span>${p.author}</span>
          <span>·</span>
          <span>읽는 시간 ${p.readTime || '4분'}</span>
        </div>
      </article>`).join('\n\n');
}

function renderPortalOverviewItems(posts) {
  return posts.map(p => {
    const categoryName = p.board === 'webtoon' ? '웹툰' : p.board === 'career' ? '채용' : '기술';
    const thumb = p.thumb || (p.board === 'career' ? '💼' : '⚡');
    return `        <!-- Post: ${p.id} -->
        <li class="post-item">
          <div class="post-thumb">${thumb}</div>
          <div class="post-main-content">
            <div class="post-header-line">
              <span class="badge ${p.badgeClass || 'badge-free'}">${categoryName}</span>
              <span class="badge ${p.badgeClass || 'badge-free'}">${p.badge}</span>
            </div>
            <a href="./${p.url}" class="post-title">${p.title}</a>
            <div class="post-meta-line">
              <span>${p.timeDisplay || p.isoDate.split('T')[0]}</span>
              <span>·</span>
              <span>${p.author || p.dept || '스토리랩'}</span>
              <span>·</span>
              <span>${p.meta || (p.readTime ? `읽는 시간 ${p.readTime}` : '신규')}</span>
            </div>
          </div>
        </li>`;
  }).join('\n\n');
}

function sync() {
  console.log('🔄 [Auto-Sync] Loading SSOT dataset from data/posts.json...');
  const data = loadData();
  const allPosts = data.posts;
  
  validateUniqueness(allPosts);
  console.log(`✅ [Validation] All ${allPosts.length} posts have globally unique URLs.`);

  // 1. Separate regular and preview posts
  const webtoonRegular = allPosts.filter(p => p.board === 'webtoon' && !p.is_new_preview);
  const careerRegular = allPosts.filter(p => p.board === 'career' && !p.is_new_preview);
  const techRegular = allPosts.filter(p => p.board === 'tech' && !p.is_new_preview);

  // 2. Sync Webtoon Board & RSS
  console.log(`🎨 [Webtoon] Syncing ${webtoonRegular.length} posts between HTML and RSS...`);
  const webtoonRssXml = generateRssXml(
    data.boards.webtoon.feedTitle,
    'boards/webtoon/',
    data.boards.webtoon.description,
    webtoonRegular
  );
  fs.writeFileSync(path.join(ROOT_DIR, 'boards', 'webtoon', 'rss.xml'), webtoonRssXml, 'utf8');

  // Replace webtoon list inside boards/webtoon/index.html
  const webtoonHtmlPath = path.join(ROOT_DIR, 'boards', 'webtoon', 'index.html');
  let webtoonHtml = fs.readFileSync(webtoonHtmlPath, 'utf8');
  webtoonHtml = webtoonHtml.replace(
    /(<ul class="board-list">)[\s\S]*?(<\/ul>)/,
    `$1\n${renderWebtoonHtmlItems(webtoonRegular)}\n      $2`
  );
  fs.writeFileSync(webtoonHtmlPath, webtoonHtml, 'utf8');

  // 3. Sync Career Board & RSS
  console.log(`💼 [Career] Syncing ${careerRegular.length} posts between HTML and RSS...`);
  const careerRssXml = generateRssXml(
    data.boards.career.feedTitle,
    'boards/career/',
    data.boards.career.description,
    careerRegular
  );
  fs.writeFileSync(path.join(ROOT_DIR, 'boards', 'career', 'rss.xml'), careerRssXml, 'utf8');

  const careerHtmlPath = path.join(ROOT_DIR, 'boards', 'career', 'index.html');
  let careerHtml = fs.readFileSync(careerHtmlPath, 'utf8');
  careerHtml = careerHtml.replace(
    /(<tbody>)[\s\S]*?(<\/tbody>)/,
    `$1\n${renderCareerHtmlItems(careerRegular)}\n          $2`
  );
  fs.writeFileSync(careerHtmlPath, careerHtml, 'utf8');

  // 4. Sync Tech Board & RSS
  console.log(`⚡ [Tech] Syncing ${techRegular.length} posts between HTML and RSS...`);
  const techRssXml = generateRssXml(
    data.boards.tech.feedTitle,
    'boards/tech/',
    data.boards.tech.description,
    techRegular
  );
  fs.writeFileSync(path.join(ROOT_DIR, 'boards', 'tech', 'rss.xml'), techRssXml, 'utf8');

  const techHtmlPath = path.join(ROOT_DIR, 'boards', 'tech', 'index.html');
  let techHtml = fs.readFileSync(techHtmlPath, 'utf8');
  techHtml = techHtml.replace(
    /(<section class="board-cards-grid">)[\s\S]*?(<\/section>)/,
    `$1\n${renderTechHtmlItems(techRegular)}\n    $2`
  );
  fs.writeFileSync(techHtmlPath, techHtml, 'utf8');

  // 5. Sync Total Combined Feeds (feeds/rss.xml, feeds/posts.json)
  console.log('📡 [Feeds] Syncing total combined RSS and JSON API feeds...');
  // Sorted chronologically by isoDate descending
  const sortedCombined = [...allPosts.filter(p => !p.is_new_preview)].sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));
  
  const totalRssXml = generateRssXml(
    '스토리랩 (StoryLab) - 전체 최신 소식',
    '',
    'cachi app & server 알림 테스트용 RSS 2.0 피드',
    sortedCombined
  );
  fs.writeFileSync(path.join(ROOT_DIR, 'feeds', 'rss.xml'), totalRssXml, 'utf8');

  const jsonFeedData = {
    service: 'StoryLab',
    description: 'cachi app & server testing JSON API feed',
    updated_at: new Date().toISOString(),
    boards: Object.values(data.boards).map(b => ({ id: b.id, name: b.title, url: `/${b.url}` })),
    items: sortedCombined.map(p => ({
      id: p.id,
      category: p.board,
      title: p.title,
      url: `/${p.url}`,
      badge: p.badge,
      accessType: p.accessType || 'free',
      access_type: p.access_type || p.accessType || 'free',
      useType: p.useType || 'FREE',
      isFree: p.isFree !== undefined ? p.isFree : true,
      is_free: p.is_free !== undefined ? p.is_free : true,
      charge: p.charge !== undefined ? p.charge : false,
      waitfree_blocked: p.waitfree_blocked !== undefined ? p.waitfree_blocked : false,
      ...(p.freeChangeDt ? { freeChangeDt: p.freeChangeDt, free_change_dt: p.free_change_dt || p.freeChangeDt } : {}),
      is_new: false,
      published_at: p.isoDate
    }))
  };
  fs.writeFileSync(path.join(ROOT_DIR, 'feeds', 'posts.json'), JSON.stringify(jsonFeedData, null, 2), 'utf8');

  // 6. Sync Main Portal index.html Overview
  console.log('🌐 [Portal] Syncing main portal index.html overview items...');
  const portalHtmlPath = path.join(ROOT_DIR, 'index.html');
  let portalHtml = fs.readFileSync(portalHtmlPath, 'utf8');
  const topOverviewPosts = sortedCombined.slice(0, 6);
  portalHtml = portalHtml.replace(
    /(<div class="board-card-wrapper">\s*<ul class="board-list">)[\s\S]*?(<\/ul>\s*<\/div>)/,
    `$1\n${renderPortalOverviewItems(topOverviewPosts)}\n      $2`
  );
  fs.writeFileSync(portalHtmlPath, portalHtml, 'utf8');

  // 7. Verify all post detail files exist
  let missingFiles = 0;
  for (const p of allPosts) {
    const fullPath = path.join(ROOT_DIR, p.url);
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ [Post Missing] Detail HTML not found: ${p.url}`);
      missingFiles++;
    }
  }
  if (missingFiles === 0) {
    console.log(`✅ [Detail Pages] All ${allPosts.length} post HTML files exist on disk (zero 404s).`);
  }

  console.log('\n🎉 [Success] All boards, RSS feeds, JSON API, and portal index are 100% synchronized!');
}

if (require.main === module) {
  try {
    sync();
  } catch (err) {
    console.error('Fatal error during sync:', err);
    process.exit(1);
  }
}

module.exports = { sync, loadData };
