import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync(new URL('../app/api/[...path]/route.ts', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../public/local-access.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../public/app.html', import.meta.url), 'utf8');
const legacy = fs.readFileSync(new URL('../public/數學任務站.html', import.meta.url), 'utf8');

assert.doesNotMatch(client, /randomizedLoginDelay|await wait\(delay\)/, '登入不得隨機延遲');
assert.match(client, /if \(loginInFlight\) return/, '前端仍須防止重複送出登入請求');
assert.match(client, /csrfToken = result\.csrfToken;[\s\S]+?unlock\(result\.user\)/, '登入成功須直接更新畫面');
assert.match(client, /const result = await api\('\/api\/me'\)/, '重新開啟頁面時須恢復有效工作階段');
assert.match(route, /tokenBucketRateLimit\('password-login:global', 500, 500\)/, '後端仍須保留單秒全站抗壓保護');
assert.doesNotMatch(client, /id="localIdentity"/, '登入畫面不得要求學生或教師自行選擇身分');
assert.doesNotMatch(route, /const requestedIdentity = String\(data\.identity \|\| ''\)|identityMatches/, '登入身分須由伺服器帳號資料自動判定');
assert.match(route, /if \(user\.role === 'developer'\)/, '開發者仍須由伺服器角色強制驗證動態碼');
for (const html of [app, legacy]) {
  assert.match(html, /local-access\.js\?v=20260922-login-auto-role/);
  assert.doesNotMatch(html, /secure-auth\.js/, '頁面只能載入一套登入控制器');
}

console.log('登入穩定稽核完成：單一控制器、立即登入、工作階段恢復與全站抗壓均已就位。');
