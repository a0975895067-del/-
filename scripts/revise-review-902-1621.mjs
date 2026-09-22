import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve('review-previews', '.questions-301-481-staging.json');
const bank = JSON.parse(readFileSync(file, 'utf8'));

const gcd = (a,b) => b ? gcd(b,a%b) : Math.abs(a);
const frac = (a,b) => {
  const g=gcd(a,b), numerator=a/g, denominator=b/g;
  return denominator===1 ? String(numerator) : `${numerator}/${denominator}`;
};
const radical = (n,coefficient=1) => {
  let square=1;
  for(let d=2;d*d<=n;d++)if(n%(d*d)===0)square=d;
  const outside=coefficient*square,inside=n/(square*square);
  if(inside===1)return String(outside);
  return `${outside===1?'':outside}√${inside}`;
};
const spreadK = i => [0,4,1,7][Math.floor(i/5)];
const shuffledOptions = (answer, wrong, seed) => {
  const values=[String(answer),...wrong.map(String)].filter((v,i,a)=>a.indexOf(v)===i);
  let n=1; while(values.length<4){
    const numeric=Number(answer), degree=String(answer).match(/^(-?\d+(?:\.\d+)?)°$/);
    const candidate=Number.isFinite(numeric)
      ? String(numeric+n*(seed%5+2))
      : degree ? `${Number(degree[1])+5*n}°` : ['以上皆非','條件不足','沒有實數解'][n-1];
    if(candidate&&!values.includes(candidate)) values.push(candidate);
    n++;
  }
  const four=values.slice(0,4), shift=seed%4;
  const options=[...four.slice(shift),...four.slice(0,shift)];
  return {options,answerIndex:options.indexOf(String(answer))};
};
const make=(question,answer,wrong,hint,explanation,level,seed,extra={})=>({
  question,...shuffledOptions(answer,wrong,seed),hint,explanation,figureSvg:'',figureType:'',...extra,
  difficultyDesign:level==='medium'
    ? {name:'會考／模擬考',steps:'2至4步',description:'單一完整情境；須轉譯條件、連結觀念並排除合理誘答，不由易題拼接'}
    : {name:'資優甄選・競賽銜接',steps:'4至6步',description:'介於模擬考與奧數之間；須發現隱藏結構、分情況或反推，並檢核所有限制'}
});

const olympiadMake=(question,answer,wrong,hint,explanation,seed)=>({
  ...make(question,answer,wrong,hint,explanation,'hard',seed),
  difficultyDesign:{name:'奧數初賽進階',steps:'找結構・分類・反推',description:'參照奧數初賽的單題設計：整合數論、代數、幾何或組合限制，須找出隱藏結構並完整檢核'}
});

function functionOlympiadHard(i,grade){
  const s=6200+grade*100+i;
  if(i===0){let ans=0;for(let x=1;x<=30;x++){const a=4*x+52-(x>=10?20:0),b=7*x+9;if(a<b&&a<=160&&b<=160)ans++}return olympiadMake(`甲方案費用為4x＋52元，但x≥10時折抵20元；乙方案為7x＋9元。x為1至30的整數，且折抵後甲方案與乙方案費用都不得超過160元。甲方案嚴格較便宜的x共有幾個？`,ans,[ans-1,ans+1,21],`先依x＜10、x≥10分段，再同時套用比較與預算限制。`,`x＜10時甲不會較便宜；x≥10時甲為4x＋32。聯立比較與預算限制，得x＝10至21，共${ans}個。`,s)}
  if(i===1){const valid=[];for(let x=1;x<=24;x++)if(x%2===0&&4*x+18<2*x+38&&4*x+18<7*x+3)valid.push(x);const ans=valid.reduce((a,b)=>a+b,0);return olympiadMake(`x為1至24的偶數。三方案費用依序為2x＋38、4x＋18、7x＋3元。第二方案嚴格最便宜時，所有符合條件的x總和為何？`,ans,[valid.length,ans-2,ans+2],`第二方案須同時小於另外兩案，最後再保留偶數。`,`兩個不等式給出5＜x＜10，符合的偶數為${valid.join('、')}，總和${ans}。`,s)}
  if(i===2){const valid=[];for(let x=1;x<=25;x+=2){const d=Math.abs(3*x-27);if(d>=6&&d<=12)valid.push(x)}const ans=valid.reduce((a,b)=>a+b,0);return olympiadMake(`甲、乙兩物體在第x秒的位置分別為5x＋4與2x＋31，其中x只能取1至25的奇數。兩者距離介於6至12單位（含端點）時，所有x的總和為何？`,ans,[valid.length,ans-4,ans+4],`距離是兩位置差的絕對值，要分成正、負兩段再篩奇數。`,`解6≤|3x－27|≤12，再保留奇數，得x＝${valid.join('、')}，總和${ans}。`,s)}
  if(i===3){const pts=[];for(let x=1;x<60;x++)for(let y=1;y<40;y++)if(3*x+5*y===180&&x<y)pts.push([x,y]);const ans=pts.reduce((sum,[x])=>sum+x,0);return olympiadMake(`直線3x＋5y＝180上，位於第一象限、x與y皆為正整數且x＜y的點，其x坐標總和為何？`,ans,[pts.length,ans-5,ans+5],`先用整除性找全部正整數格點，再套用x＜y。`,`保留條件後為${pts.map(p=>`(${p[0]},${p[1]})`).join('、')}，x坐標總和${ans}。`,s)}
  if(i===4){const area=frac(25,8);return olympiadMake(`直線y＝2x＋11與y＝－x＋20交於P。直線L通過P且斜率為4，L與兩坐標軸圍成三角形，求其面積。`,area,[5,frac(25,4),frac(51,2)],`先求P，再求L的截距；截距可能在負x軸。`,`P＝(3,17)，故L為y＝4x＋5。兩截距長為5與5/4，面積＝${area}。`,s)}
  if(i===5){const ans=64;return olympiadMake(`四筆紀錄(1,7)、(3,13)、(5,24)、(7,25)中，恰有一個y值比正確值多5；修正後四點應在同一個一次函數圖形上。四個正確y值的總和為何？`,ans,[59,69,60],`逐一把一筆y值減5，檢查四點斜率是否一致。`,`第三筆24改為19後，四點都符合y＝3x＋4；總和為${ans}。`,s)}
  if(i===6){const area=frac(49,6);return olympiadMake(`一次函數f(x)＝mx＋b滿足f(2)＋f(5)＝35、f(5)－f(2)＝9。其圖形與兩坐標軸圍成的三角形面積為何？`,area,[7,frac(49,3),frac(21,2)],`先由和差求f(2)、f(5)，再求m、b與兩截距。`,`由和差得f(2)＝13、f(5)＝22，所以m＝3、b＝7，面積＝${area}。`,s)}
  if(i===7){let ans=0;for(let b=1;b<=60;b++){const area=b*b/6;if(area>20&&area<70)ans++}return olympiadMake(`b為正整數，直線y＝3x＋b與兩坐標軸圍成的三角形面積嚴格介於20與70之間。b共有幾種可能？`,ans,[ans-1,ans+1,20],`面積可用b表示，再把平方不等式轉成整數範圍。`,`面積為b²/6。由120＜b²＜420得b＝11至20，共${ans}種。`,s)}
  if(i===8)return olympiadMake(`直線L在正x軸、正y軸的截距分別為正整數a、b。若b－a＝5，且L與兩坐標軸圍成的三角形面積為42，則L的方程式為何？`,`y＝－12/7x＋12`,[`y＝－7/12x＋7`,`y＝－12/7x＋7`,`y＝－7/12x＋12`],`由面積得ab，再配合差找正整數截距。`,`ab＝84且b－a＝5，得(a,b)＝(7,12)，故方程式為y＝－12/7x＋12。`,s)
  if(i===9){let ans=0;for(let x=1;x<=12;x++)ans+=Math.abs(24-3*x);return olympiadMake(`使用量x依序取1、2、…、12。甲、乙方案費用為3x＋30與6x＋6元；每次都選較便宜者。若每次相對於較貴方案省下的金額全部相加，共省多少元？`,ans,[ans-24,ans+24,12],`每個x的節省額是兩方案費用差的絕對值，交點前後須分段。`,`節省額為|24－3x|，分段加總x＝1至12得${ans}元。`,s)}
  if(i===10){const valid=[];for(let x=0;x<=24;x++){const a=120-5*x,b=30+4*x;if(a>=b&&a<=2*b)valid.push(x)}return olympiadMake(`甲、乙水箱在第x分鐘的水量為120－5x與30＋4x公升，x為非負整數。甲水量介於乙水量的1倍與2倍之間（含端點）共有幾個時刻？`,valid.length,[valid.length-1,valid.length+1,valid.at(-1)],`同時解乙≤甲與甲≤2乙，並保留非負整數。`,`聯立得整數x由${valid[0]}至${valid.at(-1)}，共有${valid.length}個。`,s)}
  if(i===11){const pts=[];for(let x=1;x<30;x++)for(let y=1;y<20;y++)if(3*x+5*y===90)pts.push([x,y]);const ans=Math.max(...pts.map(([x,y])=>x*y));return olympiadMake(`第一象限的整數點P(x,y)在直線3x＋5y＝90上。矩形頂點為O(0,0)、(x,0)、P、(0,y)時，矩形面積最大為何？`,ans,[120,150,90],`先列整數格點，再比較乘積xy。`,`格點為${pts.map(p=>`(${p[0]},${p[1]})`).join('、')}，其中xy最大為${ans}。`,s)}
  if(i===12){const valid=[];for(let x=1;x<=12;x++){const y=3*x-4;if(y>=1&&y<=25&&y<30-x)valid.push([x,y])}const ans=valid.reduce((sum,[x,y])=>sum+x+y,0);return olympiadMake(`整數點P(x,y)在直線y＝3x－4上，且1≤x≤12、1≤y≤25，又位於直線y＝30－x下方。所有符合點的x＋y總和為何？`,ans,[valid.length,ans-4,ans+4],`先以兩個範圍限制x，再加入第三條直線的不等式。`,`符合點為${valid.map(p=>`(${p[0]},${p[1]})`).join('、')}；x＋y總和為${ans}。`,s)}
  if(i===13)return olympiadMake(`某感測器的真實關係為一次函數。甲表記錄(2,15)、(4,27)、(7,45)；乙表把所有y值固定多記5；丙表把所有x值誤記成真實值的2倍。若丙表顯示x＝20，乙表應顯示的y值為何？`,68,[63,73,126],`先由甲表求真實函數，再分別還原丙表x、套用乙表偏差。`,`甲表得y＝6x＋3。丙表x＝20代表真實x＝10，真實y＝63；乙表顯示68。`,s)
  if(i===14){const area=frac(75,2);return olympiadMake(`直線f：y＝2x＋4與g：y＝－x＋19交於P；A、B分別為f、g與y軸的交點。求△PAB面積。`,area,[15,75,frac(57,2)],`AB在y軸上，先求交點P，再以P到y軸距離作高。`,`P＝(5,14)，AB長15，高為5，所以面積＝${area}。`,s)}
  if(i===15){const valid=[];for(let n=-5;n<=3;n++){const den=4-n;if(10%den===0){const x=10/den,y=n*x+12;if(x>0&&Number.isInteger(x)&&y<50)valid.push(n)}}const ans=valid.reduce((a,b)=>a+b,0);return olympiadMake(`n為－5至3的整數。直線y＝nx＋12與y＝4x＋2的交點若須有正整數x坐標且y＜50，所有符合的n總和為何？`,ans,[valid.length,ans-1,ans+1],`交點x＝10/(4－n)，把整數條件轉成整除問題。`,`檢查4－n為10的正因數並套用y＜50，得n＝${valid.join('、')}，總和${ans}。`,s)}
  if(i===16)return olympiadMake(`一直線在正x軸、正y軸的截距為a、b，斜率為－3/2，且與兩坐標軸圍成的三角形面積為108。求a＋b。`,30,[24,36,42],`由斜率得到b：a，再與ab/2＝108聯立。`,`設a＝2k、b＝3k；3k²＝108得k＝6，所以a＋b＝30。`,s)
  if(i===17){let ans=0;for(let x=1;x<=15;x++)ans+=Math.min(2*x+30,5*x+6,9*x-10);return olympiadMake(`x依序取1至15的整數，每次從三方案2x＋30、5x＋6、9x－10元中選最低價。15次最低價的總和為何？`,ans,[ans-15,ans+15,15],`找三條直線的交替分界，分段決定最低者後再求和。`,`比較三方案並逐段加總，15次最低價合計${ans}元。`,s)}
  if(i===18){const valid=[];for(let x=1;x<=30;x++){const fx=-x+14;if(fx>=x&&fx>0)valid.push(x)}return olympiadMake(`一次函數f滿足f(4)＝10、f(10)＝4。正整數x同時符合f(x)≥x與f(x)＞0時，x共有幾個可能值？`,valid.length,[valid.length-1,valid.length+1,14],`先由兩點求f(x)，再同時解兩個不等式。`,`f(x)＝－x＋14。由f(x)≥x得x≤7，故正整數共有${valid.length}個。`,s)}
  let ans=0;for(let m=1;m<=5;m++)for(let b=0;b<=9;b++)if(2*m+b>=10&&5*m+b<=25)ans++;return olympiadMake(`一次函數f(x)＝mx＋b，其中m為1至5的整數、b為0至9的整數。若f(2)≥10且f(5)≤25，符合條件的函數共有幾個？`,ans,[ans-1,ans+1,25],`固定m後，兩個條件會同時給出b的上下界。`,`依m＝1、2、3、4、5分類，可用的b分別有2、4、6、4、1個，共${ans}個。`,s)
}

