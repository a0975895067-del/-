import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

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
const elements = new Map();
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
context.window.MathStudentAuth = { isVerified: true, currentKey: 'json-bank-audit' };

for (const file of ['grade7-bank.js', 'grade7-diverse-bank.js', 'grade7-json-bank.js']) {
  vm.runInNewContext(fs.readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8'), context);
}
const gameSource = fs.readFileSync(new URL('../public/game.js', import.meta.url), 'utf8');
vm.runInNewContext(
  `${gameSource}\n;globalThis.auditApi={setConfig:(g,l)=>{grade=g;level=l},generatedUnitSet,normalizedStemKey,normalizedOptionKey,arrangeWithoutConsecutiveOptions};`,
  context,
);

assert.equal(context.grade7JsonBank.length, 20, 'JSON 題庫應完整匯入 20 題');
assert.equal(new Set(context.grade7JsonBank.map(item => item.id)).size, 20, 'JSON 題目 ID 不得重複');
assert.ok(context.grade7JsonBank.every(item => item.l === 'easy'), '不得把來源易題誤標為中題或難題');
assert.ok(context.grade7JsonBank.every(item => item.o.length === 4 && item.a >= 0 && item.a < 4), '每題需有四個選項及有效答案');

const { setConfig, generatedUnitSet, normalizedStemKey, normalizedOptionKey, arrangeWithoutConsecutiveOptions } = context.auditApi;
setConfig('7', 'easy');
const units = ['數與數線', '整數四則運算', '指數記法與科學記號'];
const counts = [10, 15, 20];
let checked = 0;
for (const unit of units) {
  let sawImported = false;
  for (const count of counts) {
    for (let run = 0; run < 3; run++) {
      const session = arrangeWithoutConsecutiveOptions(generatedUnitSet(unit, count));
      assert.equal(session.length, count, `${unit}/${count} 題/第 ${run + 1} 次抽題數量不足`);
      assert.equal(new Set(session.map(normalizedStemKey)).size, count, `${unit}/${count} 題/第 ${run + 1} 次出現重複題幹`);
      for (let index = 1; index < session.length; index++) {
        assert.notEqual(
          normalizedOptionKey(session[index - 1]),
          normalizedOptionKey(session[index]),
          `${unit}/${count} 題/第 ${run + 1} 次出現連續相同選項組合`,
        );
      }
      sawImported ||= session.some(item => String(item.sourceId || '').startsWith('MATH-01-'));
      checked += session.length;
    }
  }
  assert.ok(sawImported, `${unit} 未抽到新匯入的 JSON 題目`);
}

console.log(`JSON 題庫與抽題稽核完成：20 題完整匯入；${checked} 題次無重複題幹或連續相同選項。`);
