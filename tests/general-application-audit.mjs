import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync(new URL('../app/api/[...path]/route.ts', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../public/local-access.js', import.meta.url), 'utf8');

assert.match(route, /if \(!\/\^\\S\+@\\S\+\\\.\\S\+\$\/\.test\(email\)/, '一般申請只需使用有效電子郵件');
assert.match(route, /\['學生', '教師'\]\.includes\(identity\)/, '後端只接受學生或教師申請');
assert.match(route, /textValue\(data\.workplace, 120, false\)/, '學校或學習單位必須允許留空');
assert.doesNotMatch(client, /applicationNote|申請說明/, '前台不得再要求填寫申請原因');
assert.match(client, /<option value="學生">學生<\/option><option value="教師">教師<\/option>/, '前台只能選擇學生或教師');
assert.doesNotMatch(client, /applicationWorkplace|學校或學習單位（選填）/, '首頁不得再顯示學校或學習單位輸入框');

console.log('學生／教師帳號申請稽核完成：身分限制、免填原因與後端驗證均通過。');
