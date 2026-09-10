import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync(new URL('../app/api/[...path]/route.ts', import.meta.url), 'utf8');
const dashboard = fs.readFileSync(new URL('../public/secure-dashboard.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../public/teacher-dashboard.html', import.meta.url), 'utf8');

assert.match(route, /method === 'PATCH' && userAccount/, '缺少帳號修改端點');
assert.match(route, /authenticate\(request, \['developer'\]\)/, '帳號修改必須限制開發者');
assert.match(route, /requireCsrf\(request, session\)/, '帳號修改必須驗證 CSRF');
assert.match(route, /target\.role === 'developer'/, '不得透過帳號管理修改開發者');
assert.match(route, /email_lookup=\? AND id<>\?/, '更正信箱必須檢查重複帳號');
assert.match(route, /DELETE FROM sessions WHERE user_id=\?/, '修改帳號後必須撤銷該使用者工作階段');
assert.match(route, /DELETE FROM class_students WHERE student_id=\?/, '重新分班前必須移除舊班級關聯');
assert.match(route, /INSERT INTO class_students\(class_id,student_id,joined_at\)/, '學生分班必須由後端寫入');
assert.match(route, /student_role/, '開發者報告必須回傳報告持有人角色');
assert.match(route, /COALESCE\(\(SELECT GROUP_CONCAT\(c\.code/, '開發者報告必須包含未分班判斷資料');

assert.match(dashboard, /data-account-editor/, '後台缺少帳號編輯表單');
assert.match(dashboard, /更正電子郵件/, '後台缺少信箱更正欄位');
assert.match(dashboard, /name="role"/, '後台缺少角色選擇');
assert.match(dashboard, /name="classId"/, '後台缺少分班選擇');
assert.match(dashboard, /未分班/, '後台必須清楚顯示未分班狀態');
assert.match(dashboard, /報告不會因尚未分班而隱藏/, '後台必須說明未分班報告仍可查看');
assert.match(html, /secure-dashboard\.js\?v=20260910-all-reports/, '後台快取版本未更新');

console.log('帳號管理稽核完成：角色、分班、未分班報告與信箱更正均具開發者後端權限保護。');
