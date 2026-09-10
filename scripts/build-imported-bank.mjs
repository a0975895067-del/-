import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const input = process.argv[2];
if (!input) throw new Error('請提供題庫 JSON 路徑。');
const source = JSON.parse(readFileSync(resolve(input), 'utf8'));
const sourceRows = Array.isArray(source) ? source : source.questions;
if (!Array.isArray(sourceRows)) throw new Error('找不到 questions 陣列。');

const levelMap = { 易: 'easy', 中: 'medium', 難: 'hard' };
const reviewUnitByTarget = {
  '數與數線': '數與量總複習', '整數四則運算': '數與量總複習', '指數記法與科學記號': '數與量總複習', '因數與倍數': '數與量總複習',
  '一元一次不等式': '代數總複習', '二元一次聯立方程式': '代數總複習', '一元二次方程式': '代數總複習', '乘法公式與多項式': '代數總複習', '因式分解': '代數總複習', '二次函數': '代數總複習',
  '比例與比值': '坐標與函數總複習', '函數及其圖形': '坐標與函數總複習',
  '平方根與畢氏定理': '幾何總複習', '三角形的性質與尺規作圖': '幾何總複習', '平行與四邊形': '幾何總複習', '圓與圓周角': '幾何總複習', '幾何推理與證明': '幾何總複習',
  '統計資料處理圖表': '統計與機率總複習', '資料分析與機率': '統計與機率總複習',
};

const clean = (value) => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/\s+/g, ' ').trim();
const parseOptionText = (value) => {
  const out = [];
  for (const match of clean(value).matchAll(/\([A-D]\)\s*(.*?)(?=\s*\([A-D]\)|$)/g)) out.push(clean(match[1]));
  return out.length === 4 ? out : [];
};
const optionsFor = (row) => {
  if (row.rewrite_status === 'completed') {
    const rewritten = parseOptionText(row.rewritten_options_text);
    if (rewritten.length === 4) return rewritten;
  }
  const sourceOptions = row.rewritten_options || row.original_options || {};
  return Array.isArray(sourceOptions) ? sourceOptions.map(clean) : ['A', 'B', 'C', 'D'].map((key) => clean(sourceOptions[key]));
};
const stemFor = (row) => clean(row.rewrite_status === 'completed' && row.rewritten_question ? row.rewritten_question : row.original_question)
  .replace(/\s*[（(]A[)）][\s\S]*$/i, '').trim();
const targetFor = (row, stem) => {
  switch (row.unit) {
    case '分數與數的運算': return ['7', '整數四則運算'];
    case '因數與倍數': return ['7', '因數與倍數'];
    case '指數與科學記號': return ['7', '指數記法與科學記號'];
    case '一元一次不等式': return ['7', '一元一次不等式'];
    case '聯立方程式': return ['7', '二元一次聯立方程式'];
    case '比例與函數': return /坐標|座標|函數|斜率|直線/.test(stem) ? ['8', '函數及其圖形'] : ['7', '比例與比值'];
    case '根式與畢氏定理': return ['8', '平方根與畢氏定理'];
    case '一元二次方程式': return ['8', '一元二次方程式'];
    case '等差數列與級數': return ['8', '數列與等差數列'];
    case '統計與資料分析': return ['8', '統計資料處理圖表'];
    case '多項式與因式分解': return /因式|分解|公因式/.test(stem) ? ['8', '因式分解'] : ['8', '乘法公式與多項式'];
    case '二次函數': return ['9', '二次函數'];
    case '圓': return ['9', '圓與圓周角'];
    case '幾何與證明':
      if (/平行四邊形|梯形|菱形|矩形|正方形|四邊形|平行線/.test(stem)) return ['8', '平行與四邊形'];
      if (/三角形|全等|尺規|角平分線|中垂線/.test(stem)) return ['8', '三角形的性質與尺規作圖'];
      return ['9', '幾何推理與證明'];
    case '綜合應用題': return ['review', '閱讀素養綜合'];
    default: return null;
  }
};
const hints = {
  '整數四則運算': '先確認正負號與運算順序，再逐步約分或通分。', '因數與倍數': '先列出因數或倍數，再找共同條件。', '指數記法與科學記號': '先確認底數與指數規則，再處理小數點位置。',
  '一元一次不等式': '移項後要留意乘除負數時不等號方向改變。', '二元一次聯立方程式': '選擇代入法或加減消去法，先消去一個未知數。', '比例與比值': '把對應量放在相同位置，再建立等比例關係。',
  '平方根與畢氏定理': '先確認直角與斜邊，再使用平方和關係。', '一元二次方程式': '先整理成等於 0，再判斷因式分解或公式解。', '數列與等差數列': '先找首項、公差與項數之間的關係。',
  '統計資料處理圖表': '先讀清楚資料總數與題目要求的統計量。', '乘法公式與多項式': '先辨認同類項與乘法公式，再依次展開。', '因式分解': '先找公因式，再檢查平方差或十字交乘。',
  '函數及其圖形': '先整理自變數與應變數的對應，再代入或讀圖。', '二次函數': '先確認開口方向、頂點與對稱軸，再判讀圖形。', '圓與圓周角': '先標出圓心、半徑、弦與所對弧，再使用角度關係。',
  '三角形的性質與尺規作圖': '先標記已知邊角與對應關係，再選擇合適性質。', '平行與四邊形': '先找平行線角度關係與四邊形的邊角性質。', '幾何推理與證明': '把已知條件逐項標記，再串連可用的幾何性質。',
  '閱讀素養綜合': '先圈出問題、條件與單位，再把文字轉成算式。',
};

