import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const bank=JSON.parse(readFileSync(resolve('review-previews','.questions-301-481-staging.json'),'utf8'));
const qs=bank.questions.slice(720,840);
const types=['長條圖','折線圖','圓形圖','列聯表','次數分配折線圖'];
const levels=['easy','medium','hard'];
const expectedPerLevel={'長條圖':8,'折線圖':8,'圓形圖':7,'列聯表':7,'次數分配折線圖':10};

assert.equal(qs.length,120,'第482～601題必須正好120題');
assert.equal(new Set(qs.map(q=>q.question)).size,120,'題幹不可完全重複');
for(const level of levels){
  const group=qs.filter(q=>q.level===level);
  assert.equal(group.length,40,`${level}應有40題`);
  for(const type of types)assert.equal(group.filter(q=>q.figureType===type).length,expectedPerLevel[type],`${level}的${type}數量不符`);
}
for(const type of types){
  const group=qs.filter(q=>q.figureType===type);
  const signatures=group.map(q=>(q.figureSvg.match(/>[^<]*\d[^<]*</g)||[]).join('|'));
  assert.equal(new Set(signatures).size,group.length,`${type}仍有完全相同的圖表數字組合`);
}

for(const [i,q] of qs.entries()){
  const n=482+i;
  assert.ok(types.includes(q.figureType),`第${n}題圖表類型不在五類中`);
  assert.match(q.figureSvg,/^<svg[\s\S]*<\/svg>$/,`第${n}題缺少完整SVG`);
  assert.ok(!/undefined|NaN|null/.test(q.question+q.options.join('')+q.figureSvg),`第${n}題含無效資料`);
  assert.equal(q.options.length,4,`第${n}題選項不是4個`);
  assert.equal(new Set(q.options.map(String)).size,4,`第${n}題選項重複`);
  assert.ok(Number.isInteger(q.answerIndex)&&q.answerIndex>=0&&q.answerIndex<4,`第${n}題答案索引錯誤`);
  const numericLabels=[...q.figureSvg.matchAll(/<text[^>]*>([^<]*\d[^<]*)<\/text>/g)].map(m=>m[1]);
  assert.ok(numericLabels.length>=4,`第${n}題圖表沒有清楚標示足夠數值`);
  if(q.figureType==='折線圖'){
    assert.match(q.figureSvg,/M62 62V310/,`第${n}題縱軸位置不正確`);
    assert.match(q.figureSvg,/<circle cx="112"/,`第${n}題第一個資料點未與縱軸保持距離`);
  }
  if(q.figureType==='次數分配折線圖'){
    assert.match(q.figureSvg,/M60 70V306/,`第${n}題次數分配圖縱軸位置不正確`);
    assert.match(q.figureSvg,/<circle cx="112"/,`第${n}題次數分配圖第一點未與縱軸保持距離`);
  }
  if(q.figureType==='圓形圖')assert.ok(!/[°度]/.test(q.figureSvg),`第${n}題圓餅圖仍直接標示角度`);
  if(q.level==='medium'){
    assert.ok(!/^請分別完成甲、乙/.test(q.question),`第${n}題仍是易題拼接`);
    assert.match(q.difficultyDesign.description,/轉換|條件|多步驟/,`第${n}題未標示中等推理設計`);
  }
  if(q.level==='hard'){
    assert.ok(!/^完成甲、乙、丙/.test(q.question),`第${n}題仍是易題拼接`);
    assert.match(q.difficultyDesign.description,/分析|評估|推論/,`第${n}題未標示鑑別設計`);
  }
}

const normalized=qs.map(q=>q.question.replace(/[零一二三四五六七八九十百千\d.%％]+/g,'#'));
const freq=new Map();normalized.forEach(x=>freq.set(x,(freq.get(x)||0)+1));
assert.ok(Math.max(...freq.values())<=1,'存在只換數字的同型題幹');
const q503=qs[503-482];
assert.match(String(q503.options[3]),/^-?\d+(?:\.\d{1,2})?$/,`第503題D選項必須至多保留小數點後2位`);
console.log('第482～601題稽核通過：120題；每個難度含10題次數分配折線圖；圓餅圖無角度標記；無拼接題、無重複選項。');