function olympiadHard(unit,i,grade){
  const k=Math.floor(i/2)+(unit==='會考素養閱讀'&&grade===9?10:0),t=i%2,s=5000+grade*100+i;
  if(unit==='函數及其圖形')return functionOlympiadHard(i,grade);
  if(unit==='數列與等差數列'){
    if(t===0){const N=24+3*k,d=4+k%4;let ans=0;for(let r=1;r<=d;r++){const len=Math.floor((N-r)/d)+1;ans+=Math.ceil(len/2)}return olympiadMake(`從1到${N}中選出若干個整數，使任意兩數之差都不等於${d}。最多能選出幾個數？`,ans,[ans-1,Math.ceil(N/2),ans+1],`依除以${d}的餘數分組；每組形成相鄰差${d}的鏈。`,`每條鏈中不能同取相鄰位置，長度L最多取⌈L/2⌉個；各餘數鏈相加得${ans}個。`,s)}
    const c=12+k,m=3+k%3,count=2*m+1,sum=count*c*c+2*(m*(m+1)*(2*m+1)/6);return olympiadMake(`有${count}個連續正整數，其平方和為${sum}。這些整數中最大者為何？`,c+m,[c,c+m-1,c+2*m],`以中間數n表示左右對稱的連續整數，交叉項會消去。`,`平方和＝${count}n²＋2(1²＋…＋${m}²)＝${sum}，得n＝${c}，最大數為${c+m}。`,s)
  }
  if(unit==='函數及其圖形'){
    const v=Math.floor(i/10), kind=i%10, seed=5100+grade*100+i;
    if(kind===0){
      const a=2+v,c=a+2,d=5+2*v,h=6+v,b=d+(c-a)*h,U=h+6+v,budget=c*U+d,ans=U-h;
      return olympiadMake(`甲、乙方案費用分別為y＝${a}x＋${b}與y＝${c}x＋${d}，x為正整數。若兩方案費用都不超過${budget}元，且甲方案嚴格較便宜，符合條件的x共有幾個？`,ans,[ans-1,ans+1,U],`先比較兩方案，再以預算同時限制兩個上界。`,`比較得x＞${h}；兩方案皆不超過預算可得x≤${U}。所以x＝${h+1}至${U}，共有${ans}個。`,seed);
    }
    if(kind===1){
      const m=3+v,p=2+v,c=6+2*v,y=m*p+c,area=frac(c*c,2*m);
      return olympiadMake(`直線L通過(${p},${y})，且與直線y＝${m}x－${4+v}平行。L與兩坐標軸圍成三角形，求其面積。`,area,[frac(c*c,m),frac(c*m,2),frac(c,2)],`由平行取得斜率，再由已知點求截距。`,`L為y＝${m}x＋${c}；兩截距長為${c}與${frac(c,m)}，面積為${area}。`,seed);
    }
    if(kind===2){
      const m=2+v,b=8+2*v,x1=1+v,x2=4+v,x3=7+v,y1=m*x1+b,y2=m*x2+b,y3=m*x3+b;
      return olympiadMake(`三筆紀錄(${x1},${y1})、(${x2},${y2+3})、(${x3},${y3})中恰有一個y值抄錯，且錯誤值比正確值多3；正確資料應在同一條直線上。錯誤資料修正後，其y值應為何？`,y2,[y2+3,y2-3,y1+y3],`逐一把一筆y值減3，比較三點能否形成相同斜率。`,`只有第二筆減3後，第一至第二與第二至第三的斜率都為${m}；故正確y＝${y2}。`,seed);
    }
    if(kind===3){
      const a=3+v,b=29+3*v,c=6+v,d=5+v,limit=14+2*v;let count=0;for(let x=1;x<=limit;x++)if(a*x+b<c*x+d)count++;
      return olympiadMake(`在1≤x≤${limit}且x為整數時，甲方案${a}x＋${b}元、乙方案${c}x＋${d}元。若每天選較便宜的方案，甲方案會被選用幾次？`,count,[count-1,count+1,limit-count],`先找兩費用相等的分界，再注意整數端點是否包含。`,`甲較便宜需${a}x＋${b}＜${c}x＋${d}。解不等式並與1≤x≤${limit}取交集，共${count}個整數。`,seed);
    }
    if(kind===4){
      const p=3+v,q=4+v,N=p*q*(3+v),ans=2+v;
      return olympiadMake(`直線${p}x＋${q}y＝${N}上，位於第一象限且x、y皆為正整數的點共有幾個？`,ans,[ans+1,ans-1,p+q],`先由整除條件限制x，再檢查正整數端點。`,`因${p}x＝${N}－${q}y，可由模數或逐步減少找出正整數解；排除坐標軸上的點後共有${ans}個。`,seed);
    }
    if(kind===5){
      const m1=2+v,b1=18+2*v,m2=-(1+v),x=4+v,b2=b1+(m1-m2)*x,y=m1*x+b1,area=frac(x*y,2);
      return olympiadMake(`兩直線y＝${m1}x＋${b1}與y＝${m2}x＋${b2}交於P。若O為原點，P向兩坐標軸作垂線形成長方形，則其中由O與P及一個垂足組成的三角形面積為何？`,area,[x*y,frac(x+y,2),y],`先求交點P，再以其兩坐標作為直角三角形的底與高。`,`聯立得P(${x},${y})，所以面積＝${x}×${y}÷2＝${area}。`,seed);
    }
    if(kind===6){
      const a=2+v,b=7+v,c=5+v,d=1+v,x=(b-d)/(c-a),y=a*x+b,p=3+v,q=y-p*x,area=frac(q*q,2*p);
      return olympiadMake(`直線y＝${a}x＋${b}與y＝${c}x＋${d}的交點也在直線L：y＝${p}x＋q上。L與兩坐標軸圍成的三角形面積為何？`,area,[q,frac(q*q,p),frac(p*q,2)],`先求交點決定q，再求L的兩個截距。`,`前兩線交於(${x},${y})，得q＝${q}。L的截距長為${q}與${frac(q,p)}，面積為${area}。`,seed);
    }
    if(kind===7){
      const a=3+v,b=8+2*v,c=6+v,d=2+v,L=16+2*v;let ans=0;for(let x=1;x<=L;x++)if(Math.abs((a*x+b)-(c*x+d))<=4+v)ans++;
      return olympiadMake(`甲、乙兩人的位置分別為${a}x＋${b}與${c}x＋${d}（x為1至${L}的整數）。兩人距離不超過${4+v}單位的時刻共有幾個？`,ans,[ans-1,ans+1,L-ans],`距離要取兩位置之差的絕對值，分成上下兩個界線。`,`解|(${a}x＋${b})－(${c}x＋${d})|≤${4+v}，再保留1至${L}的整數，共${ans}個。`,seed);
    }
    if(kind===8){
      const a=2+v,b=12+2*v,p=5+v,q=a*p+b,shift=3+v,down=5+v,ans=a*shift+down;
      return olympiadMake(`點P(${p},${q})在直線L上，L的y軸截距為${b}。P先向右移${shift}單位、再向下移${down}單位；此時至少再向上移多少單位才會回到L？`,ans,[a*shift,ans-down,ans+down],`先由P與截距求斜率；右移後直線高度上升，再合併向下的位移。`,`L斜率＝(${q}－${b})÷${p}＝${a}。右移${shift}後L高出原P共${a*shift}，點又下降${down}，因此須向上${a*shift}＋${down}＝${ans}。`,seed);
    }
    const A1=2+v,B1=22+2*v,A2=4+v,B2=10+v,A3=7+v,B3=1+v,L=14+v;let ans=0;for(let x=1;x<=L;x++){const vals=[A1*x+B1,A2*x+B2,A3*x+B3];if(vals[1]===Math.min(...vals)&&vals.filter(z=>z===vals[1]).length===1)ans++}
    return olympiadMake(`x為1至${L}的整數。三方案費用依序為${A1}x＋${B1}、${A2}x＋${B2}、${A3}x＋${B3}。第二方案嚴格最便宜時，x共有幾個可能值？`,ans,[ans-1,ans+1,L-ans],`第二方案必須同時小於第一、第三方案。`,`分別解${A2}x＋${B2}＜${A1}x＋${B1}及${A2}x＋${B2}＜${A3}x＋${B3}，再與整數範圍取交集，共${ans}個。`,seed);
  }
  if(unit==='三角形的性質與尺規作圖'){
    if(t===0){const a=9+k,b=14+k,N=a+b-1,L=b-a+1;let ans=0;for(let x=L;x<=N;x++)if(x!==a&&x!==b&&(a+b+x)%2===0)ans++;return olympiadMake(`三角形兩邊長為${a}、${b}，第三邊為正整數，且三邊互不相等、周長為偶數。第三邊共有幾種可能？`,ans,[N-L+1,ans-1,ans+1],`先用三角形不等式定範圍，再套入互異與奇偶限制。`,`第三邊x滿足${b-a}＜x＜${a+b}；排除${a}、${b}並保留使${a+b}＋x為偶數者，共${ans}種。`,s)}
    const A=72+6*(k%10),ans=(180-A)/3;return olympiadMake(`等腰三角形ABC中AB＝AC，D在BC上且AD＝BD。若∠CAD＝${A}°，則∠ABC為何？`,`${ans}°`,[`${A/2}°`,`${180-A}°`,`${90-A/2}°`],`設∠ABC＝x，利用兩個等腰三角形把∠BAD也寫成x。`,`AD＝BD得∠BAD＝∠ABD＝x；AB＝AC得∠B＝∠C＝x，所以3x＋${A}°＝180°，x＝${ans}°。`,s)
  }
  if(unit==='平行與四邊形'){
    if(t===0){const a=5+k,b=8+k,h=6+k,mid=(a+b)/2;return olympiadMake(`梯形ABCD中AD∥BC，上、下底為${a}、${b}，高為${h}。連接兩腰中點得線段MN，再連接兩條對角線中點得線段PQ。MN與PQ長度之差為何？`,Math.min(a,b),[Math.abs(b-a)/2,mid,Math.abs(b-a)],`兩腰中點連線是兩底平均；兩對角線中點連線是兩底差的一半。`,`MN＝(${a}＋${b})/2，PQ＝|${b}－${a}|/2，兩者相差較短底${Math.min(a,b)}。`,s)}
    const x=4+k;return olympiadMake(`平行四邊形ABCD的對角線交於O。點P在線段AO上且AP：PO＝2：1；點Q在線段CO上且CQ：QO＝1：2。若AO＝${3*x}，則PQ為何？`,3*x,[x,2*x,4*x],`把A、O、C放在同一直線的有向坐標上。`,`取O＝0、A＝${3*x}、C＝－${3*x}。P＝${x}，Q＝－${2*x}，故PQ＝${3*x}。`,s)
  }
  if(unit==='會考素養閱讀'){
    if(t===0){
      const [p,q]=[[2,3],[2,5],[2,7],[3,4],[3,5],[3,7],[4,5],[4,7],[5,6],[5,7]][k%10],scale=grade===9?150:100; let picked;
      for(let totalU=20;totalU<=180&&!picked;totalU++){
        const holdings=[];
        for(let a=0;a*p<=totalU;a++)for(let b=0;a*p+b*q<=totalU;b++)if(a*p+b*q===totalU)holdings.push({a,b,count:a+b});
        if(new Set(holdings.map(v=>v.count)).size<4)continue;
        for(let targetU=q+1;targetU<totalU/2&&!picked;targetU++){
          const failed=[],succeeded=[];
          for(const h of holdings){let possible=false;for(let x=0;x<=h.a&&!possible;x++)for(let y=0;y<=h.b;y++)if(x*p+y*q===targetU){possible=true;break}(possible?succeeded:failed).push(h.count)}
          const bad=[...new Set(failed)],good=[...new Set(succeeded)].filter(v=>!bad.includes(v));
          if(bad.length&&good.length>=3)picked={totalU,targetU,bad:bad[0],good:good.slice(0,3)};
        }
      }
      if(!picked)throw new Error(`找不到禮券整數限制題：p=${p}, q=${q}, k=${k}`);
      const small=p*scale,large=q*scale,total=picked.totalU*scale,target=picked.targetU*scale;
      return olympiadMake(`某人只帶面額${small}元與${large}元的禮券，共值${total}元。購買${target}元商品時必須不找零。若已知兩種禮券都可能持有，下列哪一個總張數會使他無法剛好付款？`,picked.bad,picked.good,`先列出${p}x＋${q}y＝${picked.totalU}的非負整數解，再逐一檢查是否能從現有張數中湊出${picked.targetU}個百元。`,`對每組持有量(x,y)，再檢查${p}u＋${q}v＝${picked.targetU}且0≤u≤x、0≤v≤y；完整分類後，總張數${picked.bad}是唯一無法付款的選項。`,s)
    }
    const r=3+k%4,total=48+8*k,one=total-8*r,amount=one+5*3*r+10*5*r;return olympiadMake(`撲滿中有1元、5元、10元硬幣共${total}枚，總額${amount}元，且5元與10元枚數比為3：5。1元硬幣有幾枚？`,one,[one+8,one-8,r],`把5元、10元枚數設為3r、5r，再同時使用枚數與總額。`,`設比值倍數為t，金額式化簡可得t＝${r}；1元枚數＝${total}－8×${r}＝${one}。`,s)
  }
  if(unit==='相似形與比例線段'){
    if(t===0){const a=3+k%4,b=5+k%5,L=(a+b)*(4+k);return olympiadMake(`△ABC中AD為∠A角平分線，D在BC上。若AB：AC＝${a}：${b}，且以D為分點將BC分成兩段後，較長段比短段多${(b-a)*(4+k)}，則BC長為何？`,L,[L-(b-a),L+(b-a),(b-a)*(4+k)],`角平分線定理把兩段比轉成${a}：${b}，再由差反推每一份。`,`BD：DC＝${a}：${b}，每份為${4+k}，故BC＝(${a}＋${b})×${4+k}＝${L}。`,s)}
    const r=2+k%4,A=18+3*k;return olympiadMake(`兩相似多邊形邊長比為1：${r}。若大、小圖形面積差為${A*(r*r-1)}，周長和為${(6+k)*(r+1)}，則小圖形的「面積－周長」為何？`,A-(6+k),[A+(6+k),A*r-(6+k),A-(6+k)*r],`面積按平方比、周長按一次比，分別反推小圖形。`,`小面積＝${A}，小周長＝${6+k}，所以差為${A-(6+k)}。`,s)
  }
  if(unit==='圓與圓周角'){
    if(t===0){const c=2+k,a=c*(3+k%3),b=4+k,other=a*b/c,total=c+other;return olympiadMake(`圓內兩弦AB、CD交於P，AP＝${a}、PB＝${b}、CP＝${c}，且D在CP的延長線上。弦CD全長為何？`,total,[other,a+b,c+a],`先用相交弦定理求PD，再把CP與PD相加。`,`AP·PB＝CP·PD，所以PD＝${a}×${b}÷${c}＝${other}；CD＝${c}＋${other}＝${total}。`,s)}
    const near=40+2*k,far=near+80+4*k;return olympiadMake(`由圓外一點引兩條割線，所截近弧為${near}°、遠弧為${far}°。若把其中一條割線改成切線且保持同一遠弧，新的切割線夾角為多少度？`,`${far/2}°`,[`${(far-near)/2}°`,`${near/2}°`,`${180-far/2}°`],`切線與弦所成角等於所截弧的一半。`,`新角所截弧為${far}°，所以角為${far/2}°。`,s)
  }
  if(unit==='幾何推理與證明'){
    if(t===0){const p=[2,3,5,7,11,13,17,19,23,29][k];return olympiadMake(`若整數n²可被質數${p}整除，以下哪一條推理最能完成「n也可被${p}整除」的證明？`,`使用逆否：n除以${p}的非零餘數平方不可能餘0`,[`直接將n²除以${p}`,`只驗證n＝1到${p}`,`假設n本來就能被${p}整除`],`質數情況可用歐幾里得引理或逆否命題。`,`若${p}∤n，則n在模${p}下非零；質數模下非零數的平方仍非零，與${p}|n²矛盾。`,s)}
    const n=5+k;return olympiadMake(`用反證法證明「${n}個連續整數的乘積可被${n}整除」時，下列哪個觀點最有效？`,'把每個整數看成模n的連續餘數',[`只比較首尾大小`,`假設每個數都是質數`,`將所有數平方`],`連續${n}個整數在模${n}下恰包含所有餘數。`,`其中必有一個數餘0，因此該數可被${n}整除，整個乘積也可被${n}整除。`,s)
  }
  if(unit==='二次函數'){
    if(t===0){const r=3+k,s2=8+k,shift=2+k%3;const R=r+shift,S=s2+shift,ans=1-(R+S)+R*S;return olympiadMake(`一首項係數為1的二次方程式兩根為${r}、${s2}。將兩根各增加${shift}後得到新方程式g(x)＝x²＋Ax＋B，則1＋A＋B為何？`,ans,[R*S,R+S,1+R*S],`先求新根，再利用根與係數關係；注意所求其實也是g(1)。`,`新根為${R}、${S}，故A＝－(${R}＋${S})、B＝${R}×${S}；1＋A＋B＝1－${R+S}＋${R*S}＝${ans}。`,s)}
    const c=8+k,m=4+k%3,count=2*m+1,sum=count*c*c+2*m*(m+1)*(2*m+1)/6;return olympiadMake(`以整數n為中心的${count}個連續整數，其平方和為${sum}。若把n視為二次方程式的正根，該根為何？`,c,[c+m,c-m,c*c],`利用對稱展開，所有一次項互相抵消。`,`平方和＝${count}n²＋2(1²＋…＋${m}²)，代入得n²＝${c*c}；取正根n＝${c}。`,s)
  }
  if(unit==='資料分析與機率'){
    if(t===0){const n=6+k,ans=factorial(n)/12;return olympiadMake(`${n}人排成一列，甲必須在乙、丙左方，丁必須在乙、丙右方，其餘人不限。共有多少種排法？`,ans,[ans/2,ans*2,factorial(n)/6],`先選出甲、乙、丙、丁在四個相對位置中的順序，再安排其他人。`,`四人相對順序中甲固定最左、丁固定最右，乙丙可交換，共2種；占4!的2/24＝1/12，所以共有${ans}種。`,s)}
    const N=18+2*k,d=4+k%3;let ans=0;for(let r=1;r<=d;r++){const len=Math.floor((N-r)/d)+1;ans+=Math.ceil(len/2)}return olympiadMake(`從1到${N}中等可能地選一個「最大合法集合」，規定集合內任兩數之差不得為${d}。這類集合最多含幾個數？`,ans,[ans-1,Math.ceil(N/2),ans+1],`依模${d}分成鏈，每條鏈不能選相鄰節點。`,`各鏈最大獨立集大小為⌈L/2⌉，總和為${ans}。`,s)
  }
  if(unit==='空間幾何與立體圖形'){
    if(t===0){const a=4+2*k,[halfB,h,alt]=[[3,4,5],[5,12,13],[6,8,10],[8,15,17]][k%4],b=2*halfB,area=a*alt/2;return olympiadMake(`長方體長${a}、寬${b}、高${h}。K為底面中心，E、F為同一條上方長邊的兩端點。△KEF面積為何？`,area,[a*b/2,a*h/2,a*halfB/2],`以EF為底，先求底面中心K到上方長邊EF的空間距離。`,`K到EF的垂距＝√[(${b}/2)²＋${h}²]＝√(${halfB}²＋${h}²)＝${alt}；面積＝${a}×${alt}÷2＝${area}。`,s)}
    const n=4+k;return olympiadMake(`邊長${2*n}的正方體六面塗色後切成邊長2的小立方體。隨機取一個小立方體，恰有兩面塗色的機率為何？`,frac(12*(n-2),n**3),[frac(8,n**3),frac(6*(n-2)**2,n**3),frac(12*n,n**3)],`恰兩面塗色者在12條稜上，但不含頂點。`,`每條稜有${n-2}個，故有${12*(n-2)}個；總數${n**3}個，機率${frac(12*(n-2),n**3)}。`,s)
  }
  throw new Error(`未支援單元：${unit}`);
}

