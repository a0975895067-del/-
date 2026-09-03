(() => {
  const $ = selector => document.querySelector(selector);

  function startStaticMode() {
    window.MATH_GITHUB_DEMO = true;
    window.MathStudentAuth = {
      get currentKey() { return 'github-public-preview'; },
      get currentEmail() { return ''; },
      get role() { return 'guest'; },
      get studentProfile() { return null; },
      get isVerified() { return true; },
    };

    document.body.dataset.role = 'guest';
    $('#authGate')?.classList.add('hidden');
    $('#studentBar')?.classList.remove('hidden');
    $('#logoutButton')?.classList.add('hidden');
    if ($('#studentAccount')) {
      $('#studentAccount').textContent = 'GitHub 公益預覽（不登入、不上傳資料）';
    }
    document.querySelectorAll('.learning-area').forEach(section => section.classList.remove('hidden'));

    if (!$('#githubPreviewNotice')) {
      const notice = document.createElement('section');
      notice.id = 'githubPreviewNotice';
      notice.className = 'card learning-area preview-notice';
      const heading = document.createElement('h2');
      heading.textContent = 'GitHub 公益學習版';
      const copy = document.createElement('p');
      copy.textContent = '七、八、九年級練習、提示、解析、學習分析與 PDF 報告可直接使用。此公開頁不啟用帳號、驗證碼、班級或教師後台，也不會把作答資料傳到網路。';
      const privacy = document.createElement('p');
      const link = document.createElement('a');
      link.href = 'privacy.html';
      link.textContent = '查看隱私與資料使用說明';
      privacy.append(link);
      notice.append(heading, copy, privacy);
      document.querySelector('.welcome')?.insertAdjacentElement('beforebegin', notice);
    }

    window.dispatchEvent(new CustomEvent('math-auth-changed', {
      detail: { email: '', key: 'github-public-preview', role: 'guest' },
    }));
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', startStaticMode)
    : startStaticMode();
})();
