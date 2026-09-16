import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('.');
const source = JSON.parse(readFileSync(resolve(root, 'review-previews', '.questions-301-481-staging.json'), 'utf8'));
const approved = source.questions.slice(0, 960).map((question) => ({
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

const output = `(() => {\n  const questions = ${JSON.stringify(approved).replace(/</g, '\\u003c')};\n  const copy = (question) => ({ ...question, o: [...question.o] });\n  window.approvedReviewedBankStats = Object.freeze({ approvedTotal: ${approved.length}, reviewRange: '1-721', finalJsonCreated: false });\n  window.approvedReviewedQuestionsFor = (grade, unit, level) => questions\n    .filter((question) => question.grade === String(grade) && question.u === unit && question.l === level)\n    .map(copy);\n})();\n`;

writeFileSync(resolve(root, 'public', 'approved-reviewed-question-bank.js'), output, 'utf8');
console.log(`已建立網站用已確認題庫模組：${approved.length}題；未建立最終JSON。`);
