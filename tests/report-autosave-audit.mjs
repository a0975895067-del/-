import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [game, report, backend, app] = await Promise.all([
  readFile(new URL('../public/game.js', import.meta.url), 'utf8'),
  readFile(new URL('../public/report.js', import.meta.url), 'utf8'),
  readFile(new URL('../app/api/[...path]/route.ts', import.meta.url), 'utf8'),
  readFile(new URL('../public/app.html', import.meta.url), 'utf8'),
]);

assert.match(game, /完成測驗並查看報告/);
assert.match(game, /idx===session\.length-1\)document\.dispatchEvent\(new CustomEvent\('math-test-finished'/);
assert.match(report, /addEventListener\('math-test-finished'/);
assert.match(report, /登入狀態已失效/);
assert.match(backend, /audit\(session\.user_id, 'report\.created'/);
assert.match(app, /game\.js\?v=20260920-report-autosave/);
assert.match(app, /report\.js\?v=20260920-report-autosave/);

console.log('report-autosave-audit: ok');
