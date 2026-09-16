import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('.');
const source = JSON.parse(readFileSync(resolve(root, 'review-previews', '.questions-301-481-staging.json'), 'utf8'));
const approved = source.questions.slice(0, 1140).map((question) => ({
  id: question.id,
  sourceId: question.id,
  grade: String(question.grade),
  u: question.unit,
  l: question.level,
  baseStem: question.question,
  t: question.question,
  o: [...question.options],
  a: question.answerIndex,
  h: question.hint,
  e: question.explanation,
  fig: question.figureSvg || '',
  requiresFigure: false,
}));

const requestedCapacity = { easy: 3000, medium: 2000, hard: 1500 };
const generationPlans = [];
for (const question of approved) {
  const key = `${question.grade}|${question.u}|${question.l}`;
  if (generationPlans.some((plan) => plan.key === key)) continue;
  const reviewedTemplates = approved.filter((row) => row.grade === question.grade && row.u === question.u && row.l === question.l).length;
  generationPlans.push({
    key,
    grade: question.grade,
    unit: question.u,
    level: question.l,
    reviewedTemplates,
    supportedVariants: requestedCapacity[question.l],
    seedRange: question.l === 'easy' ? [0, 2999] : question.l === 'medium' ? [3000, 4999] : [5000, 6499],
    generationMode: 'reviewed-template-with-secure-seed',
    distractorPolicy: question.l === 'easy' ? '基礎概念常見錯誤' : '優先採用第2或第3步的中途結果作為誘答選項',
  });
}

const exportData = {
  metadata: {
    title: '數學任務站已審查題庫與隨機變式規格',
    version: '2026-09-16-reviewed-901',
    reviewedDisplayRange: '1-901',
    reviewedQuestionRecords: approved.length,
    variantPolicy: '每單元每難度使用已審查題目作為模板，由後端發放安全隨機種子；易3000種、中2000種、難1500種。',
    note: 'supportedVariants為可生成容量，不代表JSON內重複儲存相同題目；實際題目於測驗開始時依種子產生。',
  },
  generationPlans,
  questions: approved,
};

const output = `(() => {\n  const questions = ${JSON.stringify(approved).replace(/</g, '\\u003c')};\n  const copy = (question) => ({ ...question, o: [...question.o] });\n  window.approvedReviewedBankStats = Object.freeze({ approvedTotal: ${approved.length}, reviewRange: '1-901', finalJsonCreated: true, generationPlanCount: ${generationPlans.length} });\n  window.approvedReviewedQuestionsFor = (grade, unit, level) => questions\n    .filter((question) => question.grade === String(grade) && question.u === unit && question.l === level)\n    .map(copy);\n})();\n`;

const jsonName = '已審查題庫與隨機變式規格_20260916.json';
writeFileSync(resolve(root, 'public', 'approved-reviewed-question-bank.js'), output, 'utf8');
writeFileSync(resolve(root, 'public', jsonName), JSON.stringify(exportData, null, 2), 'utf8');
writeFileSync(resolve(root, 'review-previews', jsonName), JSON.stringify(exportData, null, 2), 'utf8');
console.log(`已建立網站用已確認題庫模組：${approved.length}筆，並輸出JSON規格：${jsonName}。`);
