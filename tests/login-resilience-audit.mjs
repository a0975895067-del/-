import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync(new URL('../app/api/[...path]/route.ts', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../public/local-access.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../public/app.html', import.meta.url), 'utf8');
const legacy = fs.readFileSync(new URL('../public/數學任務站.html', import.meta.url), 'utf8');

assert.match(client, /randomizedLoginDelay=.*1000\+.*%4001/, '前端登入需隨機延遲 1～5 秒');
assert.match(client, /loginInFlight[\s\S]+?button\.disabled=true[\s\S]+?await wait\(delay\)/, '等待中需防止重複送出');
assert.match(client, /正在安全排入登入/, '畫面需明確告知正在排入');
assert.match(client, /目前登入人數較多[\s\S]+?\$\{remaining\} 秒/, '短期流量限制需用秒數告知');
assert.match(client, /重複登入錯誤[\s\S]+?\$\{minutes\} 分鐘後再登入/, '帳號冷卻需用分鐘告知');

assert.match(route, /tokenBucketRateLimit\('password-login:global', 500, 500\)/, '後端需令牌桶限制全站每秒 500 次登入');
assert.match(route, /ON CONFLICT\(bucket\) DO UPDATE SET[\s\S]+?RETURNING count/, '令牌扣除需以單一資料庫語句原子更新');
assert.match(route, /password-login-account:[\s\S]+?20, LOGIN_COOLDOWN_SECONDS/, '單一帳號登入需有 5 分鐘視窗限制');
assert.match(route, /retry-after/, '過載回應需含 Retry-After');
assert.match(app, /local-access\.js\?v=20260921-login-5min/);
assert.match(legacy, /local-access\.js\?v=20260921-login-5min/);

console.log('登入抗壓稽核完成：前端隨機分流、重複送出保護、後端令牌桶與帳號冷卻皆已就位。');