const rejected = { imageMissing: 0, figureCue: 0, stem: 0, options: 0, answer: 0, difficulty: 0, unmapped: 0, duplicate: 0 };
const seen = new Set(), accepted = [];
for (const row of sourceRows) {
  const stem = stemFor(row), options = optionsFor(row), answerLetter = clean(row.correct_answer).toUpperCase(), level = levelMap[row.difficulty], target = targetFor(row, stem);
  if (row.has_image_or_chart) { rejected.imageMissing++; continue; }
  if (/如[右左下上]?[圖表]|附圖|圖中|下圖|右圖|左圖|圓餅圖|長條圖|折線圖/.test(stem)) { rejected.figureCue++; continue; }
  if (stem.length < 6) { rejected.stem++; continue; }
  if (options.length !== 4 || options.some((value) => !value) || new Set(options).size !== 4) { rejected.options++; continue; }
  if (!/^[ABCD]$/.test(answerLetter)) { rejected.answer++; continue; }
  if (!level) { rejected.difficulty++; continue; }
  if (!target) { rejected.unmapped++; continue; }
  const answerIndex = answerLetter.charCodeAt(0) - 65,
    key = `${target.join('|')}|${level}|${stem.replace(/\s+/g, '')}|${[...options].sort().join('|')}`;
  if (seen.has(key)) { rejected.duplicate++; continue; }
  seen.add(key);
  const explanation = clean(row.verification_note || row.original_explanation) || `依題目條件逐步計算，可得到 ${options[answerIndex]}。`;
  accepted.push({ id: clean(row.id), sourceId: clean(row.id), grade: target[0], u: target[1], reviewUnit: reviewUnitByTarget[target[1]] || (target[0] === 'review' ? target[1] : ''), l: level, baseStem: stem, t: stem, o: options, a: answerIndex, h: hints[target[1]] || '先整理已知條件、未知量與單位，再選擇適合的數學關係。', e: explanation, fig: '', requiresFigure: false });
}

const stats = { sourceTotal: sourceRows.length, activeTotal: accepted.length, quarantinedTotal: sourceRows.length - accepted.length, rejected };
const output = `(() => {\n  const questions = ${JSON.stringify(accepted)};\n  const copy = (question, unit = question.u) => ({ ...question, u: unit, o: [...question.o] });\n  window.importedBulkBankStats = Object.freeze(${JSON.stringify(stats)});\n  window.importedBulkQuestionsFor = (grade, unit, level) => questions.filter((question) => {\n    if (question.l !== level) return false;\n    if (grade === 'review') return question.reviewUnit === unit || (question.grade === 'review' && question.u === unit);\n    return question.grade === String(grade) && question.u === unit;\n  }).map((question) => copy(question, grade === 'review' ? unit : question.u));\n})();\n`;
writeFileSync(resolve('public/imported-question-bank-20-23.js'), output, 'utf8');
console.log(JSON.stringify(stats, null, 2));
