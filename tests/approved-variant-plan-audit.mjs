import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file=resolve('public','已審查題庫與隨機變式規格_20260916.json');
const data=JSON.parse(readFileSync(file,'utf8'));
assert.equal(data.metadata.reviewedDisplayRange,'1-1021');
assert.equal(data.questions.length,1260,'已審查題庫應包含1260筆來源紀錄');
assert.ok(data.generationPlans.length>0,'缺少變式生成規格');
for(const plan of data.generationPlans){
  assert.ok(plan.reviewedTemplates>=20,`${plan.key}缺少足夠的已審查模板`);
  assert.equal(plan.supportedVariants,{easy:3000,medium:2000,hard:1500}[plan.level],`${plan.key}容量錯誤`);
  if(plan.level!=='easy')assert.match(plan.distractorPolicy,/第2或第3步/,`${plan.key}未設定中途結果誘答`);
}
for(const question of data.questions){
  assert.equal(question.o.length,4,`${question.id}選項不是4個`);
  assert.equal(new Set(question.o.map(value=>String(value).trim())).size,4,`${question.id}選項重複`);
  assert.ok(Number.isInteger(question.a)&&question.a>=0&&question.a<4,`${question.id}答案索引錯誤`);
}
const hardQuadratic=data.questions.filter(question=>question.u==='一元二次方程式'&&question.l==='hard');
assert.equal(hardQuadratic.length,20,'一元二次方程式困難題應為20題');
assert.ok(hardQuadratic.every(question=>question.id&&question.h&&question.e),'困難題缺少提示或解析');
console.log(`PASS 已審查題庫 ${data.questions.length}筆；${data.generationPlans.length}組單元難度皆有易3000／中2000／難1500變式容量。`);