function factorial(n){let v=1;for(let i=2;i<=n;i++)v*=i;return v}

const easyMake=(q,a,w,h,e,s)=>({
  ...make(q,a,w,h,e,'easy',s),
  difficultyDesign:{name:'基礎理解',steps:'1至2步',description:'數字與情境採分散設計，檢查單一核心觀念，不連續重複同一組小數字'}
});

function upgradedEasy(unit,i,grade,original){
  const nums=[3,11,6,17,4,23,8,14,5,19,7,26,9,16,12,21,10,28,13,24],n=nums[i],t=i%4,s=4500+grade*100+i;
  if(unit==='數列與等差數列'){
    const d=[2,5,3,7,4][i%5],p=4+(i%6),last=n+(p-1)*d;
    if(t===0)return easyMake(`等差數列${n}、${n+d}、${n+2*d}、…的公差為何？`,d,[n,d+1,2*d],`相鄰兩項相減。`,`${n+d}－${n}＝${d}。`,s);
    if(t===1)return easyMake(`等差數列首項${n}、公差${d}，第${p}項為何？`,last,[last-d,last+d,n+p*d],`用aₚ＝a₁＋(p－1)d。`,`a_${p}＝${n}＋(${p}－1)×${d}＝${last}。`,s);
    if(t===2)return easyMake(`等差數列第${p}項為${last}、公差${d}，首項為何？`,n,[n+d,last-d,n-1],`從第${p}項倒推${p-1}個公差。`,`${last}－(${p}－1)×${d}＝${n}。`,s);
    return easyMake(`第1排有${n}個座位，每排比前排多${d}個，第${p}排有幾個？`,last,[last-d,last+d,n*p],`排數從第1排開始，所以只增加${p-1}次。`,`第${p}排＝${n}＋(${p}－1)×${d}＝${last}。`,s);
  }
  if(unit==='函數及其圖形'){
    const m=[2,5,-3,4][i%4],x=2+(i%7),b=i-10,y=m*x+b;
    if(t===0)return easyMake(`函數y＝${m}x${b>=0?'＋'+b:'－'+(-b)}，當x＝${x}時y為何？`,y,[y-m,y+m,m+b],`代入x後依運算順序計算。`,`y＝${m}×${x}${b>=0?'＋'+b:'－'+(-b)}＝${y}。`,s);
    if(t===1)return easyMake(`直線y＝${m}x${b>=0?'＋'+b:'－'+(-b)}與y軸交點為何？`,`(0,${b})`,[`(${b},0)`,`(0,${m})`,`(${m},${b})`],`y軸上的點x＝0。`,`代入x＝0，得交點(0,${b})。`,s);
    if(t===2)return easyMake(`點P(${x},${y})向左${n%5+2}單位後，座標為何？`,`(${x-(n%5+2)},${y})`,[`(${x},${y-(n%5+2)})`,`(${x+(n%5+2)},${y})`,`(${x-(n%5+2)},${y-(n%5+2)})`],`水平移動只改變x座標。`,`x減${n%5+2}，y不變。`,s);
    return easyMake(`若點(${x},${y})在y＝${m}x＋c上，c為何？`,b,[y-m,m,y-m*x+1],`把點的坐標代入函數。`,`${y}＝${m}×${x}＋c，所以c＝${b}。`,s);
  }
  if(unit==='幾何推理與證明'){
    const A=28+(n%10)*3,B=37+(i%6)*4,C=180-A-B;
    if(t===0)return easyMake(`三角形兩內角為${A}°、${B}°，第三角為何？`,`${C}°`,[`${180-A}°`,`${A+B}°`,`${Math.abs(A-B)}°`],`三角形內角和180°。`,`第三角＝180°－${A}°－${B}°＝${C}°。`,s);
    if(t===1){const pair=[['ABC','DEF'],['PQR','XYZ'],['KLM','STU'],['ABD','CDE'],['MNP','QRS']][Math.floor(i/4)];return easyMake(`△${pair[0]}與△${pair[1]}有三組對應邊分別相等，應用哪一個全等判定？`,'SSS',[`SAS`,`ASA`,`AAS`],`三組條件全部是邊。`,`三邊對應相等使用SSS。`,s)}
    if(t===2)return easyMake(`若a∥b，一條截線形成的同位角為${A}°，另一個同位角為何？`,`${A}°`,[`${180-A}°`,`${90-A}°`,`${2*A}°`],`平行線的同位角相等。`,`所求也是${A}°。`,s);
    const claims=[['所有整數都是偶數','舉出一個奇數反例','整數3不是偶數'],['所有質數都是奇數','舉出質數2','2是偶質數'],['所有平方數都大於0','舉出平方數0','0²不大於0'],['所有長方形都是正方形','舉出長寬不等的長方形','2×5長方形不是正方形'],['所有3的倍數都是6的倍數','舉出整數9','9是3的倍數但不是6的倍數']][Math.floor(i/4)];
    return easyMake(`要否定命題「${claims[0]}」，下列何者足夠？`,claims[1],[`再驗證兩個符合的例子`,`畫一個無關圖形`,`先假設命題正確`],`全稱命題只要一個反例即可否定。`,`${claims[2]}，因此原命題不成立。`,s);
  }
  if(unit==='二次函數'){
    const h=n%9-4,v=3+(i*5)%17,x=h+(2+i%4),y=(x-h)**2+v;
    if(t===0)return easyMake(`二次函數y＝(x${h>=0?'－'+h:'＋'+(-h)})²＋${v}的頂點為何？`,`(${h},${v})`,[`(${-h},${v})`,`(${h},${-v})`,`(0,${v})`],`頂點式y＝(x－h)²＋k的頂點是(h,k)。`,`頂點為(${h},${v})。`,s);
    if(t===1)return easyMake(`y＝－${2+i%5}x²的圖形開口方向為何？`,'向下',[`向上`,`向右`,`向左`],`x²係數為負。`,`二次項係數小於0，所以開口向下。`,s);
    if(t===2)return easyMake(`y＝(x${h>=0?'－'+h:'＋'+(-h)})²＋${v}，當x＝${x}時y為何？`,y,[y-v,y+v,(x-h)+v],`先算括號，再平方。`,`y＝(${x}－${h})²＋${v}＝${y}。`,s);
    return easyMake(`拋物線y＝(x${h>=0?'－'+h:'＋'+(-h)})²＋${v}的對稱軸為何？`,`x＝${h}`,[`y＝${h}`,`x＝${v}`,`x＝${-h}`],`對稱軸通過頂點。`,`頂點x座標為${h}，所以對稱軸x＝${h}。`,s);
  }
  if(unit==='會考素養閱讀'&&grade===9){
    const price=17+(n%8)*3,count=4+(i%9),fee=35+(i%5)*10,total=price*count+fee;
    if(t===0)return easyMake(`活動材料每份${price}元，另收運送費${fee}元。購買${count}份共需多少元？`,total,[price*count,total-fee,total+price],`材料費加固定運送費。`,`實付${price}×${count}＋${fee}＝${total}元。`,s);
    if(t===1){const scale=10000*(2+i%7),cm=2+i%8;return easyMake(`地圖比例尺1：${scale}，圖上${cm}公分代表實際多少公尺？`,scale*cm/100,[scale*cm,scale/100,cm*100],`先換成實際公分，再除以100。`,`實際${scale*cm}公分＝${scale*cm/100}公尺。`,s)}
    if(t===2){const a=40+i*3,b=55+i*2,c=70+i;return easyMake(`三次測量值為${a}、${b}、${c}，平均值為何？`,(a+b+c)/3,[a+b+c,(a+c)/2,b],`三數相加後除以3。`,`平均＝(${a}＋${b}＋${c})÷3＝${(a+b+c)/3}。`,s)}
    const occurrence=Math.floor(i/4),totalN=200+40*occurrence,pct=[15,35,45,65,75][occurrence],part=totalN*pct/100;return easyMake(`問卷共${totalN}人，其中${part}人選擇A方案，占全部多少百分比？`,`${pct}%`,[`${part/totalN}%`,`${100-pct}%`,`${pct/10}%`],`人數除以總數再乘100%。`,`${part}÷${totalN}×100%＝${pct}%。`,s);
  }
  return original;
}

