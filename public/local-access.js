(() => {
  const privacyVersion = '2026-09-01';
  const $ = (selector) => document.querySelector(selector);
  let csrfToken = '';
  let currentUser = null;
  let studentChallengeId = '';
  let loginInFlight = false;
  let applicationInFlight = false;

  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'include',
      ...options,
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        ...(options.headers || {}),
      },
    });
    let data = {};
    try {
      data = await response.json();
    } catch {}
    if (!response.ok) {
      throw new Error(data.error || '系統暫時無法處理，請重新整理後再試。');
    }
    return data;
  }

  function message(text, ok = false) {
    const box = $('#localMessage');
    if (!box) return;
    box.textContent = text;
    box.className = `feedback ${ok ? 'ok' : 'no'}`;
  }

  function consent() {
    if (!$('#localPrivacy')?.checked) {
      throw new Error('請先閱讀並確認個人資料告知事項。');
    }
    return privacyVersion;
  }

  function studentProfile(email) {
    const match = String(email || '')
      .toLowerCase()
      .match(/^s(113|114|115)(0[1-9]|1\d|20)(0[1-9]|[12]\d|3\d|40)@lmjh\.tp\.edu\.tw$/);
    if (!match) return null;
    return {
      grade: { 113: '9', 114: '8', 115: '7' }[match[1]],
      classNumber: Number(match[2]),
      seatNumber: Number(match[3]),
    };
  }

  function dispatchAuth() {
    window.dispatchEvent(
      new CustomEvent('math-auth-changed', {
        detail: {
          email: currentUser?.email || '',
          key: currentUser?.id || '',
          role: currentUser?.role || 'guest',
        },
      }),
    );
  }

  function unlock(user) {
    currentUser = user;
    $('#authGate')?.classList.add('hidden');
    $('#studentBar')?.classList.remove('hidden');
    document
      .querySelectorAll('.learning-area')
      .forEach((element) => element.classList.remove('hidden'));
    if ($('#studentAccount')) {
      const roleName = {
        developer: '開發者',
        teacher: '教師',
        student: '學生',
        approved_user: '核准學生',
      }[user.role] || '使用者';
      $('#studentAccount').textContent = `${user.email}（${roleName}）`;
    }
    document.body.dataset.role = user.role;
    dispatchAuth();
    const profile = studentProfile(user.email);
    if (user.role === 'student' && profile) {
      queueMicrotask(() =>
        document.querySelector(`.choice[data-group="${profile.grade}"]`)?.click(),
      );
    }
  }

  function lock() {
    currentUser = null;
    csrfToken = '';
    $('#authGate')?.classList.remove('hidden');
    $('#studentBar')?.classList.add('hidden');
    document
      .querySelectorAll('.learning-area')
      .forEach((element) => element.classList.add('hidden'));
    $('#game')?.classList.add('hidden');
    $('#coach')?.classList.add('hidden');
    document.body.dataset.role = 'guest';
    dispatchAuth();
  }

  function portal(role) {
    $('#rolePortal')?.remove();
    if (!['developer', 'teacher'].includes(role)) return;
    const button = document.createElement('button');
    button.id = 'rolePortal';
    button.type = 'button';
    button.textContent = role === 'developer' ? '開啟開發者後台' : '開啟教師班級後台';
    button.onclick = () => window.open('teacher-dashboard.html', '_blank', 'noopener');
    $('#logoutButton')?.insertAdjacentElement('beforebegin', button);
  }

  function render(status) {
    const gate = $('#authGate');
    if (!gate) return;
    const studentEmailAccess = status.studentEmailLoginEnabled
      ? `<details class="auth-secondary"><summary>龍門國中學生：使用學校信箱驗證</summary><p>第一次使用或忘記密碼時，可將驗證碼寄到學校信箱。</p><label class="auth-label">學校信箱<input id="studentDirectEmail" type="email" autocomplete="email" maxlength="254" placeholder="例如 s1150821@lmjh.tp.edu.tw"></label><button id="studentSendCode" class="primary" type="button">寄送學生驗證碼</button><label class="auth-label">信箱中的 6 位數驗證碼<input id="studentDirectCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}"></label><button id="studentVerifyCode" class="primary" type="button">完成驗證並登入</button></details>`
      : '';
    const developerSetup = status.developerConfigured
      ? ''
      : `<div class="developer-setup"><h4>第一次設定開發者動態驗證器</h4><label class="auth-label">開發者電子郵件<input id="setupEmail" type="email" autocomplete="username" maxlength="254"></label><label class="auth-label">本機初始設定碼<input id="setupToken" type="password" maxlength="100"></label><label class="auth-label">設定新的開發者密碼（至少 12 個字元）<input id="setupPassword" type="password" autocomplete="new-password" maxlength="200"></label><button id="startSetup" class="primary" type="button">產生驗證器金鑰</button><div id="setupResult" class="hidden"><p>請在驗證器選擇「輸入設定金鑰」，帳戶名稱填「數學任務站」，再輸入下列金鑰：</p><p><strong id="manualKey"></strong></p><label class="auth-label">驗證器顯示的 6 位數動態碼<input id="setupOtp" inputmode="numeric" maxlength="6"></label><button id="confirmSetup" class="primary" type="button">確認並登入</button></div></div>`;

    gate.innerHTML = `
      <h2>學生／教師登入與註冊</h2>
      <p class="source-note">登入請填寫帳號與密碼；系統會依已核准帳號自動判定身分。註冊只需設定一次密碼。</p>
      <label class="privacy-check"><input id="localPrivacy" type="checkbox"> 我已閱讀並了解 <a href="privacy.html" target="_blank" rel="noopener">個人資料蒐集、處理及利用告知事項</a>（版本 ${privacyVersion}）。</label>
      <div class="auth-account-grid">
        <section class="auth-panel" aria-labelledby="memberLoginTitle">
          <h3 id="memberLoginTitle">學生／教師登入</h3>
          <label class="auth-label">帳號（電子郵件）<input id="localEmail" type="email" autocomplete="username" maxlength="254"></label>
          <label class="auth-label">密碼<input id="localPassword" type="password" autocomplete="current-password" maxlength="200"></label>
          <button id="localLogin" class="primary" type="button">立即登入</button>
        </section>
        <section class="auth-panel" aria-labelledby="applicationTitle">
          <h3 id="applicationTitle">學生／教師註冊申請</h3>
          <label class="auth-label">申請帳號（電子郵件）<input id="applicationEmail" type="email" autocomplete="username" maxlength="254"></label>
          <label class="auth-label">設定密碼（至少 12 個字元）<input id="applicationPassword" type="password" autocomplete="new-password" maxlength="200"></label>
          <label class="auth-label">申請身分<select id="applicationIdentity"><option value="學生">學生</option><option value="教師">教師</option></select></label>
          <button id="submitApplication" class="primary" type="button">送出註冊申請</button>
        </section>
      </div>
      ${studentEmailAccess}
      <details class="developer-login">
        <summary>開發者登入</summary>
        <p>僅限開發者使用，須輸入密碼及驗證器的 6 位數動態碼。</p>
        <label class="auth-label">開發者電子郵件<input id="developerEmail" type="email" autocomplete="username" maxlength="254"></label>
        <label class="auth-label">開發者密碼<input id="developerPassword" type="password" autocomplete="current-password" maxlength="200"></label>
        <label class="auth-label">驗證器動態碼<input id="developerOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></label>
        <button id="developerLogin" class="primary" type="button">開發者登入</button>
        ${developerSetup}
      </details>
      <p id="localMessage" class="feedback" aria-live="polite"></p>`;
  }

  async function passwordLogin(kind) {
    if (loginInFlight) return;
    loginInFlight = true;
    const developer = kind === 'developer';
    const button = $(developer ? '#developerLogin' : '#localLogin');
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = '登入中…';
    try {
      const result = await api('/api/auth/password-login', {
        method: 'POST',
        body: JSON.stringify({
          email: $(developer ? '#developerEmail' : '#localEmail').value,
          password: $(developer ? '#developerPassword' : '#localPassword').value,
          otp: developer ? $('#developerOtp').value : '',
          privacyVersion: consent(),
        }),
      });
      csrfToken = result.csrfToken;
      message('登入成功。', true);
      unlock(result.user);
    } catch (error) {
      message(error.message);
    } finally {
      loginInFlight = false;
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }

  async function submitApplication() {
    if (applicationInFlight) return;
    applicationInFlight = true;
    const button = $('#submitApplication');
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = '送出中…';
    try {
      const result = await api('/api/applications/direct', {
        method: 'POST',
        body: JSON.stringify({
          email: $('#applicationEmail').value,
          identity: $('#applicationIdentity').value,
          workplace: '',
          password: $('#applicationPassword').value,
          privacyVersion: consent(),
        }),
      });
      $('#applicationPassword').value = '';
      message(`申請已送出，申請編號：${result.id}。開發者核准後即可登入。`, true);
    } catch (error) {
      message(error.message);
    } finally {
      applicationInFlight = false;
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }

  async function logout() {
    try {
      const fresh = await api('/api/auth/csrf');
      csrfToken = fresh.csrfToken;
      await api('/api/auth/logout', { method: 'POST', body: '{}' });
      lock();
      message('已安全登出。', true);
    } catch (error) {
      message(`登出未完成：${error.message}`);
    }
  }

  function bind(status) {
    $('#localLogin').onclick = () => passwordLogin('member');
    $('#developerLogin').onclick = () => passwordLogin('developer');
    $('#submitApplication').onclick = submitApplication;
    $('#logoutButton').onclick = logout;

    if (status.studentEmailLoginEnabled) {
      $('#studentSendCode').onclick = async () => {
        try {
          const result = await api('/api/auth/request-code', {
            method: 'POST',
            body: JSON.stringify({
              email: $('#studentDirectEmail').value,
              privacyVersion: consent(),
            }),
          });
          studentChallengeId = result.challengeId;
          message('驗證碼已寄出，請於 10 分鐘內輸入。', true);
        } catch (error) {
          message(error.message);
        }
      };
      $('#studentVerifyCode').onclick = async () => {
        try {
          if (!studentChallengeId) throw new Error('請先寄送驗證碼。');
          const result = await api('/api/auth/verify-code', {
            method: 'POST',
            body: JSON.stringify({
              challengeId: studentChallengeId,
              otp: $('#studentDirectCode').value,
              privacyVersion: consent(),
            }),
          });
          csrfToken = result.csrfToken;
          studentChallengeId = '';
          unlock(result.user);
        } catch (error) {
          message(error.message);
        }
      };
    }

    if (!status.developerConfigured) {
      let setup = {};
      $('#startSetup').onclick = async () => {
        try {
          setup = {
            email: $('#setupEmail').value,
            setupToken: $('#setupToken').value,
            password: $('#setupPassword').value,
            privacyVersion: consent(),
          };
          const result = await api('/api/auth/developer/setup/start', {
            method: 'POST',
            body: JSON.stringify(setup),
          });
          $('#manualKey').textContent = result.manualKey;
          $('#setupResult').classList.remove('hidden');
          message('驗證器金鑰已產生，請加入驗證器後輸入動態碼。', true);
        } catch (error) {
          message(error.message);
        }
      };
      $('#confirmSetup').onclick = async () => {
        try {
          const result = await api('/api/auth/developer/setup/confirm', {
            method: 'POST',
            body: JSON.stringify({ ...setup, otp: $('#setupOtp').value }),
          });
          csrfToken = result.csrfToken;
          unlock(result.user);
        } catch (error) {
          message(error.message);
        }
      };
    }
  }

  async function init() {
    let status;
    try {
      status = await api('/api/auth/local/status');
    } catch (error) {
      const gate = $('#authGate');
      if (gate) gate.innerHTML = `<h2>登入服務暫時無法連線</h2><p class="feedback no">${error.message}</p><button class="primary" type="button" onclick="location.reload()">重新整理</button>`;
      return;
    }
    if (!status.enabled) return;
    render(status);
    bind(status);
    lock();
    try {
      const result = await api('/api/me');
      const fresh = await api('/api/auth/csrf');
      csrfToken = fresh.csrfToken;
      unlock(result.user);
    } catch {}
  }

  window.addEventListener('math-auth-changed', (event) => portal(event.detail?.role));
  window.MathSecureApi = {
    api,
    get csrfToken() {
      return csrfToken;
    },
  };
  window.MathStudentAuth = {
    get currentKey() {
      return currentUser?.id || '';
    },
    get currentEmail() {
      return currentUser?.email || '';
    },
    get role() {
      return currentUser?.role || 'guest';
    },
    get studentProfile() {
      return studentProfile(currentUser?.email);
    },
    get isVerified() {
      return Boolean(currentUser);
    },
  };

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
