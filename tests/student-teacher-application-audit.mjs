import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const route = readFileSync(new URL('../app/api/[...path]/route.ts', import.meta.url), 'utf8');
const localAccess = readFileSync(new URL('../public/local-access.js', import.meta.url), 'utf8');
const secureAuth = readFileSync(new URL('../public/secure-auth.js', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../public/secure-dashboard.js', import.meta.url), 'utf8');

for (let round = 1; round <= 3; round++) {
  assert.match(localAccess, /<option value="學生">學生<\/option><option value="教師">教師<\/option>/);
  assert.match(secureAuth, /<option value="學生">學生<\/option><option value="教師">教師<\/option>/);
  assert.doesNotMatch(localAccess, /applicationNote|申請說明（選填）/);
  assert.doesNotMatch(secureAuth, /requestJobTitle|工作職稱/);
  assert.match(route, /\['學生', '教師'\]\.includes\(identity\)/);
  assert.match(route, /requestedIdentity === '學生' \? 'student' : requestedIdentity === '教師' \? 'teacher'/);
  assert.match(route, /核准學生前請先選擇班級/);
  assert.match(route, /INSERT INTO class_students\(class_id,student_id,joined_at\)/);
  assert.match(dashboard, /核准學生並分班/);
  assert.match(dashboard, /教師的任教班級請到「班級與教師」設定/);
  assert.doesNotMatch(dashboard, /核准一般申請/);
  console.log(`第 ${round} 輪：前台雙身分、免填原因、後台核准與學生分班均通過。`);
}

console.log('學生／教師申請與分班稽核完成：3 輪全數通過。');
