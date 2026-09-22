import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dashboard = readFileSync(new URL('../public/secure-dashboard.js', import.meta.url), 'utf8');
const route = readFileSync(new URL('../app/api/[...path]/route.ts', import.meta.url), 'utf8');
const html = readFileSync(new URL('../public/teacher-dashboard.html', import.meta.url), 'utf8');

for (let round = 1; round <= 3; round++) {
  assert.match(route, /session\.role === 'developer'.*SELECT r\.\*,u\.email_cipher/s, '開發者報告查詢必須直接涵蓋全部報告');
  assert.match(route, /FROM reports r LEFT JOIN users u ON u\.id=r\.student_id/, '開發者查詢必須保留失去帳號連結的舊報告');
  assert.match(route, /COALESCE\(u\.role,'legacy_unassigned'\) AS student_role/, '舊報告必須有明確的角色標示');
  assert.match(route, /COALESCE\(\(SELECT GROUP_CONCAT\(c\.code,[\s\S]*?\),'\'\) AS class_codes/, '未分班報告必須以空班級回傳而非被排除');
  assert.match(dashboard, /全體使用者完整檢測報告/);
  assert.match(dashboard, /roleOptions = \[\.\.\.new Set\(\[/, '角色選項必須由完整角色清單、帳號及報告共同建立');
  assert.match(dashboard, /state\.classes\.map\(\(row\) => row\.code\)/, '班級選項必須包含沒有報告的班級');
  assert.match(dashboard, /所有角色與班級的報告涵蓋狀態/);
  assert.match(dashboard, /尚無已完成並成功上傳的報告/);
  assert.match(dashboard, /角色與分班歸類統計/);
  assert.match(dashboard, /查看完整測驗與逐題作答歷程/);
  assert.match(dashboard, /修正此人的信箱、角色或分班/);
  assert.match(route, /path === '\/api\/admin\/legacy-data'/, '必須有開發者專用的舊資料檢查端點');
  assert.match(route, /authenticate\(request, \['developer'\]\)/, '舊資料端點必須限制開發者');
  assert.match(dashboard, /未分班與舊資料檢查/);
  assert.match(dashboard, /舊版未連結報告/);
  assert.match(dashboard, /已核准但尚未建立登入帳號/);
  assert.match(html, /id="legacy"/);
  assert.match(html, /secure-dashboard\.js\?v=20260922-continuity/);
  console.log(`第 ${round} 輪：全角色、全班級、未分班、完整內容、歸類分析與資料修改入口均存在。`);
}

console.log('開發者全體報告稽核完成：3 輪全數通過。');
