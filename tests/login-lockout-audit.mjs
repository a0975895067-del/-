import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync(new URL('../app/api/[...path]/route.ts', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../public/local-access.js', import.meta.url), 'utf8');

assert.doesNotMatch(route, /LOGIN_COOLDOWN_SECONDS|LOGIN_COOLDOWN_MS/, '登入路由不得保留冷卻常數');
assert.doesNotMatch(route, /password-login-account:|locked_until && Date\.parse/, '登入不得套用帳號冷卻視窗');
assert.match(route, /locked_until=NULL/, '舊的登入鎖定狀態須在登入嘗試時清除');
assert.doesNotMatch(client, /showCooldown|cooldownTimer|loginCooldownActive/, '前端不得顯示登入冷卻倒數');
assert.doesNotMatch(client, /分鐘後再登入|暫停時間|冷卻/, '登入畫面不得要求等待冷卻時間');

console.log('登入冷卻移除稽核完成：前後端不再設定或顯示登入冷卻時間。');
