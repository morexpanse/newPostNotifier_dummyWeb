/**
 * Cachi Demo Toolbar Component
 * 각 페이지 상단에 cachi 테스트 전용 안내 및 원클릭 복사/새 글 시뮬레이션 버튼을 주입합니다.
 */

(function () {
  function initDemoToolbar() {
    // 사용자의 피드백에 따라 일반 촬영 및 시연 중에는 시뮬레이션 툴바를 기본 비활성화합니다.
    // 디버깅/테스트를 위해 명시적으로 ?demo=1 이 붙어 있을 때만 툴바를 주입합니다.
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('demo')) {
      return;
    }

    const isNewPostPage = window.location.pathname.endsWith('new-post.html');
    const isDetailPage = window.location.pathname.includes('/posts/');
    
    // Determine path relative to root
    const currentPath = window.location.pathname;
    let rootPath = '/';
    if (currentPath.includes('/boards/webtoon/') || currentPath.includes('/boards/career/') || currentPath.includes('/boards/tech/')) {
      rootPath = '../../';
    } else if (currentPath.includes('/posts/')) {
      rootPath = '../';
    } else if (currentPath.includes('/boards/')) {
      rootPath = '../';
    }

    const toolbar = document.createElement('div');
    toolbar.className = 'cachi-helper-bar';
    
    let actionButtons = '';
    
    if (isNewPostPage) {
      actionButtons = `
        <button class="cachi-btn highlight" onclick="window.location.href='./index.html'">
          🔄 초기 상태로 원복 (새 글 제거)
        </button>
        <button class="cachi-btn" onclick="copyUrl(window.location.href, '📋 새 글이 반영된 URL이 복사되었습니다!')">
          📋 현재 URL 복사
        </button>
      `;
    } else if (isDetailPage) {
      actionButtons = `
        <button class="cachi-btn" onclick="copyUrl(window.location.href, '📋 게시글 상세 URL이 복사되었습니다!')">
          📋 상세 글 URL 복사
        </button>
      `;
    } else {
      actionButtons = `
        <button class="cachi-btn" onclick="copyUrl(window.location.href, '📋 현재 게시판 URL이 복사되었습니다! cachi app에 등록하세요.')">
          📋 게시판 URL 복사
        </button>
        <button class="cachi-btn highlight" onclick="window.location.href='./new-post.html'">
          ⚡ 새 글 발생 시뮬레이션 (NEW)
        </button>
      `;
    }

    toolbar.innerHTML = `
      <div class="cachi-helper-inner">
        <div class="cachi-badge">
          <svg class="cachi-badge-icon" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/></svg>
          <span>cachi 알림 테스트 & 홍보 모드</span>
        </div>
        <div class="cachi-helper-actions">
          ${actionButtons}
        </div>
      </div>
    `;

    document.body.insertBefore(toolbar, document.body.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDemoToolbar);
  } else {
    initDemoToolbar();
  }
})();
