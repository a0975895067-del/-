import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file=resolve('review-previews','.questions-301-481-staging.json');
const bank=JSON.parse(readFileSync(file,'utf8'));
const fmt=x=>String(x).replaceAll('-','－');
const expr=(x,a)=>a===0?`${x}`:a>0?`${x}＋${a}`:`${x}－${-a}`;
const opts=(answer,wrong,seed)=>{
  const pool=[String(answer),...wrong.map(String)].filter((v,i,a)=>a.indexOf(v)===i);
  let n=1; while(pool.length<4) pool.push(`其他結果${n++}`);
  const four=pool.slice(0,4),shift=seed%4,options=[...four.slice(shift),...four.slice(0,shift)];
  return {options,answerIndex:options.indexOf(String(answer))};
};
const make=(question,answer,wrong,hint,explanation,level,seed)=>({
  question,...opts(answer,wrong,seed),hint,explanation,figureSvg:'',figureType:'',
  difficultyDesign:level==='medium'
    ?{name:'會考統整',steps:'2至3步',description:'從情境辨識結構，完成因式分解或方程式建模後作答'}
    :level==='hard4'
      ?{name:'模擬考鑑別',steps:'至少4步',description:'辨識限制、建立二次方程式、求根並篩選合理解，再完成延伸計算或判斷'}
      :{name:'模擬考鑑別',steps:'3步以上',description:'整合多條件、篩選合理解並檢核結果，不由基礎題拼接'}
});

