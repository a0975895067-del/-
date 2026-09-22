import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync(new URL('../app/api/[...path]/route.ts', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../public/local-access.js', import.meta.url), 'utf8');

assert.match(route, /const directStudentLogin = purpose === 'login' && Boolean\(studentProfile\(email\)\)/, '龍門學生驗證碼須使用獨立短時保護');
assert.match(route, /directStudentLogin \? 60 : 15 \* 60/, '學生驗證碼不得觸發長時間等待');
assert.match(route, /enabled: true, studentEmailLoginEnabled/, '學生信箱驗證與密碼登入入口必須並存');
assert.doesNotMatch(route, /password-login-account:|LOGIN_COOLDOWN/, '學生與教師的密碼登入都不得套用冷卻時間');
assert.doesNotMatch(route, /credential\.locked_until &&/, '既有鎖定紀錄不得繼續阻擋登入');
assert.match(client, /studentEmailLoginEnabled[\s\S]+?\/api\/auth\/request-code/, '畫面必須提供學校信箱驗證入口');
assert.match(client, /studentChallengeId[\s\S]+?\/api\/auth\/verify-code/, '學生驗證成功後必須直接登入');

console.log('學生註冊與登入無等待稽核完成：7 項規則全數通過。');
