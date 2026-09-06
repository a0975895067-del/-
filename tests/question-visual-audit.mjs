import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const elements = new Map();
const fakeElement = () => ({
  classList: { add() {}, remove() {}, toggle() {} },
  style: {},
  dataset: {},
  append() {},
  appendChild() {},
  insertAdjacentElement() {},
  replaceChildren() {},
  scrollIntoView() {},
  innerHTML: '',
  textContent: '',
  value: '',
  disabled: false,
});
const document = {
  head: fakeElement(),
  body: fakeElement(),
  createElement: fakeElement,
  querySelectorAll: () => [],
  querySelector(selector) {
    if (!elements.has(selector)) elements.set(selector, fakeElement());
    return elements.get(selector);
  },
};
const storage = new Map();
const context = {
  console,
  document,
  localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
  },
  Math,
  window: null,
};
context.window = context;
context.window.MathStudentAuth = { isVerified: true, currentKey: 'quality-audit' };

const source = fs.readFileSync(new URL('../public/game.js', import.meta.url), 'utf8');
vm.runInNewContext(`${source}\n;globalThis.auditApi={calcFallback,repairGeometryVisual,repairCoordinateVisual,sanitizeAnswerLeakingFigure};`, context);
const { calcFallback, repairGeometryVisual, repairCoordinateVisual, sanitizeAnswerLeakingFigure } = context.auditApi;

const units = ['坐標與線型函數', '函數及其圖形', '三角形的性質與尺規作圖', '平方根與畢氏定理', '平行與四邊形', '相似形與比例線段'];
const levels = ['easy', 'medium', 'hard'];
let checked = 0;
for (const unit of units) {
  for (let seed = 101; seed <= 136; seed++) {
    const stems = new Set();
    for (const level of levels) {
      let item = calcFallback(unit, level, seed);
      item = repairGeometryVisual(item, unit, level, seed);
      item = repairCoordinateVisual(item, unit, level, seed);
      item = sanitizeAnswerLeakingFigure(item, unit);
      assert.equal(item.o.length, 4, `${unit}/${level} 選項數錯誤`);
      assert.ok(item.a >= 0 && item.a < 4, `${unit}/${level} 正解索引錯誤`);
      assert.ok(item.t && item.h && item.e, `${unit}/${level} 題幹、提示或解析缺漏`);
      if (/座標|函數/.test(unit) && item.fig) assert.doesNotMatch(item.fig, />P\s*\([^<]+\)</, `${unit}/${level} 圖片直接標出 P 的坐標答案`);
      if (item.fig && !/座標|函數/.test(unit)) {
        const answer = String(item.o[item.a]).replace(/\s+/g, '');
        const labels = [...item.fig.matchAll(/<text\b[^>]*>(.*?)<\/text>/gis)].map(match => match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ''));
        const answerIsGivenCondition = item.t.replace(/\s+/g, '').includes(answer);
        assert.ok(answerIsGivenCondition || !labels.some(label => label === answer), `${unit}/${level} 圖片直接標出答案 ${answer}`);
      }
      stems.add(item.t);
      checked++;
    }
    assert.equal(stems.size, 3, `${unit} 的易、中、難題幹沒有區別`);
  }
}
console.log(`題目品質稽核完成：${checked} 組圖文、答案隱藏與難度差異檢查全數通過。`);