function sequence(i,level){
  const k=spreadK(i),t=i%5,s=2000+i+(level==='hard'?100:0);
  if(level==='medium'){
    if(t===0){const a=4+k,d=3+k,n=12+k,an=a+(n-1)*d,S=n*(a+an)/2;return make(`某劇場第一排有${a}個座位，之後每一排都比前一排多${d}個，共有${n}排。若預留最後一排不售票，其餘座位全部售出，可售出多少張票？`,S-an,[S,S-a,S-2*an],`先建立等差數列，算前${n}排總和，再扣除最後一排。`,`第${n}排為${a}＋(${n}－1)×${d}＝${an}；總座位為${n}×(${a}＋${an})÷2＝${S}，扣除最後一排得${S-an}。`,'medium',s)}
    if(t===1){const a=8+k,d=4+k,x=7+2*k,term=a+(x-1)*d;return make(`一個等差數列首項為${a}、公差為${d}。若某一項等於${term}，且從首項到該項共有奇數項，這一項是第幾項？`,x,[x-1,x+1,x+2],`把目標值代入 aₙ＝a₁＋(n－1)d，再檢查項數條件。`,`由${term}＝${a}＋(n－1)×${d}，得n＝${x}；${x}為奇數，符合條件。`,'medium',s)}
    if(t===2){const d=2+k,n=10+k,a=3+k,S=n*(2*a+(n-1)*d)/2,remove=a+4*d;return make(`編號1到${n}的置物櫃依序放入一個等差數列數量的球，第一櫃${a}顆、公差${d}顆。第5櫃暫停使用後，其餘櫃共有多少顆球？`,S-remove,[S,S-(a+5*d),S-remove-a],`先求全部${n}項的總和，再扣掉第5項。`,`總數為${n}[2×${a}＋(${n}－1)×${d}]÷2＝${S}；第5項是${remove}，故剩${S-remove}。`,'medium',s)}
    if(t===3){const a=5+k,d=3+k,n=8+k,S=n*(2*a+(n-1)*d)/2;return make(`小晴每週存款形成等差數列，第一週存${a}元，以後每週多存${d}元。她前${n}週共存多少元？`,S,[a+(n-1)*d,n*(a+(n-1)*d),S-d],`同時辨認首項、公差與項數，再用等差級數公式。`,`Sₙ＝${n}[2×${a}＋(${n}－1)×${d}]÷2＝${S}。`,'medium',s)}
    const a=2+k,d=5+k,p=4+k,q=10+k,diff=(q-p)*d;return make(`等差數列首項為${a}、公差為${d}。第${q}項與第${p}項的差是多少？`,diff,[(q-p+1)*d,(q-p-1)*d,a+diff],`兩項相減時首項會消去，只剩項次差乘公差。`,`a_${q}－a_${p}＝[(${q}－1)－(${p}－1)]×${d}＝${diff}。`,'medium',s)
  }
  if(t===0){const a=2+k,d=3+k,n=9+k,m=5+k,total=n*(2*a+(n-1)*d)/2,tail=m*(2*(a+(n-m)*d)+(m-1)*d)/2;return make(`等差數列首項${a}、公差${d}，共有${n}項。若只保留最後${m}項，保留部分占原總和的比例為何？`,frac(tail,total),[frac(m,n),frac(total-tail,total),frac(a+(n-m)*d,a+(n-1)*d)],`先分別算完整級數與末${m}項級數，再約分。`,`全體和為${total}；末${m}項首項為${a+(n-m)*d}，其和為${tail}，比例為${frac(tail,total)}。`,'hard',s)}
  if(t===1){const x=4+k,n=12+k,S=n*(2*x+(n-1)*2)/2,ans=x+(n-1)*2;return make(`正整數等差數列公差為2，共${n}項，總和為${S}。若首項小於末項的四分之一，末項是多少？`,ans,[x,S/n,ans-2],`由總和先求「首項＋末項」，再配合公差與項數聯立。`,`末項＝首項＋${2*(n-1)}。由${n}(首項＋末項)÷2＝${S}得首項${x}、末項${ans}，且限制成立。`,'hard',s)}
  if(t===2){const a=3+k,d=2+k,n=8+k,total=n*(2*a+(n-1)*d)/2,odd=Math.ceil(n/2)*(a+(a+(2*(Math.ceil(n/2)-1))*d))/2;return make(`等差數列共有${n}項，首項${a}、公差${d}。取出所有奇數項次的項後，取出各項總和為何？`,odd,[total,total-odd,Math.ceil(n/2)*(a+(n-1)*d)],`奇數項次本身另成一個公差為原來兩倍的等差數列。`,`共有${Math.ceil(n/2)}個奇數項次，首項${a}、公差${2*d}，故其和為${odd}。`,'hard',s)}
  if(t===3){const a=2+k,d=3+k,p=4+k,q=9+k,A=a+(p-1)*d,B=a+(q-1)*d;return make(`一等差數列的第${p}項為${A}、第${q}項為${B}。若插入一個數後，這三個數依舊能成為等差數列，且插入數介於兩者之間，該數為何？`,(A+B)/2,[B-A,A+d,B-d],`介於兩數間且三數成等差時，中間數是兩端的算術平均數。`,`所求為(${A}＋${B})÷2＝${(A+B)/2}。原數列資訊也可驗得兩端差為偶數。`,'hard',s)}
  const a=1+k,d=2+k,n=10+k,S=n*(2*a+(n-1)*d)/2,c=3+k;return make(`等差數列前${n}項和為${S}。若每一項都先乘以2再加${c}，新數列前${n}項和是多少？`,2*S+c*n,[2*S+c,2*(S+c*n),S+c*n],`總和具有線性：逐項乘2使總和乘2，逐項加${c}共增加${n}×${c}。`,`新總和＝2×${S}＋${n}×${c}＝${2*S+c*n}。`,'hard',s)
}

