import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync(new URL('../app/api/[...path]/route.ts', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../public/local-access.js', import.meta.url), 'utf8');

assert.match(route, /if \(!\/\^\\S\+@\\S\+\\\.\\S\+\$\/\.test\(email\)/, '一般申請只需使用有效電子郵件');
assert.match(route, /textValue\(data\.workplace, 120, false\)/, '學校或學習單位必須允許留空');
assert.match(route, /textValue\(data\.jobTitle, 120, false\)/, '申請說明必須允許留空');
assert.match(client, /不限學校、地區或身分/, '畫面必須明確說明一般人可申請');
assert.match(client, /<option value="一般使用者">一般使用者<\/option>/, '一般使用者應為預設身分');
assert.match(client, /學校或學習單位（選填）/, '選填欄位應清楚標示');

console.log('一般使用者申請稽核完成：6 項規則全數通過。');
