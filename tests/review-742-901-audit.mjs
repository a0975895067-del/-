import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const bank=JSON.parse(readFileSync(resolve('review-previews','.questions-301-481-staging.json'),'utf8'));
const algebra=bank.questions.slice(980,1080);
const revisedAlgebra=[...bank.questions.slice(980,1020),...bank.questions.slice(1040,1080)];
const quadraticHard=bank.questions.slice(1060,1080);
const statistics=bank.questions.slice(1080,1140);
const all=[...algebra,...statistics];

assert.equal(algebra.length,100,'第742～841題應為100題');
assert.equal(statistics.length,60,'第842～901題應為60題');
assert.equal(new Set(algebra.map(q=>q.question)).size,100,'第742～841題題幹不可重複');
assert.equal(new Set(statistics.map(q=>q.question)).size,60,'第842～901題題幹不可重複');

for(const q of all){
  assert.equal(q.options.length,4,`${q.id}選項數量不是4`);
  assert.equal(new Set(q.options.map(x=>String(x).trim())).size,4,`${q.id}選項重複`);
  assert.ok(Number.isInteger(q.answerIndex)&&q.answerIndex>=0&&q.answerIndex<4,`${q.id}答案索引錯誤`);
}

for(const q of revisedAlgebra){
  assert.ok(!/請分別完成|完成甲、乙、丙|答案配對|甲：.*乙：/s.test(q.question),`${q.id}仍是基礎題拼接`);
  assert.match(q.difficultyDesign.name,/會考|模擬考/,`${q.id}難度設計未標示會考或模擬考`);
  assert.ok(String(q.hint).length>=6&&String(q.explanation).length>=10,`${q.id}缺少提示或解析`);
}

const normalized=revisedAlgebra.map(q=>q.question
  .replace(/[0-9]+/g,'#')
  .replace(/[a-zA-Z]/g,'v'));
const counts=new Map();
for(const q of normalized) counts.set(q,(counts.get(q)??0)+1);
assert.ok(Math.max(...counts.values())<=2,'第742～841題去除數字後有超過2題使用相同模板');

for(const q of quadraticHard){
  assert.equal(q.difficultyDesign?.name,'模擬考鑑別',`${q.id}未標示為困難鑑別題`);
  assert.equal(q.difficultyDesign?.steps,'至少4步',`${q.id}未達至少4步驟`);
  assert.match(q.difficultyDesign?.description??'',/辨識限制.*建立二次方程式.*求根.*篩選合理解.*延伸/,`${q.id}未完整標示四階段推理`);
  assert.ok(String(q.question).length>=50,`${q.id}題幹過短，可能仍可直接判斷`);
  assert.ok(String(q.explanation).length>=35,`${q.id}解析步驟不足`);
  assert.ok(!/兩根在數線上的距離|在哪一段內|較大的根為何|則a為何|解方程式x²＝/.test(q.question),`${q.id}仍是可直接判斷的基礎題型`);
  assert.match(q.hint,/方程式|乘積|畢氏|展開|解出/,`${q.id}提示未包含建模或代數推理`);
}
assert.equal(new Set(quadraticHard.map(q=>q.question.replace(/[0-9]+/g,'#'))).size,10,'第822～841題應有10種不同的多步題型');

assert.ok(statistics.every(q=>q.figureSvg),'第842～901題每題都必須有圖表');
assert.equal(new Set(statistics.map(q=>q.figureSvg)).size,60,'第842～901題不可重複使用相同圖表數字');
assert.ok(statistics.every(q=>/<text[^>]*>[^<]*[0-9][^<]*<\/text>/.test(q.figureSvg)), '每張圖表都必須直接標示數值');
assert.ok(statistics.every(q=>!/請分別完成|完成甲、乙、丙|答案配對/.test(q.question)),'第842～901題仍有拼接題');

const types=['長條圖','折線圖','圓形圖','列聯表','次數分配折線圖'];
for(const level of ['easy','medium','hard']){
  const rows=statistics.filter(q=>q.level===level);
  assert.equal(rows.length,20,`${level}統計題應為20題`);
  for(const type of types) assert.equal(rows.filter(q=>q.figureType===type).length,4,`${level}的${type}應為4題`);
}

for(const q of statistics.filter(q=>q.level!=='easy')){
  assert.match(q.difficultyDesign.name,/統整|會考/,`${q.id}中難題難度設計不足`);
  assert.ok(!/資料 [0-9、]+ 的平均數為何|中位數為何？.*平均數為何/s.test(q.question),`${q.id}仍是易題直接拼接`);
  assert.ok(String(q.hint).length>=6&&String(q.explanation).length>=10,`${q.id}缺少提示或解析`);
}

console.log('PASS 第742～901題：代數中難題80題皆為獨立會考式題型；統計60題圖表數字完整、圖表不重複、五類均衡。');
