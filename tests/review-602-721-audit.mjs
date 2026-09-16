import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const bank = JSON.parse(readFileSync(resolve('review-previews', '.questions-301-481-staging.json'), 'utf8'));
const questions = bank.questions.slice(840, 960);
const hashes = bank.metadata?.review602to721?.originalFigureHashes ?? {};
const hash = value => createHash('sha256').update(String(value ?? '')).digest('hex');
const approvedHash = bank.metadata?.review602to721?.approved602to684Hash;

assert.equal(questions.length, 120, '題數必須是120');
assert.deepEqual(
  Object.fromEntries(['easy','medium','hard'].map(level => [level, questions.filter(q => q.level === level).length])),
  { easy: 40, medium: 40, hard: 40 },
  '易、中、難各需40題'
);
assert.equal(new Set(questions.map(q => q.question)).size, 120, '題幹不可完全重複');
assert.equal(
  hash(JSON.stringify(bank.questions.slice(840, 923))),
  approvedHash,
  '教師已確認的第602～684題不得變動'
);

for (const q of questions) {
  assert.equal(hash(q.figureSvg), hashes[q.id], `${q.id} 圖片被改動`);
  assert.equal(q.options.length, 4, `${q.id} 選項不是4個`);
  assert.equal(new Set(q.options.map(x => String(x).trim())).size, 4, `${q.id} 選項重複`);
  assert.ok(q.options.every(x => String(x).trim() && !/undefined|NaN/.test(String(x))), `${q.id} 有空白或無效選項`);
  assert.ok(Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < 4, `${q.id} 答案索引錯誤`);
  const combined = [q.question, ...q.options, q.hint, q.explanation].join(' ');
  const visibleQuestionAndOptions = [q.question, ...q.options].join(' ');
  assert.ok(!/√\([0-9]+\)|sqrt|radical/i.test(visibleQuestionAndOptions), `${q.id} 題幹或選項仍使用舊根號寫法`);
  assert.ok(q.options.every(option => !/根號|sqrt|radical/i.test(String(option))), `${q.id} 選項未直接使用標準√符號`);
  assert.ok(!/(^|[^0-9])0x(?:²)?/.test(combined), `${q.id} 出現不應書寫的零係數未知數項`);
}

const radicalOptions = questions.flatMap(q => q.options).filter(option => String(option).includes('√'));
assert.ok(radicalOptions.length >= 20, '根號選項數量異常');
assert.ok(radicalOptions.every(option => [...String(option)].some(char => char.codePointAt(0) === 0x221A)), '選項使用了非Unicode U+221A的替代根號');
const radicalQuestions = questions.filter(q => q.question.includes('√'));
assert.ok(radicalQuestions.length >= 10, '根號題幹數量異常');
assert.ok(radicalQuestions.every(q => [...q.question].some(char => char.codePointAt(0) === 0x221A)), '題幹使用了非Unicode U+221A的替代根號');

const question631 = bank.questions[869];
assert.ok(question631.options.every(option => /^\d+$/.test(option)), '第631題選項必須全部是最終數值');
assert.equal(question631.options[question631.answerIndex], '2704', '第631題正確答案應為2704');

const pythagoreanHigher = bank.questions.slice(920, 960);
assert.ok(pythagoreanHigher.every(q => !/請分別完成|完成甲、乙、丙/.test(q.question)), '畢氏定理中難題仍有拼接式題幹');
assert.ok(pythagoreanHigher.filter(q => /坐標|面積|高|路徑|對角線|周長|平方|直線|步道|邊框|未知|標示/.test(q.question)).length >= 36, '畢氏定理中難題的推理類型不夠多元');

const revised685to721 = bank.questions.slice(923, 960);
assert.equal(revised685to721.filter(q => q.level === 'medium').length, 17, '第685～701題應為17題中等題');
assert.equal(revised685to721.filter(q => q.level === 'hard').length, 20, '第702～721題應為20題困難題');
assert.ok(revised685to721.every(q => !/放大|相似|等比例/.test(q.question)), '第685～721題仍有直接按比例放大的題型');
const expectedAnswers685to721 = [
  '82','10√2－12','72','2√2','139','25－√313','18','102','甲、丙','109','12','2','65','120/17','28','－1','96',
  '2','34－√185','91','117','19/30','12.25','－24','169/60','60','19√3','26－5√10','25＋5√13','26－2√61','1853','1440','25/144','2√66－15','337','12＋8√2','2'
];
assert.deepEqual(
  revised685to721.map(q => q.options[q.answerIndex]),
  expectedAnswers685to721,
  '第685～721題答案鍵與數學驗算結果不一致'
);

const figureNumberLabels = q => [...String(q.figureSvg).matchAll(/<text[^>]*>(\?|[0-9]+)<\/text>/g)].map(match => match[1]);
const expectedFigureLabels = new Map([
  [685, ['7', '?', '25', '9', '12', '?']],
  [695, ['5', '?', '13', '8', '15', '?']],
  [705, ['8', '?', '17']],
  [713, ['6', '8', '?', '8', '?', '17']],
  [716, ['9', '12', '?', '7', '?', '25']]
]);
for (const [displayNumber, labels] of expectedFigureLabels) {
  assert.deepEqual(figureNumberLabels(bank.questions[displayNumber + 238]), labels, `第${displayNumber}題圖片數值未正確更新`);
}
assert.ok(bank.questions[689 + 238].options.includes('13'), '第689題必須包含13作為誘答選項');

const figureDependentNumbers = [685,689,694,695,703,706,709,710,713,715,716,717,719,720];
for (const displayNumber of figureDependentNumbers) {
  const q = bank.questions[displayNumber + 238];
  assert.ok(q.figureSvg, `第${displayNumber}題必須保留題目圖形`);
  assert.ok(!/3、4、5|5、12、13|斜邊為5|斜邊為13|兩股為5、12|兩股為3、4/.test(q.question), `第${displayNumber}題題幹直接說出圖中未知邊`);
}

for (const q of questions.filter(q => q.level !== 'easy')) {
  assert.ok(!/請分別完成甲、乙|完成甲、乙、丙|答案配對/.test(q.question), `${q.id} 仍是基礎題拼接`);
  assert.ok(String(q.hint).length >= 8 && String(q.explanation).length >= 12, `${q.id} 缺少推理引導或解析`);
}

for (const q of questions.filter(q => q.level === 'medium')) {
  assert.equal(q.difficultyDesign.steps, '2至3步', `${q.id} 中等題步驟標示錯誤`);
  assert.match(q.difficultyDesign.description, /獨立情境|連結兩個概念/, `${q.id} 中等題設計說明不足`);
}
for (const q of questions.filter(q => q.level === 'hard')) {
  assert.equal(q.difficultyDesign.steps, '3步以上', `${q.id} 困難題步驟標示錯誤`);
  assert.match(q.difficultyDesign.description, /反推|檢核|條件/, `${q.id} 困難題設計說明不足`);
}

const normalized = questions.filter(q => q.level !== 'easy').map(q => q.question
  .replace(/[0-9０-９]+(?:\/[0-9０-９]+)?/g, '#')
  .replace(/[a-zA-Z]/g, 'v')
  .replace(/√\([^)]*\)/g, '√(#)'));
const frequencies = new Map();
for (const stem of normalized) frequencies.set(stem, (frequencies.get(stem) ?? 0) + 1);
assert.ok(Math.max(...frequencies.values()) <= 2, '去除數字後仍有超過2題同模板');

console.log('PASS 第602～721題：120題、三難度均衡、80題中難題非拼接、選項有效、根號清楚、圖片雜湊完全不變。');