function linear(i,level){
  const k=spreadK(i),t=i%5,s=2200+i+(level==='hard'?100:0);
  if(level==='medium'){
    const v=Math.floor(i/10),kind=i%10,seed=2300+i;
    if(kind===0){const m=3+v,b=7+2*v,x1=2+v,x2=6+v,y1=m*x1+b,y2=m*x2+b,x3=9+v,ans=m*x3+b;return make(`某實驗的x、y呈一次函數關係，已知(${x1},${y1})與(${x2},${y2})均在圖形上。當x＝${x3}時，y為何？`,ans,[ans-m,ans+m,y1+y2],`先由兩點求斜率，再求截距並代入新x值。`,`斜率＝(${y2}－${y1})÷(${x2}－${x1})＝${m}，截距${b}，故y＝${m}×${x3}＋${b}＝${ans}。`,'medium',seed)}
    if(kind===1){const base=35+5*v,rate=8+2*v,x=7+v,total=base+rate*x+rate;return make(`租借腳踏車收基本費${base}元，之後每小時${rate}元。小華共付${total}元，其中另含一次性的${rate}元保險費；他實際租了幾小時？`,x,[x+1,x-1,(total-base)/rate],`總金額先扣除基本費與一次性保險費，再除以每小時費率。`,`租用費為${total}－${base}－${rate}＝${rate*x}元，所以租了${x}小時。`,'medium',seed)}
    if(kind===2){const a=2+v,b=26+2*v,c=5+v,d=8+2*v,L=14+v;let ans=0;for(let x=1;x<=L;x++)if(a*x+b<c*x+d)ans++;return make(`甲、乙方案費用為${a}x＋${b}元與${c}x＋${d}元。若x只能取1至${L}的整數，甲方案較便宜的x共有幾個？`,ans,[ans-1,ans+1,L-ans],`解一次不等式後，還要與指定的整數範圍取交集。`,`由${a}x＋${b}＜${c}x＋${d}求得分界，再計算1至${L}內符合的整數，共${ans}個。`,'medium',seed)}
    if(kind===3){const drop=4+v,t1=3+v,t2=8+v,start=58+6*v,y1=start-drop*t1,y2=start-drop*t2,empty=start/drop;return make(`水箱水量與時間呈線性關係。${t1}分鐘時有${y1}公升，${t2}分鐘時有${y2}公升；照此速度，幾分鐘時水量為0？`,empty,[empty-1,empty+1,(y1+y2)/drop],`由兩筆資料求每分鐘變化量，再反推初始水量。`,`斜率為(${y2}－${y1})÷(${t2}－${t1})＝－${drop}，初始水量${start}公升，因此${empty}分鐘時為0。`,'medium',seed)}
    if(kind===4){const m=2+v,b=12+4*v,x1=1+v,x2=5+v,y1=m*x1+b,y2=m*x2+b,area=frac(b*b,2*m);return make(`直線通過(${x1},${y1})與(${x2},${y2})，並與兩坐標軸圍成三角形。該三角形面積為何？`,area,[frac(b*b,m),frac(b*m,2),b],`先由兩點求直線，再找兩軸截距。`,`直線為y＝${m}x＋${b}，截距長為${b}與${frac(b,m)}，面積＝${area}。`,'medium',seed)}
    if(kind===5){const m=-2-v,b=30+5*v,x=4+v,y=m*x+b,move=3+v,ans=m*(x+move)+b;return make(`點P(${x},${y})在直線y＝${m}x＋${b}上。沿著此直線把P移到x座標增加${move}的位置，新點的y座標為何？`,ans,[y+move,y-move,ans-m],`不是只做水平平移；x改變後須重新代入直線。`,`新x＝${x+move}，故y＝${m}×${x+move}＋${b}＝${ans}。`,'medium',seed)}
    if(kind===6){const fixed=45+5*v,rate=12+2*v,budget=190+20*v,ans=Math.floor((budget-fixed)/rate);return make(`某活動場地費${fixed}元，每人材料費${rate}元，總預算不超過${budget}元。最多可讓多少人參加？`,ans,[ans-1,ans+1,Math.floor(budget/rate)],`列出固定費＋人數費用≤預算，最後取整數下界。`,`由${fixed}＋${rate}x≤${budget}，得x≤${(budget-fixed)/rate}，故最多${ans}人。`,'medium',seed)}
    if(kind===7){const m=3+v,b=-6-2*v,p=5+v,q=m*p+b;return make(`一直線的x截距為${-b/m}，且通過點(${p},${q})。下列何者為此直線方程式？`,`y＝${m}x${b<0?'－'+(-b):'＋'+b}`,[`y＝${p}x＋${b}`,`y＝${m}x＋${-b}`,`y＝${-m}x＋${q}`],`由x截距先得到一點，再和已知點求斜率。`,`兩點為(${-b/m},0)與(${p},${q})，斜率${m}，所以方程式為y＝${m}x－${-b}。`,'medium',seed)}
    if(kind===8){const m=4+v,b=5+2*v,x=3+v,y=m*x+b,unknown=x+4,ans=m*unknown+b;return make(`一次函數y＝mx＋b通過(${x},${y})，且當x增加4時，y增加${4*m}。若另一點的x座標為${unknown}，其y座標為何？`,ans,[ans-4,ans+4,y+4],`由變化量先求斜率，再利用已知點或直接使用增量。`,`m＝${4*m}÷4＝${m}；y隨x增加4而增加${4*m}，所以新y＝${y}＋${4*m}＝${ans}。`,'medium',seed)}
    const m1=2+v,b1=8+2*v,m2=-(1+v),b2=20+5*v,x=(b2-b1)/(m1-m2),y=m1*x+b1,ans=x+y;return make(`兩直線y＝${m1}x＋${b1}與y＝${m2}x＋${b2}相交於P(a,b)。求a＋b。`,ans,[x,y,x*y],`聯立求交點的兩個坐標，再相加。`,`令兩式相等得a＝${x}，代回得b＝${y}，所以a＋b＝${ans}。`,'medium',seed)
  }
  if(t===0){const a=2+k,b=18+2*k,c=5+k,d=3+k,x=(b-c)/(d-a),y=a*x+b;return make(`兩個方案分別為y＝${a}x＋${b}與y＝${d}x＋${c}。若只允許x為正整數，且要選費用較低者，從第幾個整數x開始，第二方案會嚴格較貴？`,Math.floor(x)+1,[x,Math.ceil(x)-1,Math.floor(y)],`先求兩直線交點，再用不等式與「嚴格較貴、正整數」判斷邊界。`,`令${d}x＋${c}＞${a}x＋${b}，得x＞${x}，故最小正整數為${Math.floor(x)+1}。`,'hard',s)}
  if(t===1){const p=3+k,q=2+k,r=5+k,x=4+k,y=p*x+q,z=y+r*x;return make(`機器A輸出y＝${p}x＋${q}，機器B再把A的輸出加上${r}x。若最後輸出為${z}，輸入x為何？`,x,[x-1,x+1,y],`先把兩段規則合成一個函數，再反解輸入。`,`最後輸出z＝(${p}＋${r})x＋${q}。代入${z}，得x＝${x}。`,'hard',s)}
  if(t===2){const m=2+k,b=6+k,p=5+k,x=3+k,y=m*x+b;return make(`直線L：y＝${m}x＋${b}。點P(${x},${y})在L上。若將P向右移${p}單位後，再垂直移動使其回到L，應向哪個方向移多少單位？`,`向上${m*p}單位`,[`向下${m*p}單位`,`向上${p}單位`,`向下${p}單位`],`水平增加${p}時，直線上的y應增加「斜率×水平變化」。`,`新x增加${p}，L上的y增加${m}×${p}＝${m*p}，故需向上移${m*p}單位。`,'hard',s)}
  if(t===3){const m=3+k,a=2+k,x=2+k,b=a+(m-1)*x,y=m*x+a;return make(`直線y＝${m}x＋${a}與直線y＝x＋${b}相交。過交點且與x軸平行的直線，其方程式為何？`,`y＝${y}`,[`x＝${x}`,`y＝${x}`,`y＝${b-a}`],`先求交點；與x軸平行的直線由交點的y座標決定。`,`聯立得x＝${x}，交點y＝${y}，所以所求為y＝${y}。`,'hard',s)}
  const m=2+k,h=3+k,b=2*m*h,x1=1+k%3,x2=x1+3,y1=m*x1+b,y2=m*x2+b,area=b*h;return make(`直線L通過(${x1},${y1})與(${x2},${y2})，並分別與x軸、y軸交於A、B兩點。若O為原點，則△OAB面積為何？`,area,[area/2,2*area,m*h],`先由兩點求斜率與y軸截距，再求x軸截距，最後計算三角形面積。`,`L的斜率為${m}，方程式為y＝${m}x＋${b}；兩截距長分別為${2*h}與${b}，故面積＝${2*h}×${b}÷2＝${area}。`,'hard',s)
}

function triangle(i,level){
  const k=spreadK(i),t=i%5,s=2400+i+(level==='hard'?100:0);
  if(level==='medium'){
    if(t===0){const A=40+2*k,B=(180-A)/2;return make(`等腰三角形ABC中，AB＝AC。從A作角平分線交BC於D，若∠A＝${A}°，則∠ABD為多少度？`,`${B}°`,[`${A/2}°`,`${180-A}°`,`${90-A/2}°`],`先利用等腰三角形兩底角相等；D在BC上。`,`兩底角各為(180°－${A}°)÷2＝${B}°，所以∠ABD＝${B}°。`,'medium',s)}
    if(t===1){const a=5+k,b=8+k,min=b-a+1,max=a+b-1,count=max-min+1;return make(`三角形兩邊長為${a}、${b}，第三邊為整數。第三邊共有多少種可能？`,count,[count-1,count+1,a+b],`第三邊x需同時滿足|${b}－${a}|＜x＜${a}＋${b}。`,`整數x從${min}到${max}，共有${count}種。`,'medium',s)}
    if(t===2){const ext=110+2*k,A=45+k,B=ext-A;return make(`三角形ABC在C點的外角為${ext}°，且∠A＝${A}°。若AB＞BC，則∠B是多少度？`,`${B}°`,[`${180-ext}°`,`${ext}°`,`${B-A}°`],`外角等於兩個不相鄰內角和，再檢查邊角大小關係。`,`∠A＋∠B＝${ext}°，故∠B＝${B}°；AB對∠C＝${180-ext}°，確實大於BC所對的${A}°。`,'medium',s)}
    if(t===3){const A=30+5*k;return make(`尺規作圖時，已知∠A＝${A}°及其兩鄰邊長，可以唯一作出三角形。這主要使用哪一種全等條件？`,'SAS',[`ASA`,`SSS`,`AAS`],`已知的是兩邊以及兩邊的夾角。`,`兩鄰邊與它們的夾角決定三角形，屬SAS。`,'medium',s)}
    const A=50+k*2,B=60+k,C=180-A-B,diff=180-A/2-2*C;return make(`三角形ABC中，∠A＝${A}°、∠B＝${B}°。若AD為∠A的角平分線，則∠ADC與∠C的差為多少度？`,`${diff}°`,[`${A/2}°`,`${B-C}°`,`${180-A-B}°`],`在三角形ACD中，∠CAD＝∠A÷2。`,`∠C＝${C}°，∠CAD＝${A/2}°，故∠ADC＝${180-A/2-C}°，與∠C相差${diff}°。`,'medium',s)
  }
  if(t===0){const a=7+k,b=10+k,count=2*a-1;return make(`三角形三邊為${a}、${b}、正整數x。若以x為最長邊，且三邊互不相等，x有幾種可能？`,a-1,[a,a-2,count],`同時使用x≥${b}、x＜${a+b}，並排除x＝${b}；也要確認另兩邊和大於x。`,`x可為${b+1}到${a+b-1}，共${a-1}種。`,'hard',s)}
  if(t===1){const A=18+3*k,x=(180-A)/3;return make(`等腰三角形ABC中AB＝AC，點D在BC上，且AD＝BD。若∠CAD＝${A}°，則∠ABC為多少度？`,`${x}°`,[`${90-A}°`,`${2*A}°`,`${60+A/3}°`],`設∠BAD＝x，利用AD＝BD與AB＝AC建立兩組等腰角關係後聯立。`,`設∠BAD＝x。由AD＝BD得∠ABD＝∠BAD＝x；又AB＝AC，所以∠ABC＝x。三角形ACD的角度關係給出3x＋${A}＝180°，故x＝${x}°。`,'hard',s)}
  if(t===2){const n=6+k;return make(`只用直尺與圓規，要把一個已知角連續平分${n}次。若每次平分都保留所有新射線，最後原角內共有多少條新射線？`,2**n-1,[2**n,2*n,n*n],`每次平分會使區間數加倍；新射線數比區間數少1。`,`第${n}次後原角分成${2**n}等份，內部新射線共有${2**n-1}條。`,'hard',s)}
  if(t===3){const A=72+4*k,ans=1.5*A-90;return make(`三角形ABC中，AB＝AC，∠A＝${A}°。在BC上取D使BD＝AD。則∠CAD為多少度？`,`${ans}°`,[`${A/2}°`,`${90-A/2}°`,`${180-2*A}°`],`由BD＝AD先把∠BAD與∠B連結，再用頂角分割。`,`底角∠B＝(180°－${A}°)÷2。因BD＝AD，∠BAD＝∠B；所以∠CAD＝${A}°－∠BAD＝${ans}°。`,'hard',s)}
  const a=5+k,b=7+k,c=9+k;return make(`兩三角形各有兩邊長${a}、${b}，第三邊都為${c}，但其中一個三角形把長${c}的邊畫在已知角的另一側。下列何者正確？`,'仍可由SSS判定全等',[`不能判定全等`,`只能判定相似`,`必須再知道一角`],`全等判定只看三組對應邊長，不受圖形翻轉影響。`,`三邊分別相等即符合SSS；鏡射不改變全等性。`,'hard',s)
}

function parallel(i,level){
  const k=spreadK(i),t=i%5,s=2600+i+(level==='hard'?100:0);
  if(level==='medium'){
    if(t===0){const a=55+3*k;return make(`兩平行線被截線所截，一個內錯角為${a}°。與它同旁內角的角度為何？`,`${180-a}°`,[`${a}°`,`${90-a}°`,`${180-2*a}°`],`同旁內角互補。`,`所求＝180°－${a}°＝${180-a}°。`,'medium',s)}
    if(t===1){const a=6+k,b=10+k,h=4+k,area=(a+b)*h/2;return make(`梯形兩底長${a}、${b}，高${h}。若沿一條對角線分成兩個三角形，兩三角形面積和為何？`,area,[a*h,b*h,(b-a)*h/2],`不必分別求兩三角形，總面積就是梯形面積。`,`面積＝(${a}＋${b})×${h}÷2＝${area}。`,'medium',s)}
    if(t===2){const d1=8+2*k,d2=12+2*k;return make(`菱形兩條對角線長分別為${d1}與${d2}。以對角線交點和兩相鄰頂點形成的三角形面積是多少？`,d1*d2/8,[d1*d2/2,d1*d2/4,(d1+d2)/2],`菱形對角線互相垂直平分，小三角形兩股是兩對角線的一半。`,`面積＝(${d1}÷2)×(${d2}÷2)÷2＝${d1*d2/8}。`,'medium',s)}
    if(t===3){const x=5+k,c=4+k,d=2*x-c;return make(`平行四邊形一組對角分別標為(3x＋${c})°與(5x－${d})°。求x。`,x,[x+1,x-1,180],`平行四邊形對角相等。`,`3x＋${c}＝5x－${d}，解得x＝${x}。`,'medium',s)}
    const a=7+k,b=11+k;return make(`一個四邊形只有一組對邊平行，兩腰長為${a}與${b}。若兩條對角線等長，則它一定是什麼圖形？`,'等腰梯形',[`平行四邊形`,`菱形`,`箏形`],`梯形中，對角線等長可判定為等腰梯形。`,`只有一組對邊平行先確定為梯形；對角線等長，所以是等腰梯形。`,'medium',s)
  }
  if(t===0){const a=50+2*k;return make(`平行四邊形ABCD中，∠A＝${a}°。角平分線AE交BC於E，且AB＝${5+k}。若E在線段BC上，則BE長為何？`,5+k,[10+2*k,a,180-a],`利用AD∥BC，把∠DAE轉成∠AEB，再由等角得到等腰三角形。`,`∠BAE＝∠DAE，且AD∥BC使∠DAE＝∠AEB，所以△ABE中AB＝BE＝${5+k}。`,'hard',s)}
  if(t===1){const a=6+k,b=9+k;return make(`菱形ABCD的邊長為${Math.sqrt(a*a+b*b)}，兩對角線交於O。若AO＝${a}、BO＝${b}，菱形面積為何？`,2*a*b,[a*b,4*a*b,a*a+b*b],`對角線互相垂直平分，完整對角線為2AO與2BO。`,`面積＝(2×${a})(2×${b})÷2＝${2*a*b}。`,'hard',s)}
  if(t===2){const x=4+k,y=7+k;return make(`四邊形ABCD的對角線交於O，已知AO＝CO＝${x}、BO＝DO＝${y}，且AC⊥BD。它至少一定是哪一類圖形？`,'菱形',[`長方形`,`正方形`,`等腰梯形`],`對角線互相平分先判定平行四邊形，再加上垂直條件。`,`對角線互相平分，所以是平行四邊形；平行四邊形對角線垂直，故為菱形。`,'hard',s)}
  if(t===3){const a=8+k,h=6+k,mid=10+k;return make(`梯形中位線長${mid}、高${h}，且上底比下底短${a}。此梯形面積為何？`,2*mid*h/2,[mid*h/2,a*h,2*mid+h],`中位線等於兩底和的一半；面積也等於中位線乘高。`,`梯形面積＝中位線×高＝${mid}×${h}＝${mid*h}。`,'hard',s)}
  const a=4+k,b=7+k;return make(`平行四邊形ABCD中，從A、C分別向對角線BD作垂線，垂足為E、F。若AE＝${a}、BD＝${b}，則CF為何？`,a,[b,a+b,Math.abs(b-a)],`對角線把平行四邊形分成等面積三角形；以BD為底比較高。`,`△ABD與△CBD同底BD且面積相等，因此對BD的高AE＝CF＝${a}。`,'hard',s)
}