function factorMedium(i){
  const k=Math.floor(i/10),t=i%10,seed=742+i;
  if(t===0){const a=3+k,b=8+k,x=5+k,ans=2*((x+a)+(x+b));return make(`某長方形展示板的面積為x²＋${a+b}x＋${a*b}平方單位，且其中一邊長為x＋${a}。當x＝${x}時，展示板的周長是多少？`,ans,[ans/2,(x+a)*(x+b),2*x+a+b],'先將面積因式分解，找出另一邊，再代入x計算周長。',`x²＋${a+b}x＋${a*b}＝(x＋${a})(x＋${b})；代入x＝${x}後兩邊為${x+a}、${x+b}，周長為${ans}。`,'medium',seed)}
  if(t===1){const n=7+k,x=12+k,ans=x+n;return make(`已知x＞${n}，計算式(x²－${n*n})÷(x－${n})。當x＝${x}時，其值為何？`,ans,[x-n,x*x-n*n,2*n],'先用平方差公式分解分子，再約去公因式。',`x²－${n*n}＝(x－${n})(x＋${n})，所以原式＝x＋${n}＝${ans}。`,'medium',seed)}
  if(t===2){const a=4+k,b=7+k,x=2+k,ans=(x+a)*(x+b);return make(`某零件的成本模型為C＝x²＋${a+b}x＋${a*b}。若x＝${x}，利用因式分解計算C的值。`,ans,[x*x+(a+b)*x,ans-a*b,(x+a)+(x+b)],'先找出乘積為常數項、和為一次項係數的兩數。',`C＝(x＋${a})(x＋${b})；代入x＝${x}得${x+a}×${x+b}＝${ans}。`,'medium',seed)}
  if(t===3){const a=5+k,b=8+k,ans=a+b;return make(`多項式x²＋bx＋${a*b}可分解為(x＋${a})(x＋${b})，則b的值為何？`,ans,[a*b,b-a,2*(a+b)],'展開兩個一次式，觀察x項係數。',`(x＋${a})(x＋${b})＝x²＋${a+b}x＋${a*b}，所以b＝${ans}。`,'medium',seed)}
  if(t===4){const a=6+3*k,b=15+3*k,g=3,ans=`${g}x(${(a/g)}x＋${b/g})`;return make(`將${a}x²＋${b}x提出最大公因式後，結果為何？`,ans,[`${g}(${a/g}x²＋${b/g}x)`,`${a}x(x＋${b})`,`x(${a}x＋${b/g})`],'係數取最大公因數，每一項還要共同提出x。',`${a}與${b}的最大公因數為${g}，且兩項都有x，因此為${ans}。`,'medium',seed)}
  if(t===5){const p=3+k,q=6+k,mid=q-p,c=p*q,ans=`(x－${p})(x＋${q})`;return make(`下列何者是x²＋${mid}x－${c}的正確因式分解？`,ans,[`(x＋${p})(x－${q})`,`(x－${p})(x－${q})`,`(x＋${p})(x＋${q})`],'常數項為負，兩數異號；再用和確認一次項。',`(－${p})×${q}＝－${c}，且－${p}＋${q}＝${mid}，所以答案為${ans}。`,'medium',seed)}
  if(t===6){const c=4+k,x=7+k,ans=c*(2*x+c);return make(`邊長為x＋${c}的正方形中，挖去一個邊長為x的正方形。當x＝${x}時，剩餘面積是多少？`,ans,[(x+c)**2-x*x,(x+c)**2,x*x],'把兩個正方形面積相減，再用平方差分解。',`剩餘面積＝(x＋${c})²－x²＝${c}(2x＋${c})；代入得${ans}。`,'medium',seed)}
  if(t===7){const a=4+k,b=3+k,c=7+k,ans=`${a+c}(x＋${b})`;return make(`將${a}x＋${a*b}＋${c}x＋${c*b}用分組法分解，結果為何？`,ans,[`(${a+c}x)(x＋${b})`,`(${a}+${c})(x＋${b})`,`${a+c}(x＋${a*b})`],'前兩項與後兩項分別提出公因式，會出現相同括號。',`${a}(x＋${b})＋${c}(x＋${b})＝${a+c}(x＋${b})。`,'medium',seed)}
  if(t===8){const n=99+100*k,ans=n*n-1;return make(`不直接直式相乘，利用因式分解計算${n}²－1的值。`,ans,[(n-1)**2,n*n+1,2*n],'把1看成1²，使用平方差公式。',`${n}²－1＝(${n}－1)(${n}＋1)＝${n-1}×${n+1}＝${ans}。`,'medium',seed)}
  const p=4+k,q=7+k,c=p*q,mid=p+q,ans=`常數項應為${c}`;return make(`小凱把x²＋${mid}x＋${c}分解成(x＋${p})(x＋${q})。若另一位同學寫成(x＋${p-1})(x＋${q+1})，這個分解最先可由哪一點判定錯誤？`,ans,[`一次項係數應為${mid+1}`,`最高次項係數不是1`,'兩因式常數都必須相同'],'比較兩數的和與積；兩數和相同仍可能在常數積出錯。',`錯誤寫法的兩數和仍為${mid}，但積為${(p-1)*(q+1)}，不等於題目的常數項${c}，因此由常數項可判定錯誤。`,'medium',seed);
}

