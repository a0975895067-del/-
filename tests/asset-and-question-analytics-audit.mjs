import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['public/app.html', 'public/數學任務站.html', 'public/world-background.css', 'public/animal-motion.js'];
const sources = await Promise.all(files.map(file => readFile(resolve(root, file), 'utf8')));
const assetReferences = [...new Set(sources.flatMap(source => [...source.matchAll(/assets\/([A-Za-z0-9._-]+)/g)].map(match => match[1])))];

for (const asset of assetReferences) await access(resolve(root, 'public', 'assets', asset));

const dashboard = await readFile(resolve(root, 'public', 'secure-dashboard.js'), 'utf8');
const report = await readFile(resolve(root, 'public', 'report.js'), 'utf8');

assert.equal(assetReferences.length, 8, 'All four seasonal backgrounds and four sprite assets must be referenced.');
assert.match(dashboard, /全站題目統整分析/);
assert.match(dashboard, /逐題統整/);
assert.match(dashboard, /一次答對率/);
assert.match(dashboard, /曾答錯率/);
assert.match(dashboard, /提示率/);
assert.match(dashboard, /isDeveloper\(\)\?'全站題目統整分析':'班級題目統整分析'/, 'Developer and teacher analysis scopes must remain visibly distinct.');
assert.match(report, /level:String\(x\.level/);

console.log(`素材與題目分析稽核完成：${assetReferences.length} 個圖片素材皆存在，題目統整欄位完整。`);
