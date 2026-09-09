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
const game = await readFile(resolve(root, 'public', 'game.js'), 'utf8');

assert.equal(assetReferences.length, 8, 'All four seasonal backgrounds and four sprite assets must be referenced.');
assert.match(dashboard, /全站題目統整分析/);
assert.match(dashboard, /逐題統整/);
assert.match(dashboard, /一次答對率/);
assert.match(dashboard, /曾答錯率/);
assert.match(dashboard, /提示率/);
assert.match(dashboard, /isDeveloper\(\)\s*\?\s*'全站題目統整分析'\s*:\s*'班級題目統整分析'/, 'Developer and teacher analysis scopes must remain visibly distinct.');
assert.match(report, /level\s*:\s*String\(x\.level/);
assert.match(game, /math-question-shown/);
assert.match(game, /math-answer/);
assert.match(game, /math-hint/);
assert.match(game, /math-explanation/);
assert.match(report, /timeline\s*:\s*\(x\.timeline\s*\|\|\s*\[\]\)/, 'Detailed answer timeline must be included in encrypted report data.');
assert.match(report, /durationMs\s*:\s*Number\(x\.durationMs/, 'Per-question duration must be stored.');
assert.match(dashboard, /查看完整測驗與逐題作答歷程/);
assert.match(dashboard, /最後正確答案/);
assert.match(dashboard, /尚未記錄每次點選、選項與作答時間/);

console.log(`素材與題目分析稽核完成：${assetReferences.length} 個圖片素材皆存在，逐題作答歷程與統整欄位完整。`);