function factorHard(i){
  const k=Math.floor(i/10),t=i%10,seed=762+i;
  if(t===0){const r=3+k,s=8+k,ans=r+s;return make(`已知x－${r}是x²－ax＋${r*s}的一個因式，且另一個一次因式的常數項大於${r}。則a為何？`,ans,[r*s,s-r,2*(r+s)],'由常數項先找另一因式，再比較一次項係數。',`另一因式為x－${s}，所以原式＝x²－${r+s}x＋${r*s}，a＝${ans}。`,'hard',seed)}
  if(t===1){const a=5+k,b=9+k,x=4+k,ans=(x+a)*(x+b)/(x+a);return make(`某多項式P(x)＝x²＋${a+b}x＋${a*b}。已知P(x)代表長方形面積，其中一邊為x＋${a}。當x＝${x}時，另一邊長是多少？`,ans,[x+a,(x+a)*(x+b),a+b],'先因式分解P(x)，再對應已知邊判斷另一因式。',`P(x)＝(x＋${a})(x＋${b})，另一邊為x＋${b}；代入得${ans}。`,'hard',seed)}
  if(t===2){const p=4+k,q=11+k,ans=p*q;return make(`若x²＋bx＋c＝(x－${p})(x＋${q})，且b、c皆為整數，則|b|＋|c|為何？`,Math.abs(q-p)+ans,[ans,q-p,ans-(q-p)],'先展開求b、c，再代入絕對值。',`b＝${q-p}、c＝－${ans}，故|b|＋|c|＝${Math.abs(q-p)+ans}。`,'hard',seed)}
  if(t===3){const n=12+2*k,m=5+k,ans=(n-m)*(n+m);return make(`一塊正方形地板邊長${n}公尺，中央挖去邊長${m}公尺的正方形。剩餘面積可用哪個乘積最快算出？`,`(${n}－${m})(${n}＋${m})`,[`${n-m}²`,`${n}(${n}－${m})`,`(${n}＋${m})²`],'剩餘面積是兩個平方數之差。',`${n}²－${m}²＝(${n}－${m})(${n}＋${m})＝${ans}。`,'hard',seed)}
  if(t===4){const a=2+k,b=7+k,ans=a+b;return make(`多項式x²＋kx＋${a*b}可分解成兩個整係數一次式，且兩個常數項相差${b-a}。若k＞0，k為何？`,ans,[b-a,a*b,2*(a+b)],'找出乘積與差都符合的正整數，再取其和。',`常數項為${a}與${b}，乘積${a*b}、相差${b-a}，故k＝${a+b}。`,'hard',seed)}
  if(t===5){const a=3+k,b=6+k,ans=`x＋${b}`;return make(`已知A＝x²＋${a+b}x＋${a*b}、B＝x＋${a}。在B≠0時，A÷B化簡後為何？`,ans,[`x＋${a}`,`x²＋${b}`,`${a+b}`],'先完整分解A，再約去與B相同的因式。',`A＝(x＋${a})(x＋${b})，除以B後為${ans}。`,'hard',seed)}
  if(t===6){const a=4+k,b=10+k,ans=2*(a+b);return make(`長方形面積為x²＋${a+b}x＋${a*b}，且x為正數。若長與寬同時各增加1，面積增加量可化為2x＋c，則c為何？`,ans,[a+b,a*b,a+b+1],'先由因式分解找長寬，再比較增加前後面積。',`長寬為x＋${a}、x＋${b}；各加1後面積增加2x＋${a+b+1}，所以c＝${a+b+1}。`,'hard',seed)}
  if(t===7){const p=5+k,q=12+k,ans=p*q;return make(`若(x－${p})(x＋${q})＝x²＋ax－b，則b－a為何？`,p*q-(q-p),[p*q,q-p,p*q+(q-p)],'先展開求a與b，注意題目寫的是－b。',`展開得x²＋${q-p}x－${p*q}，所以a＝${q-p}、b＝${p*q}，b－a＝${p*q-(q-p)}。`,'hard',seed)}
  if(t===8){const n=51+10*k,ans=n*n-49;return make(`利用平方差與乘法公式，計算${n}²－7²。`,ans,[(n-7)**2,(n+7)**2,n*n-7],'兩個平方相減可化成和乘以差。',`${n}²－7²＝(${n}－7)(${n}＋7)＝${n-7}×${n+7}＝${ans}。`,'hard',seed)}
  const a=6+k,b=9+k,ans=`(x＋${a})(x＋${b})`;return make(`某生將x²＋${a+b}x＋${a*b}分解。若第一步先寫成x²＋${a}x＋${b}x＋${a*b}，接下來哪個式子能正確完成分組分解？`,ans,[`(x＋${a+b})(x＋${a*b})`,`x(x＋${a})＋${b}(x＋${a})`,`(x＋${a})(x－${b})`],'兩組應提出後得到同一個括號。',`x(x＋${a})＋${b}(x＋${a})＝(x＋${a})(x＋${b})。`,'hard',seed);
}

