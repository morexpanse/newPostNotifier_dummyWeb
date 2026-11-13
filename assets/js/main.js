/**
 * Cachi Demo Helper Scripts
 */

// Toast notification helper
function showToast(message) {
  let toast = document.getElementById('cachi-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cachi-toast';
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }
  toast.innerHTML = message;
  toast.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// Copy URL to clipboard
function copyUrl(textToCopy, customMessage) {
  const url = textToCopy || window.location.href;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showToast(customMessage || '📋 URL이 복사되었습니다! cachi app에 등록하세요.');
    }).catch(() => {
      fallbackCopyText(url, customMessage);
    });
  } else {
    fallbackCopyText(url, customMessage);
  }
}

function fallbackCopyText(text, customMessage) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    showToast(customMessage || '📋 URL이 복사되었습니다! cachi app에 등록하세요.');
  } catch (err) {
    showToast('⚠️ URL 복사 실패 (직접 복사해주세요)');
  }
  document.body.removeChild(textarea);
}

// Quick copy board URL button click
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-copy-url]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetUrl = btn.getAttribute('data-copy-url') || window.location.href;
      copyUrl(targetUrl);
    });
  });
});
