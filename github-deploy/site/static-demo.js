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
    if ($('#studentAccount')) $('#studentAccount').textContent = 'GitHub 公益預覽（不登入、不上傳資料）';
    document.querySelectorAll('.learning-area').forEach(section => section.classList.remove('hidden'));

    if (!$('#githubPreviewNotice')) {
      const notice = document.createElement('section');
      notice.id = 'githubPreviewNotice';
      notice.className = 'card learning-area preview-notice';
      const heading = document.createElement('h2');
      heading.textContent = 'GitHub 公益學習版';
      const text = document.createElement('p');
      text.textContent = '目前不啟用登入與雲端班級功能；七、八、九年級題庫、難易度與題數選擇、提示、原因解析、AI 本機引導、學習分析及列印／另存 PDF 報告均可直接使用。作答資料只留在這台裝置，不會傳送到網路。';
      const privacy = document.createElement('p');
      const privacyLink = document.createElement('a');
      privacyLink.href = 'privacy.html';
      privacyLink.textContent = '查看隱私與資料使用說明';
      privacy.append(privacyLink);
      notice.append(heading, text, privacy);
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