function equationMedium(i){
  const k=Math.floor(i/10),t=i%10,seed=802+i;
  if(t===0){const a=3+k,b=5+k,x=4+k,N=(x+a)*(x+b),ans=x;return make(`長方形的長為x＋${b}公尺、寬為x＋${a}公尺，面積為${N}平方公尺。若x＞0，x為何？`,ans,[x+a,x+b,-x-a-b],'依面積建立乘積方程式，移項後因式分解並篩選正解。',`(x＋${a})(x＋${b})＝${N}，整理後可得x＝${ans}或負值；依x＞0取${ans}。`,'medium',seed)}
  if(t===1){const n=9+k,ans=n;return make(`兩個連續正整數的乘積為${n*(n+1)}，較小的整數是多少？`,ans,[n+1,n-1,n*(n+1)],'設較小者為x，列出x(x＋1)的方程式。',`x(x＋1)＝${n*(n+1)}，正整數解為x＝${n}。`,'medium',seed)}
  if(t===2){const r=6+k,s=2+k,ans=`${r}或－${s}`;return make(`方程式(x－${r})(x＋${s})＝0的解為何？`,ans,[`${r}或${s}`,`－${r}或${s}`,`${r*s}`],'使用零乘積性質，分別令兩因式為0。',`x－${r}＝0或x＋${s}＝0，所以x＝${r}或－${s}。`,'medium',seed)}
  if(t===3){const r=7+k,ans=1;return make(`方程式(x－${r})²＝0共有幾個相異實數解？`,ans,[0,2,r],'完全平方等於0時，底數只能等於0。',`x＝${r}是重根，因此只有1個相異實數解。`,'medium',seed)}
  if(t===4){const n=8+k,ans=`${n}或－${n}`;return make(`解方程式x²＝${n*n}。`,ans,[`${n}`,`－${n}`,`${n*n}`],'平方等於正數時要保留正、負兩個解。',`x²－${n*n}＝(x－${n})(x＋${n})＝0，所以x＝±${n}。`,'medium',seed)}
  if(t===5){const x=5+k,d=4+k,h=Math.sqrt(x*x+(x+d)*(x+d));const c=x*x+(x+d)*(x+d);return make(`一直角三角形兩股長為x與x＋${d}，斜邊長為√${c}。若x＞0，x為何？`,x,[x+d,c,d],'依畢氏定理列出二次方程式，再篩選正解。',`x²＋(x＋${d})²＝${c}，整理並解得正解x＝${x}。`,'medium',seed)}
  if(t===6){const r=4+k,s=9+k,ans=r+s;return make(`已知方程式x²－ax＋${r*s}＝0的兩根為${r}與${s}，則a為何？`,ans,[r*s,s-r,2*(r+s)],'把方程式寫成(x－根1)(x－根2)＝0。',`(x－${r})(x－${s})＝x²－${r+s}x＋${r*s}，所以a＝${ans}。`,'medium',seed)}
  if(t===7){const n=6+k,ans=n;return make(`正方形面積為${n*n}平方公分，若邊長x＞0，方程式x²＝${n*n}的合理解為何？`,ans,[-n,n*n,2*n],'代數有正負兩解，但邊長必須為正。',`x＝±${n}，依邊長限制取x＝${n}。`,'medium',seed)}
  if(t===8){const r=3+k,s=7+k,ans=r*s;return make(`方程式(x－${r})(x－${s})＝0的兩解乘積為何？`,ans,[r+s,s-r,-r*s],'先由零乘積性質找兩根，再相乘。',`兩根為${r}、${s}，乘積為${ans}。`,'medium',seed)}
  const r=5+k,s=8+k,ans=`x²－${r+s}x＋${r*s}＝0`;return make(`一元二次方程式的兩解為${r}、${s}，且最高次項係數為1。下列哪個方程式符合？`,ans,[`x²＋${r+s}x＋${r*s}＝0`,`x²－${r*s}x＋${r+s}＝0`,`x²＋${s-r}x－${r*s}＝0`],'把兩個解分別寫成一次因式。',`(x－${r})(x－${s})＝0，展開即為${ans}。`,'medium',seed);
}

