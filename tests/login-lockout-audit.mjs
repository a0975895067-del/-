import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync(new URL('../app/api/[...path]/route.ts', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../public/local-access.js', import.meta.url), 'utf8');

assert.match(route, /retryAfterSeconds[\s\S]+?'retry-after'/, '伺服器須回傳剩餘等待秒數與 Retry-After');
assert.match(route, /LOGIN_COOLDOWN_SECONDS = 5 \* 60/, '登入冷卻秒數須設定為5分鐘');
assert.match(route, /LOGIN_COOLDOWN_MS = 5 \* 60_000/, '登入鎖定毫秒數須設定為5分鐘');
assert.match(route, /failures >= 5 \? new Date\(Date\.now\(\) \+ LOGIN_COOLDOWN_MS\)/, '密碼錯誤五次須鎖定5分鐘');
assert.match(route, /counter == null[\s\S]+?failed_attempts[\s\S]+?LOGIN_COOLDOWN_MS/, '開發者動態碼錯誤也須累計並鎖定');
assert.match(route, /direct-application-ip:[\s\S]+?5, 15 \* 60[\s\S]+?direct-application-email:[\s\S]+?3, 15 \* 60/, '重複申請限制須在15分鐘後解除');
assert.match(route, /latestAllowedReset[\s\S]+?UPDATE rate_limits SET reset_at/, '舊的較長鎖定紀錄須縮短為目前設定的5分鐘');
assert.match(route, /重複登入錯誤，帳號已暫停登入；請於 5 分鐘後再登入。/, '鎖定訊息須明確告知5分鐘');
assert.match(client, /\[423,429\][\s\S]+?retryAfterSeconds/, '前端須辨識帳號鎖定及流量限制');
assert.match(client, /button\.disabled=true[\s\S]+?button\.disabled=false/, '等待期間須停用按鈕，時間到再恢復');
assert.match(client, /請於 \$\{minutes\} 分鐘後再登入/, '畫面須顯示剩餘等待分鐘');

console.log('登入鎖定稽核完成：9項伺服器與畫面規則全數通過。');
