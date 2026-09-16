import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync(new URL('../app/api/[...path]/route.ts', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../public/local-access.js', import.meta.url), 'utf8');

assert.match(
  route,
  /const directStudentLogin = purpose === 'login' && Boolean\(studentProfile\(email\)\)/,
  '龍門國中學生的信箱驗證應使用獨立的短時流量限制',
);
assert.match(
  route,
  /directStudentLogin \? 60 : 15 \* 60/,
  '學生驗證碼不得觸發 15 分鐘等待',
);
assert.match(route, /windowSeconds >= 15 \* 60[\s\S]+?驗證碼寄送次數過多，請稍後再試/, '學生短時流量限制不得誤顯示需等待 15 分鐘');
assert.match(
  route,
  /enabled: true, studentEmailLoginEnabled/,
  '學生信箱驗證與教師、開發者登入入口必須並存',
);
assert.match(
  route,
  /isStudent = user\?\.role === 'student'[\s\S]+?if \(!isStudent\) await rateLimit/,
  '學生密碼登入不得觸發 15 分鐘 IP 鎖定',
);
assert.match(
  route,
  /!isStudent && credential\.locked_until/,
  '既有的學生鎖定紀錄不得繼續阻擋登入',
);
assert.match(
  route,
  /locked = !isStudent && failures >= 5/,
  '學生密碼輸入錯誤後不得被鎖定 15 分鐘',
);
assert.match(client, /studentEmailLoginEnabled[\s\S]+?\/api\/auth\/request-code/, '畫面必須提供學校信箱驗證碼入口');
assert.match(client, /studentChallengeId[\s\S]+?\/api\/auth\/verify-code/, '學生驗證成功後必須直接註冊登入');

console.log('學生註冊與登入無 15 分鐘等待稽核完成：9 項規則全數通過。');