function equationHard(i){
  const k=Math.floor(i/10),t=i%10,seed=822+i;
  if(t===0){const x=8+k,N=(x+4)*(x+10),inner=x*(x+6),ans=N-inner;return make(`一座長方形花圃的內部寬為x公尺、長為x＋6公尺，四周鋪設寬2公尺的步道後，外框面積為${N}平方公尺。若x＞0，步道本身的面積是多少平方公尺？`,ans,[inner,N,2*((x+4)+(x+10))],'先用外框長、寬建立二次方程式求x，再以外框面積減去花圃面積。',`外框為(x＋4)(x＋10)＝${N}，解得符合情境的x＝${x}。花圃面積為${inner}，所以步道面積＝${N}－${inner}＝${ans}。`,'hard',seed)}
  if(t===1){const n=11+2*k,M=n*(n+2),ans=(n+3)*(n+5);return make(`某長方形展示區的長、寬都是正奇數，且兩者相差2公尺，原面積為${M}平方公尺。整修時長與寬都增加3公尺，整修後的面積是多少平方公尺？`,ans,[M,(n+2)*(n+4),n*n+(n+2)*(n+2)],'設較短邊為x，利用x(x＋2)建立二次方程式並篩選正奇數，再計算兩邊各增加3後的面積。',`x(x＋2)＝${M}，符合條件的兩邊為${n}、${n+2}；增加3後為${n+3}、${n+5}，新面積是${ans}平方公尺。`,'hard',seed)}
  if(t===2){const price=50+10*k,count=200+20*k,x=3+k,revenue=(price+5*x)*(count-10*x),ans=count-10*x;return make(`園遊會原訂票價每張${price}元，預估可售出${count}張。票價每調高5元，預估銷量會減少10張。主辦單位希望收入恰為${revenue}元，且票價調高不得超過20元。依此限制，預估可售出多少張？`,ans,[count-10*(10-x),count-5*x,count-10*(x+1)],'設調高5元的次數為x，列出「新票價×新銷量」的二次方程式；兩個代數解都要用漲價限制檢查。',`收入方程式為(${price}＋5x)(${count}－10x)＝${revenue}，解得x＝${x}或${10-x}。只有x＝${x}符合調高不超過20元，因此銷量為${count}－10×${x}＝${ans}張。`,'hard',seed)}
  if(t===3){const x=12+k,d=5+k,c=x*x+(x+d)*(x+d),ans=x*(x+d)/2;return make(`一支長為√${c}公尺的梯子斜靠牆面，梯腳到牆面的距離為x公尺，梯頂離地高度比x多${d}公尺。若x＞0，梯子、牆面與地面圍成的三角形面積是多少平方公尺？`,ans,[x*(x+d),c/2,(x+d)*(x+d)/2],'先依畢氏定理建立二次方程式求出正的x，再用兩股計算三角形面積。',`x²＋(x＋${d})²＝${c}，解得符合長度條件的x＝${x}。面積＝${x}×${x+d}÷2＝${ans}。`,'hard',seed)}
  if(t===4){const x=10+k,N=(x-2)*(x+5),ans=(x-1)*(x+6);return make(`某長方形紙板的寬為x－2公分、長為x＋5公分，面積是${N}平方公分，且x＞2。若長與寬都增加1公分，新紙板的面積是多少平方公分？`,ans,[N,(x+1)*(x+1),2*((x-1)+(x+6))],'先由原面積解出符合x＞2的根，再把新長與新寬各增加1後相乘。',`(x－2)(x＋5)＝${N}，合理解為x＝${x}。新寬為${x-1}、新長為${x+6}，新面積為${ans}。`,'hard',seed)}
  if(t===5){const r=8+k,s=2,b=5*(r-s),h0=5*r*s,v=6+k,ans=v*r;return make(`一顆球離地${h0}公尺處被拋出，t秒後的高度為h＝－5t²＋${b}t＋${h0}（公尺），同時以每秒${v}公尺的水平速度前進。球落地前水平移動了多少公尺？`,ans,[r,v*(r-s),v*(r+s)],'先令高度h＝0解出落地時間，排除負時間，再用水平速度乘以時間。',`－5t²＋${b}t＋${h0}＝0可分解得t＝${r}或－${s}；時間取${r}秒，所以水平距離＝${v}×${r}＝${ans}公尺。`,'hard',seed)}
  if(t===6){const r=6+k,s=13+k,c=2+k,S=r+s,P=r*s,newSum=S-2*c,newProduct=(r-c)*(s-c),ans=1-newSum+newProduct;return make(`方程式x²－${S}x＋${P}＝0的兩根為p、q。另一個最高次項係數為1的方程式，其兩根分別是p－${c}與q－${c}。將新方程式整理成一般式後，所有係數的和為何？`,ans,[newProduct,newSum,1+newSum+newProduct],'先找p＋q與pq，再分別求新兩根的和與積，寫出新方程式的一般式，最後把三個係數相加。',`p＋q＝${S}、pq＝${P}。新兩根和為${S}－${2*c}＝${newSum}，積為pq－${c}(p＋q)＋${c*c}＝${newProduct}，故新方程式為x²－${newSum}x＋${newProduct}＝0，係數和＝1－${newSum}＋${newProduct}＝${ans}。`,'hard',seed)}
  if(t===7){const m=4+k,P=3*m*m,ans=(m+2)*(3*m+2);return make(`某一元二次方程式有兩個正根p、q，其中一根是另一根的3倍，且pq＝${P}。若另一個首項係數為1的方程式以p＋2、q＋2為兩根，則新方程式的常數項為何？`,ans,[P,10*m*m,ans+2*(4*m)],'設較小根為x、另一根為3x，先由乘積建立方程式求x，再計算新兩根的乘積。',`3x²＝${P}且x＞0，所以x＝${m}，原兩根為${m}、${3*m}。新方程式的常數項為(${m}＋2)(${3*m}＋2)＝${ans}。`,'hard',seed)}
  if(t===8){const x=10+k,price=20,stock=120,revenue=(price+x)*(stock-2*x),ans=stock-2*x;return make(`義賣商品每盒原價${price}元。若每盒調高x元，預估可售出的盒數為${stock}－2x，並希望收入恰為${revenue}元。為維持活動人潮，售出盒數必須不少於90盒。符合全部條件時，預估售出多少盒？`,ans,[stock-2*(40-x),stock-x,stock-2*(x+2)],'把「售價×盒數」列成二次方程式；方程式有兩個非負解，還要用至少售出90盒篩選。',`(${price}＋x)(${stock}－2x)＝${revenue}，解得x＝${x}或${40-x}。後者的銷量少於90盒，故取x＝${x}，預估銷量為${stock}－2×${x}＝${ans}盒。`,'hard',seed)}
  const x=9+k,N=(x+3)*(x+7),rate=15+5*k,ans=2*((x+3)+(x+7))*rate;return make(`校慶舞台連同安全通道形成一個長方形，寬為x＋3公尺、長為x＋7公尺，總面積為${N}平方公尺，且x＞0。若沿外框設置護欄，每公尺費用${rate}元，全部護欄費用是多少元？`,ans,[N*rate,((x+3)+(x+7))*rate,2*x*rate],'先由面積方程式求出符合長度條件的x，再算外框周長，最後乘以每公尺費用。',`(x＋3)(x＋7)＝${N}，合理解為x＝${x}。外框周長＝2(${x+3}＋${x+7})＝${2*((x+3)+(x+7))}公尺，費用為${ans}元。`,'hard',seed);
}

const blocks=[
  [980,20,factorMedium],
  [1000,20,factorHard],
  [1040,20,equationMedium],
  [1060,20,equationHard]
];
for(const [start,count,builder] of blocks){
  for(let i=0;i<count;i++){
    const built=builder(i);
    if(builder===equationHard){
      built.difficultyDesign={name:'模擬考鑑別',steps:'至少4步',description:'辨識限制、建立二次方程式、求根並篩選合理解，再完成延伸計算或判斷'};
    }
    bank.questions[start+i]={...bank.questions[start+i],...built};
  }
}
bank.metadata={...bank.metadata,review742to841:{revisedAt:new Date().toISOString(),displayRange:'742-841',revisedRanges:['742-781','802-841'],rule:'中、難題皆為獨立會考或模擬考式情境，不使用甲乙或甲乙丙拼接；第782至801題易題保持原樣'}};
writeFileSync(file,JSON.stringify(bank,null,2),'utf8');
console.log('已重寫第742～781與802～841題，共80題；易題第782～801保持不動。');
