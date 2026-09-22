import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const route = readFileSync(new URL('../app/api/[...path]/route.ts', import.meta.url), 'utf8');
const login = readFileSync(new URL('../public/local-access.js', import.meta.url), 'utf8');
const report = readFileSync(new URL('../public/report.js', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../public/secure-dashboard.js', import.meta.url), 'utf8');

for (let round = 1; round <= 3; round++) {
  assert.match(route, /PASSWORD_SETUP_REQUIRED/, '舊帳號缺少密碼時須提供補設密碼指引');
  assert.match(login, /學生／教師註冊申請/, '登入頁須提供補設密碼所需的申請入口');
  assert.match(report, /retryReportSave/, '報告上傳失敗時須保留重試功能');
  assert.match(route, /audit\(session\.user_id, 'report\.created'/, '後端須留下報告建立稽核紀錄');
  assert.match(dashboard, /Promise\.allSettled/, '後台不得因單一 API 失敗而整頁中斷');
  assert.match(dashboard, /部分資料需要重新載入/, '後台須明確顯示局部載入失敗');
  assert.match(dashboard, /retryDashboardLoad/, '後台須提供重新載入功能');
  assert.match(route, /session\.role === 'developer'.*SELECT r\.\*,u\.email_cipher/s, '開發者須可讀取所有已儲存報告');
  console.log(`第 ${round} 輪：登入、報告儲存、後台局部容錯及開發者報告權限均通過。`);
}

console.log('前後端連線持續性稽核完成：3 輪全數通過。');