// The two literacy units deliberately use the same generator family but different seeds and contexts.
function literacy(i,level,grade){
  const k=spreadK(i)+(grade===9?9:0),t=i%5,s=2800+i+grade*100+(level==='hard'?50:0);
  if(level==='medium'){
    if(t===0){const base=80+10*k,per=12+k,n=9+k,cost=base+per*n,discount=20;return make(`共享單車方案收基本費${base}元，每小時${per}元。使用${n}小時後折抵${discount}元，實付多少元？`,cost-discount,[cost,per*n-discount,base+per*(n-1)-discount],`先依方案算原價，再處理折抵。`,`原價${base}＋${per}×${n}＝${cost}，折抵後為${cost-discount}元。`,'medium',s)}
    if(t===1){const total=120+20*k,p=35+5*k,sold=total*p/100,remain=total-sold;return make(`某活動準備${total}份材料，上午用掉${p}%，下午又用掉剩下材料的25%。下午用掉幾份？`,remain/4,[total/4,sold/4,remain*0.75],`第二個百分比的基準是上午使用後的剩餘量。`,`上午後剩${total}－${sold}＝${remain}份；下午用${remain}×25%＝${remain/4}份。`,'medium',s)}
    if(t===2){const speed=60+5*k,time=2+k,rest=0.5,dist=speed*time;return make(`遊覽車以每小時${speed}公里行駛${time}小時，中途休息${rest}小時。若「平均行進速度」不計休息，是多少公里／小時？`,speed,[dist/(time+rest),dist,speed*(time+rest)/time],`辨認題目指定平均「行進」速度，不把休息時間算入。`,`行進距離${dist}公里，行進時間${time}小時，平均行進速度仍為${speed}公里／小時。`,'medium',s)}
    if(t===3){const a=3+k,b=5+k,total=a+b,p=a/total;return make(`盒中有${a}張中獎券與${b}張未中獎券，不放回連抽兩張。至少一張中獎的機率為何？`,frac(total*(total-1)-b*(b-1),total*(total-1)),[frac(a,total),frac(a*(a-1),total*(total-1)),frac(b,total)],`用反事件：1－兩張都未中獎。`,`機率＝1－${b}/${total}×${b-1}/${total-1}＝${frac(total*(total-1)-b*(b-1),total*(total-1))}。`,'medium',s)}
    const l=12+2*k,w=8+2*k,path=1,outer=(l+2)*(w+2)-l*w;return make(`長${l}公尺、寬${w}公尺的花圃外圍鋪設寬1公尺的步道。步道面積是多少平方公尺？`,outer,[l*w,2*(l+w), (l+1)*(w+1)-l*w],`外框的長、寬都增加兩側步道，共增加2公尺。`,`步道面積＝(${l}＋2)(${w}＋2)－${l}×${w}＝${outer}。`,'medium',s)
  }
  if(t===0){const a=100+10*k,b=8+k,c=14+k,x=10+k,costA=a+b*x,costB=c*x;return make(`租借方案甲收基本費${a}元，每小時${b}元；乙每小時${c}元。某人分兩天使用，第一天${x}小時選較便宜方案，第二天使用時數比第一天少3小時，也選較便宜方案。兩天最低總費用為何？`,Math.min(costA,costB)+Math.min(a+b*(x-3),c*(x-3)),[costA+costB,2*Math.min(costA,costB),a+b*(2*x-3)],`兩天要分別比較兩方案，不能只用總時數一次計價。`,`第一天最低${Math.min(costA,costB)}元；第二天最低${Math.min(a+b*(x-3),c*(x-3))}元，合計${Math.min(costA,costB)+Math.min(a+b*(x-3),c*(x-3))}元。`,'hard',s)}
  if(t===1){const total=200+20*k,a=30,b=20,remain=total*(1-a/100)*(1-b/100);return make(`倉庫有${total}箱貨物，先出貨${a}%，再把剩餘貨物的${b}%轉倉。最後留在原倉庫的箱數比最初少百分之多少？`,'44%',[`50%`,`56%`,`36%`],`連續百分比要相乘保留率，再與原數比較。`,`保留率＝70%×80%＝56%，因此比最初少44%。`,'hard',s)}
  if(t===2){const a=4+k,b=6+k,total=a+b;return make(`袋中有${a}顆紅球、${b}顆藍球。不放回抽兩球；已知至少一球為紅球，兩球皆紅的條件機率為何？`,frac(a*(a-1),total*(total-1)-b*(b-1)),[frac(a*(a-1),total*(total-1)),frac(a,total),frac(a-1,total-1)],`條件機率的分母只計「至少一紅」的抽法。`,`兩紅有${a*(a-1)}種有序抽法；至少一紅有${total*(total-1)-b*(b-1)}種，故為${frac(a*(a-1),total*(total-1)-b*(b-1))}。`,'hard',s)}
  if(t===3){const l=20+2*k,w=12+2*k,x=2+k,outer=l*w,inner=(l-2*x)*(w-2*x);return make(`長方形廣場長${l}公尺、寬${w}公尺，沿內側四周劃設等寬緩衝區，中央可用面積為${inner}平方公尺。緩衝區寬多少公尺？`,x,[2*x,outer-inner,x+1],`中央長、寬都要各減去兩側的寬度，建立乘積方程式並篩選合理根。`,`(${l}－2x)(${w}－2x)＝${inner}，解得符合0＜x＜${w/2}的x＝${x}。`,'hard',s)}
  const speed1=60+5*k,speed2=40+5*k,time=2+k,dist=speed1*(time-0.5)+speed2*time;return make(`甲、乙兩車從相距${dist}公里的兩地同時相向而行，速率分別為${speed1}、${speed2}公里／小時。甲途中停留半小時，但乙不停。從出發到相遇共經過多久？`,time,[time+0.5,time-0.5,time+1],`設總經過t小時，甲實際行駛t－0.5小時，乙行駛t小時。`,`由${speed1}(t－0.5)＋${speed2}t＝${dist}，得t＝${time}小時。`,'hard',s)
}

function similarity(i,level){
 const k=spreadK(i),t=i%5,s=3000+i+(level==='hard'?100:0);
 if(level==='medium'){
  if(t===0){const h=1.5+0.1*k,shadow=2+k,pole=8+2*k;return make(`身高${h}公尺的人影長${shadow}公尺，同時旗桿影長${pole}公尺。旗桿高多少公尺？`,h*pole/shadow,[h+pole-shadow,h*pole, pole/h],`同時的太陽仰角相同，建立高度與影長的比例。`,`旗桿高÷${pole}＝${h}÷${shadow}，故高${h*pole/shadow}公尺。`,'medium',s)}
  if(t===1){const r=2+k,area=25*(r*r);return make(`兩相似三角形對應邊比為1：${r}，小三角形面積25。大三角形面積為何？`,area,[25*r,25+r*r,50*r],`面積比是對應邊比的平方。`,`面積比1：${r*r}，大三角形面積＝25×${r*r}＝${area}。`,'medium',s)}
  if(t===2){const a=4+k,b=6+k,c=9+k,x=a*c/b;return make(`三角形ABC中，D在AB上、E在AC上，DE∥BC。若AD＝${a}、DB＝${b-a}、AC＝${c}，AE為何？`,x,[a*c/(b-a),c-x,a+b],`由DE∥BC得△ADE∼△ABC。`,`AD/AB＝AE/AC，即${a}/${b}＝AE/${c}，所以AE＝${x}。`,'medium',s)}
  if(t===3){const scale=25000*(k+1),cm=3+k;return make(`地圖比例尺1：${scale}，圖上距離${cm}公分。實際距離為多少公尺？`,scale*cm/100,[scale*cm,scale/cm/100,cm*100],`先以公分求實際距離，再除以100換成公尺。`,`實際${scale}×${cm}＝${scale*cm}公分＝${scale*cm/100}公尺。`,'medium',s)}
  const a=6+k,b=8+k,c=10+k,h=a*b/c;return make(`直角三角形兩股為${a}、${b}，斜邊${c}。從直角頂點向斜邊作高，高為何？`,h,[a*b/2,a+b-c,c*c/(a+b)],`用兩種方式表示同一三角形面積。`,`兩股乘積÷2＝斜邊×高÷2，所以高＝${a}×${b}÷${c}＝${h}。`,'medium',s)
 }
 if(t===0){const a=3+k,b=5+k,c=a+b,x=12+2*k;return make(`在△ABC中，D在BC上且AD為∠A角平分線。若AB：AC＝${a}：${b}，BC＝${c*x}，則BD與DC的差為何？`,(b-a)*x,[a*x,b*x,c*x],`使用角平分線定理BD：DC＝AB：AC，再由總長分配。`,`BD＝${a*x}、DC＝${b*x}，差為${(b-a)*x}。`,'hard',s)}
 if(t===1){const r=2+k,per=18+3*k,area=24+6*k;return make(`兩相似多邊形邊長比小：大＝1：${r}。若兩圖形周長和為${per*(1+r)}、面積差為${area*(r*r-1)}，小圖形的「周長＋面積」為何？`,per+area,[per*r+area,per+area*r*r,per*r+area*r*r],`周長按一次方、面積按平方縮放，分別由和與差反推小圖。`,`小周長＝${per}，小面積＝${area}，所求為${per+area}。`,'hard',s)}
 if(t===2){const a=9+3*k,b=12+4*k,c=15+5*k,h=a*b/c;return make(`直角三角形斜邊上的高把斜邊分成兩段。已知兩股為${a}、${b}、斜邊${c}，較短的斜邊分段長為何？`,a*a/c,[b*b/c,h,c-h],`由射影定理：股的平方＝斜邊×該股在斜邊上的射影。`,`較短股${a}所對分段＝${a}²÷${c}＝${a*a/c}。`,'hard',s)}
 if(t===3){const x=4+k;return make(`點P將線段AB內分為AP：PB＝2：3。若再把AB放大為原來${x}倍，但P的位置保持同一分點比例，AP的新長與AB原長之比為何？`,`${2*x}:5`,[`2:5`,`${x}:5`,`2:${5*x}`],`先求AP占AB的2/5，再乘整體放大倍數。`,`新AP＝${x}×(2/5)×原AB，所以比為${2*x}：5。`,'hard',s)}
 const a=4+k,b=7+k;return make(`△ABC中D、E分別在AB、AC上。已知AD/DB＝${a}/${b}、AE/EC＝${a}/${b}。若不預先知道DE∥BC，可由哪個理由推出平行？`,'兩邊成比例的逆定理',[`SAS全等`,`同弧圓周角`,`垂直平分線定理`],`把分點比轉成AD/AB與AE/AC，再使用基本比例定理的逆。`,`兩邊被相同比例分割，所以依基本比例定理的逆定理可得DE∥BC。`,'hard',s)
}

