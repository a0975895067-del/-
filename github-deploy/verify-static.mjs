import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'site');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(html, /^<!doctype html>\s*<html lang="zh-Hant">/i, '首頁文件結構不正確');
assert.doesNotMatch(html, /secure-auth\.js|secure-role-access\.js|api-config\.js/, '靜態版不應載入登入或後端程式');
assert.ok(fs.existsSync(path.join(root, 'privacy.html')), '靜態版必須提供隱私與資料說明');

const references = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|png))[^"#?]*[^"]*"/g)].map(match => match[1].split('?')[0]);
for (const reference of references) assert.ok(fs.existsSync(path.join(root, reference)), `缺少頁面資源：${reference}`);

for (const forbidden of ['secure-auth.js', 'secure-bootstrap.js', 'secure-role-access.js', 'api-config.js']) {
  assert.ok(!fs.existsSync(path.join(root, forbidden)), `GitHub 發布資料夾不應包含 ${forbidden}`);
}

function element() {
  return {
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    style: {}, append() {}, appendChild() {}, insertAdjacentElement() {}, setAttribute() {},
    querySelector() { return element(); }, innerHTML: '', textContent: '', value: '',
    disabled: false, onclick: null, dataset: {},
  };
}
const nodes = new Map();
const document = {
  body: element(), head: element(),
  querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, element()); return nodes.get(selector); },
  querySelectorAll() { return []; }, createElement() { return element(); },
};
const storage = {};
const context = {
  console, Math, document,
  localStorage: { getItem(key) { return storage[key] ?? null; }, setItem(key, value) { storage[key] = String(value); } },
  setTimeout, clearTimeout,
};
context.window = context;
context.MathStudentAuth = { currentKey: 'github-ci', isVerified: true };
vm.createContext(context);
for (const file of ['grade7-bank.js', 'grade7-diverse-bank.js', 'grade8-diverse-bank.js', 'grade9-diverse-bank.js', 'game.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}

const grades = {
  7: vm.runInContext('seventhUnits', context),
  8: vm.runInContext('eighthOfficialUnits', context),
  9: vm.runInContext('ninthOfficialUnits', context),
};
assert.equal(Object.values(grades).flat().length, 30, '單元總數必須是 30');

let sessions = 0;
let questions = 0;
for (const [grade, units] of Object.entries(grades)) {
  for (const unit of units) {
    for (const level of ['easy', 'medium', 'hard']) {
      for (const count of [10, 15, 20]) {
        vm.runInContext(`grade='${grade}';level='${level}'`, context);
        context.__unit = unit;
        context.__count = count;
        const items = vm.runInContext('generatedUnitSet(__unit,__count)', context);
        assert.equal(items.length, count, `${grade}/${unit}/${level} 題數不足`);
        const keys = items.map(item => [item.t, [...item.o].sort().join('|')].join('§'));
        assert.equal(new Set(keys).size, count, `${grade}/${unit}/${level} 同次有重複題目`);
        for (const item of items) {
          assert.equal(item.o.length, 4, `${grade}/${unit}/${level} 不是四選一`);
          assert.ok(item.a >= 0 && item.a < 4, `${grade}/${unit}/${level} 正確答案索引無效`);
          assert.ok(item.h && item.e, `${grade}/${unit}/${level} 缺少提示或解析`);
        }
        sessions += 1;
        questions += items.length;
      }
    }
  }
}

let cooldownSessions = 0;
for (const key of Object.keys(storage)) delete storage[key];
for (const [grade, units] of Object.entries(grades)) {
  for (const unit of units) {
    for (const level of ['easy', 'medium', 'hard']) {
      for (const count of [10, 15, 20]) {
        const previous = new Set();
        for (let run = 1; run <= 5; run += 1) {
          vm.runInContext(`grade='${grade}';level='${level}'`, context);
          context.__unit = unit;
          context.__count = count;
          const items = vm.runInContext('generatedUnitSet(__unit,__count)', context);
          const keys = items.map(item => vm.runInContext('normalizedQuestionKey', context)(item));
          assert.equal(items.length, count, `${grade}/${unit}/${level}/${count}/第${run}次 題數不足`);
          assert.equal(new Set(keys).size, count, `${grade}/${unit}/${level}/${count}/第${run}次 有重複題目`);
          assert.ok(keys.every(key => !previous.has(key)), `${grade}/${unit}/${level}/${count}/第${run}次 重複最近五次題目`);
          keys.forEach(key => previous.add(key));
          cooldownSessions += 1;
        }
      }
    }
  }
}

for (const file of fs.readdirSync(root).filter(name => name.endsWith('.js'))) {
  new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
}

console.log(`PASS: GitHub 靜態版 ${sessions} 組、${questions} 題基本檢查；另完成 ${cooldownSessions} 組最近五次不重複檢查。資源、提示解析與 JavaScript 語法均通過。`);
