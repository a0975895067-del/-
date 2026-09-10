import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const bankSource = readFileSync(new URL('../public/imported-question-bank-20-23.js', import.meta.url), 'utf8');
const gameSource = readFileSync(new URL('../public/game.js', import.meta.url), 'utf8');
const appHtml = readFileSync(new URL('../public/app.html', import.meta.url), 'utf8');
const context = { window: {} };
vm.runInNewContext(bankSource, context);

const stats = context.window.importedBulkBankStats;
assert.equal(stats.sourceTotal, 1135);
assert.equal(stats.activeTotal, 621);
assert.equal(stats.quarantinedTotal, 514);
assert.equal(stats.rejected.imageMissing, 413);
assert.equal(stats.rejected.options, 101);

const units = {
  7: ['整數四則運算', '指數記法與科學記號', '因數與倍數', '一元一次不等式', '二元一次聯立方程式', '比例與比值'],
  8: ['乘法公式與多項式', '平方根與畢氏定理', '一元二次方程式', '數列與等差數列', '函數及其圖形', '三角形的性質與尺規作圖', '平行與四邊形'],
  9: ['圓與圓周角', '幾何推理與證明', '二次函數'],
  review: ['數與量總複習', '代數總複習', '坐標與函數總複習', '幾何總複習', '閱讀素養綜合'],
};

for (let round = 1; round <= 3; round++) {
  let checked = 0;
  for (const [grade, names] of Object.entries(units)) for (const unit of names) for (const level of ['easy', 'medium', 'hard']) {
    const questions = context.window.importedBulkQuestionsFor(grade, unit, level);
    const keys = new Set();
    for (const question of questions) {
      assert.equal(question.u, unit);
      assert.equal(question.l, level);
      assert.equal(question.o.length, 4);
      assert.equal(new Set(question.o).size, 4);
      assert.ok(question.o.every((option) => String(option).trim()));
      assert.ok(Number.isInteger(question.a) && question.a >= 0 && question.a < 4);
      assert.equal(question.fig, '');
      assert.equal(question.requiresFigure, false);
      assert.doesNotMatch(question.t, /如[右左下上]?[圖表]|附圖|圖中|下圖|右圖|左圖|圓餅圖|長條圖|折線圖/);
      const key = `${question.t}|${[...question.o].sort().join('|')}`;
      assert.ok(!keys.has(key), '同單元同難度不得有完全相同題目與選項');
      keys.add(key);
      checked++;
    }
  }
  assert.equal(checked, 958, '337 題依年級使用，621 題亦可依領域進入跨冊複習');
  console.log(`第 ${round} 輪：${stats.activeTotal} 題可用題目之題幹、選項、答案、圖文條件與重複性檢查通過。`);
}

assert.match(gameSource, /window\.importedBulkQuestionsFor\?window\.importedBulkQuestionsFor\(grade,name,level\)/);
assert.match(gameSource, /candidate\.requiresFigure!==false/);
assert.match(gameSource, /二元一次聯立方程式/);
assert.match(appHtml, /imported-question-bank-20-23\.js\?v=20260910-1135-safe/);
assert.ok(appHtml.indexOf('imported-question-bank-20-23.js') < appHtml.indexOf('game.js'));
console.log('1,135 題匯入稽核完成：621 題啟用，514 題因缺圖或選項不完整而安全隔離。');