function circle(i,level){
 const k=Math.floor(i/5),t=i%5,s=3200+i+(level==='hard'?100:0);
 if(level==='medium'){
  if(t===0){const r=6+3*k,a=120;return make(`半徑${r}的圓中，圓心角${a}°所對扇形面積為何？`,`${r*r/3}π`,[`${2*r/3}π`,`${r*r/2}π`,`${r*r}π`],`扇形占全圓${a}/360。`,`面積＝${a}/360×π×${r}²＝${r*r/3}π。`,'medium',s)}
  if(t===1){const angle=35+5*k;return make(`圓內接四邊形ABCD中，∠A＝${angle}°，則∠C為何？`,`${180-angle}°`,[`${angle}°`,`${90-angle}°`,`${2*angle}°`],`圓內接四邊形對角互補。`,`∠C＝180°－${angle}°＝${180-angle}°。`,'medium',s)}
  if(t===2){const [r,tan,d]=[[5,12,13],[8,15,17],[7,24,25],[9,40,41]][k%4];return make(`從圓外點P向半徑${r}的圓作切線PA，若OP＝${d}，PA多長？`,tan,[d-r,d+r,r],`半徑OA垂直切線PA，形成直角三角形。`,`PA＝√(${d}²－${r}²)＝${tan}。`,'medium',s)}
  if(t===3){const a=80+10*k;return make(`圓周角∠APB所對的是不含P的弧AB，該弧為${a}°。∠APB為何？`,`${a/2}°`,[`${a}°`,`${180-a}°`,`${360-a}°`],`圓周角等於所對弧度數的一半。`,`∠APB＝${a}°÷2＝${a/2}°。`,'medium',s)}
  const r=6+2*k;return make(`半徑${r}的圓內接正六邊形，其周長為何？`,6*r,[2*Math.PI*r,3*r,r*r],`正六邊形每一邊都是半徑。`,`周長＝6×${r}＝${6*r}。`,'medium',s)
 }
 if(t===0){const [r,tan,d]=[[5,12,13],[8,15,17],[7,24,25],[9,40,41]][k%4];return make(`兩條切線PA、PB由同一圓外點P引出，圓半徑${r}、OP＝${d}。四邊形OAPB面積為何？`,r*tan,[2*r*tan,tan*tan,r*d],`OA、OB分別垂直兩切線，四邊形由兩個全等直角三角形組成。`,`PA＝PB＝√(${d}²－${r}²)＝${tan}；總面積＝2×(1/2×${r}×${tan})＝${r*tan}。`,'hard',s)}
 if(t===1){const a=40+5*k;return make(`圓內兩弦AB、CD交於E。若∠AEC＝${a}°，其所截兩弧AC與BD的度數差為20°，較大弧為多少度？`,`${a+10}°`,[`${2*a}°`,`${a-10}°`,`${2*a+20}°`],`相交弦所成角等於兩截弧和的一半，再聯立弧度差。`,`兩弧和＝${2*a}°、差20°，較大弧＝(${2*a}＋20)÷2＝${a+10}°。`,'hard',s)}
 if(t===2){const r=6+k;return make(`半徑${r}的圓中，弦AB長等於半徑。小弧AB所對圓周角為何？`,'30°',[`60°`,`90°`,`120°`],`△AOB三邊OA、OB、AB都等於半徑。`,`△AOB為正三角形，圓心角60°；同弧圓周角為30°。`,'hard',s)}
 if(t===3){const a=50+5*k;return make(`圓外兩割線由P引出，所截遠弧與近弧度數分別相差${2*a}°。兩割線夾角為何？`,`${a}°`,[`${2*a}°`,`${90-a}°`,`${180-a}°`],`圓外角等於兩截弧差的一半。`,`夾角＝${2*a}°÷2＝${a}°。`,'hard',s)}
 const r=10+2*k,x=6+2*k,n=r*r-x*x,y=radical(n);return make(`圓內兩弦互相垂直且交點恰在其中一弦的中點。若圓半徑${r}、該半弦長${x}，圓心到此弦的距離為何？`,y,[r-x,r+x,radical(n,2)],`圓心到弦中點的連線垂直弦，形成直角三角形。`,`距離＝√(${r}²－${x}²)＝${y}。`,'hard',s)
}

function proof(i,level){
 const k=Math.floor(i/5),t=i%5,s=3400+i+(level==='hard'?100:0);
 if(level==='medium'){
  if(t===0){const names=['ABCD','PQRS','EFGH','KLMN'];return make(`要證明「平行四邊形${names[k]}的對角相等」，最直接可連接哪一條輔助線並使用哪個全等判定？`,'連接一條對角線，使用ASA',[`連接兩邊中點，使用SSS`,`作高，使用SAS`,`延長一邊，使用AAS`],`對角線把平行四邊形分成兩個三角形，平行線提供兩組角。`,`連接對角線後，平行線給兩組錯角相等，對角線為公共邊，可用ASA證明兩三角形全等，進而得到對角相等。`,'medium',s)}
  if(t===1){const a=40+5*k,b=65-k;return make(`三角形一外角為${a+b}°，其中一個不相鄰內角為${a}°，另一個不相鄰內角為何？`,`${b}°`,[`${180-a-b}°`,`${a+b}°`,`${b-a}°`],`外角等於兩個不相鄰內角和。`,`另一角＝${a+b}°－${a}°＝${b}°。`,'medium',s)}
  if(t===2){const lines=[['ℓ₁','ℓ₂'],['m','n'],['a','b'],['p','q']][k];return make(`直線${lines[0]}、${lines[1]}被一截線所截，一組內錯角相等。要證明${lines[0]}∥${lines[1]}，使用的是哪個敘述？`,'內錯角相等，兩直線平行',[`同位角互補，兩直線平行`,`同旁內角相等，兩直線平行`,`對頂角相等，兩直線平行`],`這是平行線判定定理，不是平行線性質。`,`由一組內錯角相等可直接判定兩直線平行。`,'medium',s)}
  if(t===3){const seg=[['AB','DE'],['PQ','RS'],['AC','DF'],['KL','MN']][k];return make(`要證明${seg[0]}＝${seg[1]}，它們分別屬於兩個三角形；若已知兩角及其夾邊對應相等，應使用哪個全等判定？`,'ASA',[`SAS`,`SSS`,`RHS`],`兩角與夾邊對應相等。`,`符合ASA全等判定，因此對應線段${seg[0]}與${seg[1]}相等。`,'medium',s)}
  const prime=[2,3,5,7][k];return make(`反證法證明「√${prime}不是有理數」時，第一個假設應是什麼？`,`假設√${prime}可寫成最簡整數比p/q`,[`假設√${prime}＞1`,`假設p與q有公因數${prime}`,`假設p²＋q²＝${prime}`],`反證法先假設命題的否定，並把分數約成最簡。`,`假設√${prime}＝p/q且gcd(p,q)=1，再利用質數整除性質導出p、q同被${prime}整除的矛盾。`,'medium',s)
 }
 if(t===0){const v=[['ABC','D','BC','AD','AB','AC'],['PQR','S','QR','PS','PQ','PR'],['EFG','H','FG','EH','EF','EG'],['KLM','N','LM','KN','KL','KM']][k%4];return make(`在△${v[0]}中，${v[1]}為${v[2]}中點，且${v[3]}⊥${v[2]}。只利用這兩個條件，可以證明哪個結論？`,`${v[4]}＝${v[5]}`,[`頂角為90°`,`兩腰互相平行`,`中線等於半底`],`比較中線兩側的直角三角形。`,`兩段半底相等、中線公共、夾角皆90°，由SAS得兩三角形全等，所以${v[4]}＝${v[5]}。`,'hard',s)}
 if(t===1){const shape=['三角形最多只有一個直角','三角形最多只有一個鈍角','凸四邊形最多有三個鈍角','五邊形不可能有五個銳角'][k%4];const why=['兩個直角已達180°，第三角無法為正','兩個鈍角和超過180°','四個鈍角和超過四邊形內角和360°','五個銳角和小於450°，但五邊形內角和540°'][k%4];return make(`要用反證法證明「${shape}」，假設其否定後，應尋找哪個核心矛盾？`,why,[`圖形邊長不相等`,`對角線一定垂直`,`所有外角相等`],`把否定情況與多邊形內角和比較。`,`${why}，因此否定假設不成立。`,'hard',s)}
 if(t===2){const names=['ABCD','PQRS','EFGH','KLMN'];return make(`已知四邊形${names[k%4]}的兩條對角線互相平分。若要證明兩組對邊平行，最合適的核心步驟為何？`,'以對頂角與兩組半對角線證明兩對三角形SAS全等',[`只比較四個角和`,`使用畢氏定理`,`作外接圓`],`對角線交點提供兩組相等線段與對頂角。`,`先用SAS證明對角線周圍三角形全等，得到內錯角相等，再推出兩組對邊平行。`,'hard',s)}
 if(t===3){const p=[2,3,5,7][k%4];return make(`命題「若n²可被${p}整除，則n可被${p}整除」最精簡的逆否證明應先做什麼？`,`設n不能被${p}整除，分析n除以${p}的非零餘數`,[`設n²＝${p}k`,`直接假設n可被${p}整除`,`只枚舉n＝1到${p}`],`逆否命題從「n不被${p}整除」出發。`,`質數${p}下的非零餘數平方不會是0，因此n²也不被${p}整除，完成逆否證明。`,'hard',s)}
 const contexts=[['下雨','地面濕'],['是正方形','是長方形'],['能被4整除','是偶數'],['兩直線平行','同位角相等']][k%4];return make(`某人使用「若${contexts[0]}，則${contexts[1]}」與「${contexts[1]}成立」，進而宣稱「${contexts[0]}成立」。這是什麼推理錯誤？`,'肯定後件',[`否定前件`,`矛盾律`,`數學歸納法`],`充分條件不能由結果反推唯一原因。`,`P⇒Q且Q真，不保證P真；這是肯定後件的謬誤。`,'hard',s)
}

function quadratic(i,level){
 const k=spreadK(i),t=i%5,s=3600+i+(level==='hard'?100:0);
 if(level==='medium'){
  if(t===0){const h=2+k,v=5+k,x=6+k,y=(x-h)**2+v;return make(`拋物線y＝(x－${h})²＋${v}上，與點(${x},${y})關於對稱軸對稱的點為何？`,`(${2*h-x},${y})`,[`(${x},${v})`,`(${h},${y})`,`(${x-2*h},${y})`],`對稱軸是x＝${h}，兩點到軸的水平距離相等。`,`對稱點x座標＝2×${h}－${x}＝${2*h-x}，y不變。`,'medium',s)}
  if(t===1){const a=1+k,h=3+k,v=2+k;return make(`二次函數y＝${a}(x－${h})²＋${v}的最小值及發生位置為何？`,`最小值${v}，x＝${h}`,[`最大值${v}，x＝${h}`,`最小值${h}，x＝${v}`,`最小值0，x＝${h}`],`係數${a}＞0，開口向上；頂點給出最小值。`,`頂點(${h},${v})，所以x＝${h}時最小值為${v}。`,'medium',s)}
  if(t===2){const r=3+k,s2=7+k;return make(`函數y＝(x－${r})(x－${s2})的圖形與x軸交於兩點。對稱軸為何？`,`x＝${(r+s2)/2}`,[`x＝${s2-r}`,`y＝${(r+s2)/2}`,`x＝${r*s2}`],`對稱軸在兩個零點的中點。`,`x＝(${r}＋${s2})÷2＝${(r+s2)/2}。`,'medium',s)}
  if(t===3){const h=4+k,v=9+k,x=h+2,y=4-v;return make(`將y＝x²向右平移${h}、向下${v}後得到新圖形。當x＝${x}時，y為何？`,y,[4+v,(x-h-v)**2,x*x-v],`先寫成頂點式y＝(x－${h})²－${v}再代入。`,`y＝(${x}－${h})²－${v}＝${y}。`,'medium',s)}
  const r=2+k;return make(`拋物線y＝x²－${2*r}x＋${r*r-4}與x軸兩交點距離為何？`,4,[2,2*r,r*r-4],`配方後令y＝0，找兩根之差。`,`y＝(x－${r})²－4，零點為${r-2}、${r+2}，距離4。`,'medium',s)
 }
 if(t===0){const h=3+k,v=12+k,p=2+k,y=v-p*p;return make(`拋物線頂點(${h},${v})、開口向下，且通過(${h+p},${y})。其函數為何？`,`y＝－(x－${h})²＋${v}`,[`y＝(x－${h})²＋${v}`,`y＝－${p}(x－${h})²＋${v}`,`y＝－(x＋${h})²＋${v}`],`先設y＝a(x－h)²＋v，代入另一點求a。`,`代入得${y}＝a×${p*p}＋${v}，所以a＝－1。`,'hard',s)}
 if(t===1){const r=2+k,s2=8+k,m=(r+s2)/2,min=-((s2-r)**2)/4;return make(`函數f(x)＝(x－${r})(x－${s2})。在閉區間[${r+1},${s2-1}]上，f(x)的最小值為何？`,min,[0,(r+1-r)*(r+1-s2),-(s2-r)],`開口向上，先檢查頂點是否落在區間內，再比較端點。`,`頂點x＝${m}在區間內，f(${m})＝${min}，小於兩端值。`,'hard',s)}
 if(t===2){const h=4+k,v=16+k,root=radical(v),length=radical(v,2);return make(`拋物線y＝－(x－${h})²＋${v}與x軸圍出的弦長為何？`,length,[root,2*v,v-h],`令y＝0找兩個x截距，再相減。`,`x＝${h}±${root}，兩截距距離為${length}。`,'hard',s)}
 if(t===3){const a=2+k,c=a*(3+k),b=a+c,x=c/a;return make(`拋物線y＝${a}x²與直線y＝${b}x－${c}相交。若其中一個交點x座標為1，另一個交點x座標為何？`,x,[b/a,c,x+1],`移項成二次方程式，利用兩根乘積或已知根分解。`,`交點滿足${a}x²－${b}x＋${c}＝0；兩根乘積為${c}/${a}＝${x}，一根為1，故另一根為${x}。`,'hard',s)}
 const h=5+k,v=20+2*k;return make(`二次函數f(x)＝(x－${h})²－${v}。若整數x使f(x)＜0，共有多少個可能值？`,2*Math.ceil(Math.sqrt(v))-1,[2*Math.floor(Math.sqrt(v))+1,Math.floor(Math.sqrt(v)),2*v-1],`轉成|x－${h}|＜√${v}，再數嚴格不等式內的整數。`,`因${Math.floor(Math.sqrt(v))}＜√${v}＜${Math.ceil(Math.sqrt(v))}，x可從${h-Math.floor(Math.sqrt(v))}到${h+Math.floor(Math.sqrt(v))}，共${2*Math.floor(Math.sqrt(v))+1}個。`,'hard',s)
}

