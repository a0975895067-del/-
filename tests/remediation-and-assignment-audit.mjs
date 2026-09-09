import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

globalThis.window = globalThis;
const remediationSource = await readFile(new URL('../public/remediation-plan.js', import.meta.url), 'utf8');
Function(remediationSource)();

for (const grade of [7, 8, 9]) {
  assert.ok(MathRemediation.curricula[grade]?.length, `${grade} 年級必須有可派發單元。`);
}

const analysis = MathRemediation.analyze({
  unit: '平方根與畢氏定理',
  wrong: 2,
  hint: true,
  timeline: [
    { correct: false, selectedOption: '14' },
    { correct: false, selectedOption: '48' },
    { correct: true, selectedOption: '10' },
  ],
});
assert.deepEqual(analysis.wrongChoices, ['14', '48']);
assert.match(analysis.prerequisites, /平方/);
assert.ok(analysis.suggestedQuestions.length >= 3);
assert.equal(MathRemediation.prerequisiteUnit(8, '一元二次方程式'), '乘法公式與多項式');

const dashboard = await readFile(new URL('../public/secure-dashboard.js', import.meta.url), 'utf8');
const report = await readFile(new URL('../public/report.js', import.meta.url), 'utf8');
for (const mode of ['本單元加強', '先備知識診斷', '先備＋本單元綜合', '錯題再練']) {
  assert.match(dashboard, new RegExp(mode));
}
assert.match(dashboard, /學生曾選錯/);
assert.match(dashboard, /可能的學習卡點/);
assert.match(report, /曾選錯/);
assert.match(report, /建議先確認/);
assert.match(report, /建議練習/);

console.log('補救學習稽核完成：三個年級、錯答內容、觀念分析、PDF 建議及四種派題方式均已連結。');