function probability(i,level){
 const k=spreadK(i),t=i%5,s=3800+i+(level==='hard'?100:0);
 if(level==='medium'){
  if(t===0){const a=3+k,b=5+k,total=a+b;return make(`袋中有${a}紅、${b}藍球，不放回抽兩球，抽到不同色的機率為何？`,frac(2*a*b,total*(total-1)),[frac(a*b,total*total),frac(a*(a-1),total*(total-1)),frac(b,total)],`可算紅藍或藍紅兩種順序。`,`機率＝2×${a}×${b}÷(${total}×${total-1})＝${frac(2*a*b,total*(total-1))}。`,'medium',s)}
  if(t===1){const data=[2+k,4+k,4+k,6+k,9+k],mean=data.reduce((a,b)=>a+b)/5;return make(`資料${data.join('、')}的平均數與中位數之差為何？`,Math.abs(mean-data[2]),[mean,data[2],mean+data[2]],`分別求平均數與排序後中央值。`,`平均數${mean}，中位數${data[2]}，差為${Math.abs(mean-data[2])}。`,'medium',s)}
  if(t===2){const n=6+k;return make(`擲兩顆公平骰子，點數和為${n}的機率為何？`,frac(n-1,36),[frac(n,36),frac(1,6),frac(2*n,36)],`列出第一顆1到${n-1}時的互補點數。`,`共有${n-1}組有序結果，樣本空間36種，機率${frac(n-1,36)}。`,'medium',s)}
  if(t===3){const mean=70+2*k,n=5+k,newx=90+k,newmean=(mean*n+newx)/(n+1);return make(`某組${n}人的平均分數${mean}，加入一位得${newx}分的學生後，新平均為何？`,newmean,[mean+newx,newx/n,(mean+newx)/2],`先由平均數還原原總分，再加入新分數。`,`新平均＝(${mean}×${n}＋${newx})÷${n+1}＝${newmean}。`,'medium',s)}
  const a=2+k,b=3+k;return make(`盒中有編號1至${a+b}的卡片。任取一張，編號大於${a}且為奇數的機率為何？`,frac(Array.from({length:b},(_,j)=>a+1+j).filter(x=>x%2).length,a+b),[frac(b,a+b),frac(a,a+b),frac(1,a+b)],`同時滿足兩個條件，直接列出符合的編號。`,`符合者共有${Array.from({length:b},(_,j)=>a+1+j).filter(x=>x%2).length}張，共${a+b}張，機率為${frac(Array.from({length:b},(_,j)=>a+1+j).filter(x=>x%2).length,a+b)}。`,'medium',s)
 }
 if(t===0){const a=3+k,b=4+k,total=a+b;return make(`袋中${a}紅${b}藍，不放回抽兩球。已知第一球不是藍球，第二球為藍球的機率為何？`,frac(b,total-1),[frac(b,total),frac(a,total-1),frac(a*b,total*(total-1))],`條件已確定第一球為紅球，更新袋中球數。`,`第一球為紅後剩${total-1}球，其中藍球仍${b}顆，故機率${frac(b,total-1)}。`,'hard',s)}
 if(t===1){const n=5+k;return make(`從1到${n}等可能選兩次且放回。兩次數字的最大值恰為${n-1}的機率為何？`,frac((n-1)**2-(n-2)**2,n*n),[frac(2,n),frac(n-1,n*n),frac((n-2)**2,n*n)],`用「最大值≤${n-1}」減「最大值≤${n-2}」。`,`有利結果${(n-1)**2}－${(n-2)**2}＝${2*n-3}，總結果${n*n}，故為${frac(2*n-3,n*n)}。`,'hard',s)}
 if(t===2){const a=60+2*k,b=80+2*k;return make(`甲班${20+k}人平均${a}分，乙班${30+k}人平均${b}分。若兩班合併，中位數是否一定介於${a}與${b}之間？`,'不一定，僅由人數與平均數無法決定',[`一定介於兩者之間`,`一定等於加權平均`,`一定較接近${b}`],`平均數資訊不足以決定資料排序位置。`,`可構造不同分布具有相同平均數卻有不同中位數，因此不能判定。`,'hard',s)}
 if(t===3){const n=6+2*k;return make(`擲兩個各有1至${n}點的公平正${n}面骰，已知點數和為偶數，兩骰點數相同的條件機率為何？`,frac(2,n),[frac(1,n),frac(1,2),frac(n,2*n*n)],`和為偶數代表兩數同奇偶；共有${n*n/2}種，相同有${n}種。`,`條件機率＝${n}÷${n*n/2}＝${frac(2,n)}。`,'hard',s)}
 const sens=80+5*k,spec=80,p=10+10*k,num=sens*p,den=num+(100-spec)*(100-p);return make(`某檢測靈敏度${sens}%、特異度${spec}%，族群盛行率${p}%。隨機一人檢測陽性，他真正患病的機率為何？`,frac(num,den),[`${sens}%`,`${spec}%`,frac(p,100)],`用相同人數基準比較真陽性與偽陽性。`,`真陽性權重${sens}×${p}；偽陽性權重${100-spec}×${100-p}，故陽性後患病機率為${frac(num,den)}。`,'hard',s)
}

function solid(i,level){
 const k=spreadK(i),t=i%5,s=4000+i+(level==='hard'?100:0);
 if(level==='medium'){
  if(t===0){const l=5+k,w=4+k,h=3+k;return make(`長方體長${l}、寬${w}、高${h}，若高度增加2，表面積增加多少？`,2*2*(l+w),[l*w*2,2*(l+w),4*l*w],`只有四個側面增加，或比較兩次表面積。`,`增加量＝2(l×2＋w×2)＝${4*(l+w)}。`,'medium',s)}
  if(t===1){const r=3+k,h=8+k;return make(`圓柱半徑${r}、高${h}，體積與同底同高圓錐體積相差多少？`,`${2*r*r*h/3}π`,[`${r*r*h/3}π`,`${r*r*h}π`,`${2*r*h}π`],`圓錐體積是同底同高圓柱的1/3。`,`差＝(1－1/3)×${r*r*h}π＝${2*r*r*h/3}π。`,'medium',s)}
  if(t===2){const l=6+k,w=5+k,h=4+k,cube=2;return make(`長方體內部長${2*l}、寬${2*w}、高${2*h}，恰好以邊長2的小正方體填滿，共需幾個？`,l*w*h,[2*l*2*w*2*h,l+w+h,2*(l*w+w*h+l*h)],`各方向能放的個數相乘。`,`(${2*l}÷2)×(${2*w}÷2)×(${2*h}÷2)＝${l*w*h}。`,'medium',s)}
  if(t===3){const a=6+2*k;return make(`邊長${a}的正方體切成8個相同小正方體。所有小正方體表面積總和比原來增加多少？`,6*a*a,[3*a*a,12*a*a,a*a],`切成2×2×2後，小立方體邊長為原來一半。`,`新總表面積＝8×6×(${a}/2)²＝12${a*a}；原表面積＝6${a*a}，增加${6*a*a}。`,'medium',s)}
  const r=4+k,h=9+k;return make(`圓柱形水箱底面半徑${r}，加入${r*r*3}π立方單位的水，水深增加多少？`,3,[r,`${3*r}π`,r*r*3],`水深增加量＝水體積÷底面積。`,`增加${r*r*3}π÷(${r*r}π)＝3。`,'medium',s)
 }
 if(t===0){const a=6+2*k;return make(`邊長${a}的正方體，在每個頂點切去邊長1的小正方體。剩餘立體表面積與原正方體相比如何？`,'相等',[`增加24`,`減少24`,`增加48`],`每個角切去三個1×1外表面，同時露出三個1×1新表面。`,`每個頂點減少與新增面積相同，8個頂點互不重疊，因此總表面積不變。`,'hard',s)}
 if(t===1){const r=3+k,h=8+k;return make(`一圓錐與一圓柱底面半徑相同。圓錐高為圓柱高的${3+k}倍，兩者體積比「圓錐：圓柱」為何？`,`${3+k}:3`,[`${3+k}:1`,`1:${3+k}`,`3:${3+k}`],`圓錐體積多一個1/3因子。`,`比＝[1/3×(${3+k})]：1＝${3+k}：3。`,'hard',s)}
 if(t===2){const a=4+k,b=6+k,c=8+k;return make(`一長方體的三個相鄰面面積分別為${a*b}、${b*c}、${a*c}。其體積為何？`,a*b*c,[a+b+c,a*b+b*c+a*c,2*a*b*c],`設邊長x,y,z；三面積相乘等於(xyz)²。`,`體積＝√(${a*b}×${b*c}×${a*c})＝${a*b*c}。`,'hard',s)}
 if(t===3){const r=5+k;return make(`半徑${r}的球恰好放入一個正方體盒中。球體積占盒子體積的比例為何？`,'π/6',[`π/3`,`2π/3`,`π/8`],`盒邊長是球的直徑2r。`,`比例＝(4/3πr³)/(2r)³＝π/6。`,'hard',s)}
 const a=6+2*k;return make(`邊長${a}的正方體木塊六面塗色後，切成邊長2的小正方體。恰有兩面塗色的小正方體共有幾個？`,12*(a/2-2),[8,12*(a/2),6*(a/2-2)],`恰兩面塗色位於12條稜上，但不含8個頂點。`,`每條稜有${a/2-2}個非頂點小立方體，共12×${a/2-2}＝${12*(a/2-2)}。`,'hard',s)
}

const units=[
 ['數列與等差數列',sequence],['函數及其圖形',linear],['三角形的性質與尺規作圖',triangle],
 ['平行與四邊形',parallel],['會考素養閱讀',(i,l)=>literacy(i,l,8)],['相似形與比例線段',similarity],
 ['圓與圓周角',circle],['幾何推理與證明',proof],['二次函數',quadratic],['資料分析與機率',probability],
 ['空間幾何與立體圖形',solid],['會考素養閱讀',(i,l)=>literacy(i,l,9)]
];

for(let g=0;g<units.length;g++){
  const [unit,builder]=units[g], groupStart=1140+g*60;
  const easyOriginal=bank.questions.slice(groupStart,groupStart+20).map(q=>structuredClone(q));
  const permutation=[0,11,4,17,8,13,2,19,6,15,1,12,5,18,9,14,3,16,7,10];
  for(let i=0;i<20;i++){
    const target=bank.questions[groupStart+i], source=easyOriginal[permutation[i]];
    const easy=upgradedEasy(unit,i,target.grade,source);
    bank.questions[groupStart+i]={...target,...easy,id:target.id,sourceId:target.sourceId,grade:target.grade,unit:target.unit,level:'easy'};
  }
  for(let i=0;i<20;i++){
    const medium=builder(i,unit==='函數及其圖形'?'medium':'hard');
    medium.difficultyDesign=unit==='函數及其圖形'
      ? {name:'會考／模擬考進階',steps:'2至4步',description:'從情境或兩筆資料建立一次函數，再比較、反推、取整數範圍或連結坐標幾何'}
      : {name:'奧數初賽基礎／高鑑別模擬考',steps:'3至5步',description:'單一完整情境；須使用反推、整數限制、分類或跨概念推理'};
    const hard=olympiadHard(unit,i,bank.questions[groupStart+40+i].grade);
    bank.questions[groupStart+20+i]={...bank.questions[groupStart+20+i],...medium,unit,level:'medium'};
    bank.questions[groupStart+40+i]={...bank.questions[groupStart+40+i],...hard,unit,level:'hard'};
  }
}

bank.metadata={...bank.metadata,review902to1621:{
  revisedAt:new Date().toISOString(), displayRange:'902-1621', revisedCount:720,
  easyDiversifiedCount:240,
  rule:'易題打散重複數字並擴大數值分布；函數及其圖形的中等題使用10類會考／模擬考進階建模，20題困難題全部採不同結構，涵蓋分段、參數、整數格點、分類計數與坐標幾何；其餘中、難題維持奧數初賽分級。每題為單一完整問題。'
}};

writeFileSync(file,JSON.stringify(bank,null,2),'utf8');
console.log('已重新校準第902～1621題共720題：易題數字多樣化，中題升級為奧數初賽基礎，難題改為奧數初賽進階。');
