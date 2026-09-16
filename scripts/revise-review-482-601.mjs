import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve('.');
const source=resolve(root,'review-previews','.questions-301-481-staging.json');
const bank=JSON.parse(readFileSync(source,'utf8'));
const revise842to901=process.argv.includes('--range842to901');
const START=revise842to901?1080:720, END=revise842to901?1140:840;
const TYPES=['長條圖','折線圖','圓形圖','列聯表','次數分配折線圖'];
const palettes=['#5c8d70','#4e82a6','#d58a45','#8a70a8','#c86367'];

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number.isInteger(n)?String(n):String(Math.round(n*100)/100);
const sum=a=>a.reduce((x,y)=>x+y,0);
const mean=a=>sum(a)/a.length;
function randomValues(seed,count,min,max){
  let state=(seed*2654435761)>>>0;
  return Array.from({length:count},()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return min+(state%(max-min+1))});
}
const optionSet=(answer,wrong,seed)=>{
  const a=String(answer), pool=[a,...wrong.map(String)].filter((x,i,v)=>v.indexOf(x)===i);
  let bump=1;
  while(pool.length<4){const n=Number(answer);pool.push(Number.isFinite(n)?fmt(n+bump++):`其他結果${bump++}`)}
  const opts=pool.slice(0,4),shift=seed%4,rot=[...opts.slice(shift),...opts.slice(0,shift)];
  return {options:rot,answerIndex:rot.indexOf(a)};
};
const baseSvg=(title,inner,aria=title)=>`<svg viewBox="0 0 640 380" role="img" aria-label="${esc(aria)}" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="630" height="370" rx="18" fill="#fbfdfb" stroke="#cbd9ce"/><text x="320" y="34" text-anchor="middle" font-family="Microsoft JhengHei,sans-serif" font-size="20" font-weight="800" fill="#26372f">${esc(title)}</text>${inner}</svg>`;

function barFig(title,cats,vals){
  const max=Math.max(...vals),x0=76,y0=310,w=500,h=235,bw=Math.min(58,w/(cats.length*1.75));
  let g=`<g font-family="Microsoft JhengHei,sans-serif" font-size="16" font-weight="700" fill="#26372f"><path d="M${x0} 65V${y0}H590" fill="none" stroke="#34483e" stroke-width="3"/>`;
  vals.forEach((v,i)=>{const x=x0+45+i*(w/cats.length),bh=v/max*h,y=y0-bh;g+=`<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="5" fill="${palettes[i%palettes.length]}"/><text x="${x+bw/2}" y="${y-9}" text-anchor="middle">${v}</text><text x="${x+bw/2}" y="338" text-anchor="middle">${esc(cats[i])}</text>`});
  return baseSvg(title,g+'</g>',`${title}，各長條上方直接標示數值`);
}
function lineFig(title,cats,vals){
  const max=Math.max(...vals),min=Math.min(...vals),axisX=62,x0=112,y0=310,w=465,h=220,span=Math.max(1,max-min),pts=vals.map((v,i)=>[x0+i*w/(vals.length-1),y0-(v-min+span*.16)/(span*1.32)*h]);
  let g=`<g font-family="Microsoft JhengHei,sans-serif" font-size="15" font-weight="700" fill="#26372f"><path d="M${axisX} 62V${y0}H600" fill="none" stroke="#34483e" stroke-width="3"/><polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#4e82a6" stroke-width="5" stroke-linejoin="round"/>`;
  pts.forEach(([x,y],i)=>{g+=`<circle cx="${x}" cy="${y}" r="6" fill="#fff" stroke="#376f94" stroke-width="4"/><text x="${x}" y="${y-13}" text-anchor="middle">${vals[i]}</text><text x="${x}" y="338" text-anchor="middle">${esc(cats[i])}</text>`});
  return baseSvg(title,g+'</g>',`${title}，折線各資料點旁直接標示數值`);
}
function pieFig(title,cats,vals,total=200){
  const cx=230,cy=205,r=125,s=sum(vals);let start=-Math.PI/2,g='<g font-family="Microsoft JhengHei,sans-serif" font-size="15" font-weight="700" fill="#26372f">';
  vals.forEach((v,i)=>{const end=start+Math.PI*2*v/s,x1=cx+r*Math.cos(start),y1=cy+r*Math.sin(start),x2=cx+r*Math.cos(end),y2=cy+r*Math.sin(end),large=end-start>Math.PI?1:0;g+=`<path d="M${cx} ${cy}L${x1} ${y1}A${r} ${r} 0 ${large} 1 ${x2} ${y2}Z" fill="${palettes[i]}" stroke="#fff" stroke-width="3"/>`;start=end;});
  g+=`<text x="470" y="85" text-anchor="middle" font-size="17">總數 ${total}</text>`;
  cats.forEach((c,i)=>{const pct=Math.round(vals[i]/s*100);g+=`<rect x="385" y="${112+i*49}" width="18" height="18" rx="4" fill="${palettes[i]}"/><text x="414" y="${127+i*49}">${esc(c)}：${pct}%</text>`});
  return baseSvg(title,g+'</g>',`${title}，圖例只標示百分比，總數${total}`);
}
function tableFig(title,rows,cols,data){
  const x=90,y=82,cw=105,rh=54;let g='<g font-family="Microsoft JhengHei,sans-serif" font-size="16" font-weight="700" fill="#26372f">';
  const matrix=[['',...cols,'合計'],...rows.map((r,i)=>[r,...data[i],sum(data[i])]),['合計',...cols.map((_,j)=>sum(data.map(r=>r[j]))),sum(data.flat())]];
  matrix.forEach((row,i)=>row.forEach((v,j)=>{g+=`<rect x="${x+j*cw}" y="${y+i*rh}" width="${cw}" height="${rh}" fill="${i===0||j===0?'#e7f0e9':'#fff'}" stroke="#789083"/><text x="${x+j*cw+cw/2}" y="${y+i*rh+34}" text-anchor="middle">${esc(v)}</text>`}));
  return baseSvg(title,g+'</g>',`${title}，每一格及列欄合計均有標示`);
}
function freqFig(title,groups,vals){
  const max=Math.max(...vals),axisX=60,x0=112,y0=306,w=465,h=215,pts=vals.map((v,i)=>[x0+i*w/(vals.length-1),y0-v/max*h]);
  let g=`<g font-family="Microsoft JhengHei,sans-serif" font-size="14" font-weight="700" fill="#26372f"><path d="M${axisX} 70V${y0}H600" fill="none" stroke="#34483e" stroke-width="3"/><polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#8a70a8" stroke-width="5"/>`;
  pts.forEach(([x,y],i)=>{g+=`<circle cx="${x}" cy="${y}" r="7" fill="#fff" stroke="#76579b" stroke-width="4"/><text x="${x}" y="${y-13}" text-anchor="middle">${vals[i]}</text><text x="${x}" y="336" text-anchor="middle">${esc(groups[i])}</text>`});
  return baseSvg(title,g+'</g>',`${title}，各組資料點標示次數`);
}

function makeBar(level,v,seed){
  const cats=['閱讀','運動','音樂','美術','科學'],r=randomValues(seed,5,0,19),vals=[14+r[0],22+r[1],10+r[2],32+r[3],18+r[4]];
  const fig=barFig('社團參與人數長條圖',cats,vals);let q,a,w,h,e;
  if(level==='easy'){
    const tasks=[
      ()=>["參與人數最多的是哪一個社團？",cats[vals.indexOf(Math.max(...vals))],cats.filter(x=>x!==cats[vals.indexOf(Math.max(...vals))]).slice(0,3),'比較各長條上方的數值。',`最大值是${Math.max(...vals)}，對應${cats[vals.indexOf(Math.max(...vals))]}。`],
      ()=>["參與人數最少的是哪一個社團？",cats[vals.indexOf(Math.min(...vals))],cats.filter(x=>x!==cats[vals.indexOf(Math.min(...vals))]).slice(0,3),'找出最短的長條。',`最小值是${Math.min(...vals)}。`],
      ()=>["音樂社與美術社相差多少人？",Math.abs(vals[2]-vals[3]),[vals[2]+vals[3],Math.abs(vals[2]-vals[3])+2,Math.abs(vals[2]-vals[3])-2],'用較大人數減較小人數。',`${Math.max(vals[2],vals[3])}－${Math.min(vals[2],vals[3])}＝${Math.abs(vals[2]-vals[3])}。`],
      ()=>["閱讀社和科學社共有多少人？",vals[0]+vals[4],[vals[0],vals[4],Math.abs(vals[0]-vals[4])],'把兩個社團的人數相加。',`${vals[0]}＋${vals[4]}＝${vals[0]+vals[4]}。`],
      ()=>["運動社有多少人？",vals[1],[vals[0],vals[2],vals[3]],'讀取運動社長條上方的數值。',`運動社長條標示${vals[1]}。`],
      ()=>["五個社團人數的全距是多少？",Math.max(...vals)-Math.min(...vals),[Math.max(...vals),Math.min(...vals),sum(vals)],'全距是最大值減最小值。',`${Math.max(...vals)}－${Math.min(...vals)}＝${Math.max(...vals)-Math.min(...vals)}。`],
      ()=>["人數高於音樂社的社團共有幾個？",vals.filter(x=>x>vals[2]).length,[1,2,4],'以音樂社的人數為基準逐一比較。',`共有${vals.filter(x=>x>vals[2]).length}個社團高於音樂社。`],
      ()=>["依人數由多至少排列，哪一個社團排第二？",cats[vals.map((x,i)=>[x,i]).sort((a,b)=>b[0]-a[0])[1][1]],cats.filter(x=>x!==cats[vals.map((x,i)=>[x,i]).sort((a,b)=>b[0]-a[0])[1][1]]).slice(0,3),'先將五個數值由大到小排序。','第二大的長條所對應社團即為答案。']];[q,a,w,h,e]=tasks[v]();
  }else if(level==='medium'){
    const tasks=[
      ()=>["若閱讀社轉入科學社三人，兩社調整後相差多少人？",Math.abs(vals[0]-3-(vals[4]+3)),[Math.abs(vals[0]-vals[4]),Math.abs(vals[0]-3-vals[4]),6],'同時更新兩個社團的人數再比較。',`調整後為${vals[0]-3}與${vals[4]+3}，相差${Math.abs(vals[0]-3-(vals[4]+3))}。`],
      ()=>["運動社人數約占五個社團總人數的百分之多少？",`${Math.round(vals[1]/sum(vals)*100)}%`,[`${Math.round(vals[1]/sum(vals)*100)+5}%`,`${Math.round(vals[1]/sum(vals)*100)-5}%`,`${Math.round(vals[1]/Math.max(...vals)*100)}%`],'先求總人數，再用運動社人數除以總人數。',`${vals[1]}÷${sum(vals)}約為${Math.round(vals[1]/sum(vals)*100)}%。`],
      ()=>["若要讓音樂社人數等於美術社，至少需要增加多少人？",vals[3]-vals[2],[vals[3],vals[2],vals[3]+vals[2]],'目標值減目前值。',`${vals[3]}－${vals[2]}＝${vals[3]-vals[2]}。`],
      ()=>["扣除人數最多與最少的社團後，其餘三社平均有多少人？",fmt((sum(vals)-Math.max(...vals)-Math.min(...vals))/3),[fmt(mean(vals)),fmt((sum(vals)-Math.max(...vals))/4),fmt((sum(vals)-Math.min(...vals))/4)],'先移除最大值和最小值，再除以三。',`剩餘總數為${sum(vals)-Math.max(...vals)-Math.min(...vals)}，平均為${fmt((sum(vals)-Math.max(...vals)-Math.min(...vals))/3)}。`],
      ()=>["將五社分為藝文類（音樂、美術）與其他類，藝文類比其他類少多少人？",Math.abs((vals[0]+vals[1]+vals[4])-(vals[2]+vals[3])),[vals[2]+vals[3],vals[0]+vals[1]+vals[4],sum(vals)],'分別求兩類總數，再相減。',`兩類總數分別為${vals[2]+vals[3]}與${vals[0]+vals[1]+vals[4]}。`],
      ()=>["若每個社團都增加相同人數，下列哪一個統計量一定不變？",'全距',['平均數','總人數','各社人數'],'每筆資料加上相同數，最大值與最小值的差不變。','全距不受整體平移影響。'],
      ()=>["學校要選兩社合辦活動，哪一組的合計人數最接近五社平均人數的兩倍？",bestPair(cats,vals),otherPairs(cats,bestPair(cats,vals)),'先算五社平均的兩倍，再比較各組合計。',`五社平均的兩倍為${fmt(mean(vals)*2)}，逐組比較差距。`],
      ()=>["若美術社人數減少百分之二十，調整後最接近多少人？",Math.round(vals[3]*.8),[Math.round(vals[3]*.2),vals[3]-2,Math.round(vals[3]*1.2)],'保留百分之八十。',`${vals[3]}×0.8＝${fmt(vals[3]*.8)}。`]];[q,a,w,h,e]=tasks[v]();
  }else{
    const tasks=[
      ()=>["五社合辦活動需讓每社人數都不低於目前平均數。只允許在人數最多的社團與其他社團間調動，至少需調動多少人？",deficitToMean(vals),[Math.ceil(mean(vals)),Math.max(...vals)-Math.min(...vals),deficitToMean(vals)+3],'先求平均，再加總低於平均各社的不足量。',`平均為${fmt(mean(vals))}，低於平均者的不足量合計為${deficitToMean(vals)}。`],
      ()=>["若抽樣一人，先知道此人來自閱讀社或科學社，則來自科學社的機率最接近多少？",`${Math.round(vals[4]/(vals[0]+vals[4])*100)}%`,[`${Math.round(vals[4]/sum(vals)*100)}%`,`${Math.round(vals[0]/(vals[0]+vals[4])*100)}%`,'50%'],'條件縮小為閱讀社與科學社兩群。',`${vals[4]}÷(${vals[0]}＋${vals[4]})約為${Math.round(vals[4]/(vals[0]+vals[4])*100)}%。`],
      ()=>["若各社經費與人數成正比，運動社比音樂社多分得全體經費的百分之多少？",`${Math.round((vals[1]-vals[2])/sum(vals)*100)}%`,[`${Math.round(vals[1]/sum(vals)*100)}%`,`${Math.round(vals[2]/sum(vals)*100)}%`,`${Math.round((vals[1]-vals[2])/vals[2]*100)}%`],'差額占全體的比例，不是占音樂社的比例。',`差額${vals[1]-vals[2]}除以總數${sum(vals)}。`],
      ()=>["若將人數最多社團的四分之一學生平均轉入人數最少的兩社，轉入後哪一社人數最多？",afterTransferWinner(cats,vals),cats.filter(x=>x!==afterTransferWinner(cats,vals)).slice(0,3),'先找最大與兩個最小值，再完成轉入後比較。','依規則調整三個社團後重新排序。'],
      ()=>["學校規定合辦兩社須占全體人數至少百分之四十五，哪一組符合且合計人數最少？",qualifiedPair(cats,vals,.45),otherPairs(cats,qualifiedPair(cats,vals,.45)),'列出達門檻的組合，再找其中人數最少者。',`門檻為${fmt(sum(vals)*.45)}人，合格組合中取最小合計。`],
      ()=>["若每社先減少兩人，再把剩餘人數乘以相同常數，下列哪項可由原圖直接確定？",'人數排序不變',['總人數不變','平均數不變','全距必為零'],'相同的遞增線性轉換不改變大小順序。','每筆先減相同數再乘正數，排序維持。'],
      ()=>["若隨機抽兩人且不放回，兩人都來自美術社的機率最接近多少？",`${fmt(vals[3]/sum(vals)*(vals[3]-1)/(sum(vals)-1)*100)}%`,[`${fmt((vals[3]/sum(vals))**2*100)}%`,`${fmt(vals[3]/sum(vals)*100)}%`,`${fmt((vals[3]-1)/(sum(vals)-1)*100)}%`],'第二次抽取的分子與分母都要減一。',`${vals[3]}/${sum(vals)}×${vals[3]-1}/${sum(vals)-1}。`],
      ()=>["若圖中人數是母體的一半且各社比例相同，擴大為母體後，哪一個統計量與圖中相同？",'各社所占百分比',['各社人數','總人數','人數全距'],'等比例放大會改變人數，不改變比例。','所有類別同乘二，因此百分比保持不變。']];[q,a,w,h,e]=tasks[v]();
  }
  return pack(q,a,w,h,e,fig,seed,'長條圖');
}

function bestPair(cats,vals){const target=mean(vals)*2,p=[];for(let i=0;i<vals.length;i++)for(let j=i+1;j<vals.length;j++)p.push([Math.abs(vals[i]+vals[j]-target),`${cats[i]}＋${cats[j]}`]);return p.sort((a,b)=>a[0]-b[0])[0][1]}
function otherPairs(cats,answer){const out=[];for(let i=0;i<cats.length;i++)for(let j=i+1;j<cats.length;j++){const p=`${cats[i]}＋${cats[j]}`;if(p!==answer)out.push(p)}return out.slice(0,3)}
function deficitToMean(vals){const m=Math.ceil(mean(vals));return vals.filter(x=>x<m).reduce((s,x)=>s+m-x,0)}
function afterTransferWinner(cats,vals){const a=[...vals],max=a.indexOf(Math.max(...a)),give=Math.floor(a[max]/4),mins=a.map((x,i)=>[x,i]).filter(x=>x[1]!==max).sort((x,y)=>x[0]-y[0]).slice(0,2);a[max]-=give;a[mins[0][1]]+=Math.floor(give/2);a[mins[1][1]]+=give-Math.floor(give/2);return cats[a.indexOf(Math.max(...a))]}
function qualifiedPair(cats,vals,rate){const p=[];for(let i=0;i<vals.length;i++)for(let j=i+1;j<vals.length;j++)if(vals[i]+vals[j]>=sum(vals)*rate)p.push([vals[i]+vals[j],`${cats[i]}＋${cats[j]}`]);return p.sort((a,b)=>a[0]-b[0])[0]?.[1]||`${cats[0]}＋${cats[1]}`}

function makeLine(level,v,seed){
  const cats=['週一','週二','週三','週四','週五','週六'],r=randomValues(seed+73,6,0,9),a0=16+r[0],b0=a0+5+r[1],c0=b0-2-r[2]%6,d0=c0+8+r[3],e0=d0-2-r[4]%7,f0=e0+6+r[5],vals=[a0,b0,c0,d0,e0,f0],fig=lineFig('一週圖書館入館人次折線圖',cats,vals);let q,a,w,h,e;
  const inc=vals.slice(1).map((x,i)=>x-vals[i]),maxInc=Math.max(...inc),maxDec=Math.min(...inc);
  if(level==='easy'){
    const tasks=[()=>['哪一天的入館人次最多？',cats[vals.indexOf(Math.max(...vals))],cats.filter(x=>x!==cats[vals.indexOf(Math.max(...vals))]).slice(0,3),'比較各點旁的數值。',`最高為${Math.max(...vals)}人次。`],()=>['哪一天的入館人次最少？',cats[vals.indexOf(Math.min(...vals))],cats.filter(x=>x!==cats[vals.indexOf(Math.min(...vals))]).slice(0,3),'找最低資料點。',`最低為${Math.min(...vals)}人次。`],()=>['哪一段相鄰日期增加最多？',`${cats[inc.indexOf(maxInc)]}到${cats[inc.indexOf(maxInc)+1]}`,['週一到週二','週二到週三','週四到週五'].filter(x=>x!==`${cats[inc.indexOf(maxInc)]}到${cats[inc.indexOf(maxInc)+1]}`),'逐段計算後一天減前一天。',`最大增加量為${maxInc}。`],()=>['哪一段相鄰日期呈現下降？',`${cats[inc.indexOf(maxDec)]}到${cats[inc.indexOf(maxDec)+1]}`,['週一到週二','週三到週四','週五到週六'].filter(x=>x!==`${cats[inc.indexOf(maxDec)]}到${cats[inc.indexOf(maxDec)+1]}`),'折線向下代表下降。',`該段由${vals[inc.indexOf(maxDec)]}降至${vals[inc.indexOf(maxDec)+1]}。`],()=>['週六比週一多多少人次？',vals[5]-vals[0],[vals[5]+vals[0],vals[5],vals[0]],'用週六減週一。',`${vals[5]}－${vals[0]}＝${vals[5]-vals[0]}。`],()=>['週二與週三共有多少人次？',vals[1]+vals[2],[Math.abs(vals[1]-vals[2]),vals[1],vals[2]],'讀取兩天數值後相加。',`${vals[1]}＋${vals[2]}＝${vals[1]+vals[2]}。`],()=>['六天入館人次的全距是多少？',Math.max(...vals)-Math.min(...vals),[Math.max(...vals),Math.min(...vals),sum(vals)],'最大值減最小值。',`${Math.max(...vals)}－${Math.min(...vals)}＝${Math.max(...vals)-Math.min(...vals)}。`],()=>['前三天平均每天約有多少人次？',fmt(mean(vals.slice(0,3))),[fmt(mean(vals)),sum(vals.slice(0,3)),fmt(mean(vals.slice(3)))],'先加總前三天，再除以三。',`(${vals.slice(0,3).join('＋')})÷3＝${fmt(mean(vals.slice(0,3)))}。`]];[q,a,w,h,e]=tasks[v]();
  }else if(level==='medium'){
    const tasks=[()=>['若週日人次要使全週平均等於週四人次，週日至少需要多少人次？',vals[3]*7-sum(vals),[vals[3]*6-sum(vals),fmt(sum(vals)/6),vals[3]],'以目標平均乘七，再扣除前六天總和。',`${vals[3]}×7－${sum(vals)}＝${vals[3]*7-sum(vals)}。`],()=>['週一到週六的整體成長率約為百分之多少？',`${Math.round((vals[5]-vals[0])/vals[0]*100)}%`,[`${Math.round(vals[5]/vals[0]*100)}%`,`${Math.round((vals[5]-vals[0])/vals[5]*100)}%`,`${vals[5]-vals[0]}%`],'成長量除以起始量。',`(${vals[5]}－${vals[0]})÷${vals[0]}。`],()=>['將六天分成前三天與後三天，後三天平均比前三天平均多多少人次？',fmt(mean(vals.slice(3))-mean(vals.slice(0,3))),[fmt(mean(vals.slice(3))),fmt(mean(vals.slice(0,3))),fmt(sum(vals.slice(3))-sum(vals.slice(0,3)))],'分別求兩組平均再相減。',`後三天平均${fmt(mean(vals.slice(3)))}，前三天平均${fmt(mean(vals.slice(0,3)))}。`],()=>['若週三漏記五人次，補登後六天平均增加多少人次？',fmt(5/6),['5','6',fmt(5/5)],'總數增加五，再平均分攤到六天。',`平均增加5÷6＝${fmt(5/6)}。`],()=>['哪一天的人次最接近六天平均？',cats[vals.map(x=>Math.abs(x-mean(vals))).indexOf(Math.min(...vals.map(x=>Math.abs(x-mean(vals)))))],cats.slice(0,4),'先求六天平均，再比較各日差距。',`六天平均為${fmt(mean(vals))}。`],()=>['若每十人次需安排一名志工，採無條件進位，週四和週六共需幾名志工？',Math.ceil(vals[3]/10)+Math.ceil(vals[5]/10),[Math.floor((vals[3]+vals[5])/10),Math.ceil((vals[3]+vals[5])/10),Math.floor(vals[3]/10)+Math.floor(vals[5]/10)],'兩天要分別無條件進位後再相加。',`分別需要${Math.ceil(vals[3]/10)}與${Math.ceil(vals[5]/10)}名。`],()=>['若週五人次調整為週四與週六的平均，調整後週五應是多少？',fmt((vals[3]+vals[5])/2),[fmt(mean(vals)),vals[4],fmt((vals[3]+vals[4]+vals[5])/3)],'只取週四與週六兩點平均。',`(${vals[3]}＋${vals[5]})÷2＝${fmt((vals[3]+vals[5])/2)}。`],()=>['依前後兩日平均估計週三，估計值與實際值相差多少？',fmt(Math.abs((vals[1]+vals[3])/2-vals[2])),[fmt((vals[1]+vals[3])/2),fmt(Math.abs(vals[3]-vals[1])),fmt(mean(vals))],'先以週二、週四平均估計，再與週三實際值比較。',`估計值${fmt((vals[1]+vals[3])/2)}，與實際${vals[2]}相差${fmt(Math.abs((vals[1]+vals[3])/2-vals[2]))}。`]];[q,a,w,h,e]=tasks[v]();
  }else{
    const tasks=[()=>['若每日營運成本由固定費與每人次費用組成，而週一與週六成本差只來自人次差，哪項資料仍不足以求出週三總成本？','固定費或每人次費用',['週三人次','週一人次','週六人次'],'圖表只有人次，成本模型的係數尚未給定。','缺少固定費或單位變動費，無法唯一求成本。'],()=>['若隨機抽取本週一筆入館紀錄，已知該紀錄來自週四到週六，來自週六的機率最接近多少？',`${Math.round(vals[5]/sum(vals.slice(3))*100)}%`,[`${Math.round(vals[5]/sum(vals)*100)}%`,`${Math.round(vals[3]/sum(vals.slice(3))*100)}%`,'33%'],'條件母體只包含後三天。',`${vals[5]}÷(${vals[3]}＋${vals[4]}＋${vals[5]})。`],()=>['若週二與週五各有十分之一為重複計數，修正後全週平均約為多少？',fmt((sum(vals)-vals[1]*.1-vals[4]*.1)/6),[fmt(mean(vals)),fmt((sum(vals)-vals[1]-vals[4])/4),fmt((sum(vals)*.9)/6)],'只扣除指定兩天的重複部分。',`修正總數為${fmt(sum(vals)-vals[1]*.1-vals[4]*.1)}。`],()=>['若以相鄰兩日人次差的絕對值衡量波動，哪一段對總波動量的貢獻最大？',`${cats[inc.map(Math.abs).indexOf(Math.max(...inc.map(Math.abs)))]}到${cats[inc.map(Math.abs).indexOf(Math.max(...inc.map(Math.abs)))+1]}`,['週一到週二','週二到週三','週四到週五'].filter(x=>x!==`${cats[inc.map(Math.abs).indexOf(Math.max(...inc.map(Math.abs)))]}到${cats[inc.map(Math.abs).indexOf(Math.max(...inc.map(Math.abs)))+1]}`),'比較相鄰差的絕對值，不看上升或下降方向。','最大絕對差所對應的相鄰日期即為答案。'],()=>['若把六天人次全部乘以二後再減去五，原圖中哪一項關係必定保持不變？','各日高低次序',['平均數數值','全距數值','總人次'],'正倍數線性轉換保持順序。','乘正數再平移不改變大小排序。'],()=>['若週日人次未知，但全週中位數恰等於週五人次，週日人次可能落在哪個範圍？',medianRange(vals,vals[4]),['必小於週一','必大於週六','只能等於週五'],'將六筆已知值與未知值排序，檢查第4筆位置。','依七筆資料的中位數位置判斷未知值範圍。'],()=>['若後三天每人次的平均停留時間比前三天多四分之一，後三天總停留時間約為前三天的幾倍？',fmt(sum(vals.slice(3))*1.25/sum(vals.slice(0,3))),[fmt(sum(vals.slice(3))/sum(vals.slice(0,3))), '1.25',fmt(sum(vals.slice(0,3))*1.25/sum(vals.slice(3)))],'總停留時間同時受人次與每人時間影響。',`比值＝後三天人次總和×1.25÷前三天人次總和。`],()=>['若希望調整一日資料，使六天平均不變但全距縮小，最合理的做法是？','將最高日減少的量加到最低日',['只提高最高日','只降低最低日','所有日都增加相同人次'],'總和須不變，且最高與最低差要縮小。','由最高移向最低可同時保持總和並縮小全距。']];[q,a,w,h,e]=tasks[v]();
  }
  return pack(q,a,w,h,e,fig,seed,'折線圖');
}
function medianRange(vals,target){const s=[...vals].sort((a,b)=>a-b),lower=s.filter(x=>x<target).length,upper=s.filter(x=>x>target).length;return lower<=3&&upper<=3?'可在一段範圍內變動':'條件無法成立'}

function makePie(level,v,seed,ordinal=0){
  const cats=['步行','自行車','公車','捷運','汽車'];
  const partitions=[[15,10,20,45,10],[20,10,25,35,10],[25,10,20,35,10],[15,15,25,35,10],[20,15,20,35,10],[25,15,25,25,10],[15,20,20,35,10],[20,20,25,25,10],[25,20,20,25,10],[15,10,30,35,10],[20,10,30,30,10],[25,10,30,25,10],[15,10,20,50,5],[20,10,25,40,5],[25,10,20,40,5],[15,15,25,40,5],[20,15,20,40,5],[25,15,25,30,5],[15,20,20,40,5],[20,20,25,30,5],[25,20,20,30,5],[15,10,30,40,5],[20,10,30,35,5],[25,10,30,30,5]];
  const pieIndex=ordinal,parts=partitions[pieIndex%partitions.length],total=200+(pieIndex%4)*100,fig=pieFig('學生通學方式圓形圖',cats,parts,total),maxI=parts.indexOf(Math.max(...parts)),minI=parts.indexOf(Math.min(...parts));let q,a,w,h,e;
  if(level==='easy'){
    const tasks=[()=>['所占比例最大的通學方式是哪一種？',cats[maxI],cats.filter(x=>x!==cats[maxI]).slice(0,3),'比較圖例百分比。',`${cats[maxI]}占${parts[maxI]}%，比例最大。`],()=>['所占比例最小的通學方式是哪一種？',cats[minI],cats.filter(x=>x!==cats[minI]).slice(0,3),'找最小百分比。',`${cats[minI]}占${parts[minI]}%。`],()=>['搭公車的學生占百分之多少？',`${parts[2]}%`,parts.filter((_,i)=>i!==2).slice(0,3).map(x=>`${x}%`),'直接讀取圖例。',`公車占${parts[2]}%。`],()=>['步行部分的圓心角是多少度？',`${fmt(parts[0]*3.6)}°`,[`${parts[0]}°`,`${fmt(parts[1]*3.6)}°`,`${fmt(parts[2]*3.6)}°`],'圓餅圖不直接標角度；用步行百分比乘以三百六十度。',`${parts[0]}%×360°＝${fmt(parts[0]*3.6)}°。`],()=>['步行與自行車合計占百分之多少？',`${parts[0]+parts[1]}%`,[`${parts[0]}%`,`${parts[1]}%`,`${parts[0]+parts[2]}%`],'將兩個百分比相加。',`${parts[0]}%＋${parts[1]}%＝${parts[0]+parts[1]}%。`],()=>['搭捷運與搭汽車的比例相差幾個百分點？',`${Math.abs(parts[3]-parts[4])}個百分點`,[`${parts[3]+parts[4]}個百分點`,`${parts[3]}個百分點`,`${parts[4]}個百分點`],'百分點差用兩個百分比相減。',`兩者相差${Math.abs(parts[3]-parts[4])}個百分點。`],()=>['依圖中總數，搭公車的學生有多少人？',total*parts[2]/100,[total*parts[0]/100,total*parts[3]/100,total*parts[4]/100],'總數乘以公車比例。',`${total}×${parts[2]}%＝${total*parts[2]/100}。`],()=>['步行與捷運合計占百分之多少？',`${parts[0]+parts[3]}%`,[`${parts[0]+parts[1]}%`,`${parts[2]+parts[4]}%`,`${parts[1]+parts[3]}%`],'將兩個指定扇形比例相加。',`${parts[0]}%＋${parts[3]}%＝${parts[0]+parts[3]}%。`]];[q,a,w,h,e]=tasks[v]();
  }else if(level==='medium'){
    const tasks=[()=>['依圖中總數，自行車與汽車合計有多少人？',total*(parts[1]+parts[4])/100,[total*parts[0]/100,total*parts[2]/100,total*parts[3]/100],'先合併比例再乘總數。',`${total}×(${parts[1]}%＋${parts[4]}%)＝${total*(parts[1]+parts[4])/100}。`],()=>['若搭公車者的五分之一改搭捷運，調整後捷運占百分之多少？',`${fmt(parts[3]+parts[2]/5)}%`,[`${parts[3]}%`,`${fmt(parts[3]+parts[2]/10)}%`,`${parts[3]+parts[2]}%`],'把公車比例的五分之一加到捷運。',`${parts[3]}%＋${parts[2]}%×1/5＝${fmt(parts[3]+parts[2]/5)}%。`],()=>['若步行人數增加，但總人數與其他類人數不變，哪一扇形一定變小？','其他四類的圓心角都變小',['只有汽車','只有捷運','所有扇形都不變'],'分母增加而其他類分子固定。','其他各類所占比例均下降。'],()=>['將步行與自行車合併為低碳通學，低碳通學的圓心角是多少度？',`${fmt((parts[0]+parts[1])*3.6)}°`,[`${parts[0]+parts[1]}°`,`${fmt(parts[0]*3.6)}°`,`${fmt(parts[1]*3.6)}°`],'合併兩扇形角度。',`${fmt(parts[0]*3.6)}°＋${fmt(parts[1]*3.6)}°＝${fmt((parts[0]+parts[1])*3.6)}°。`],()=>['若抽一位非汽車通學者，他搭捷運的機率最接近多少？',`${Math.round(parts[3]/(100-parts[4])*100)}%`,[`${parts[3]}%`,`${Math.round(parts[3]/100*parts[4])}%`,`${100-parts[4]}%`],'條件分母排除汽車所占比例。',`${parts[3]}%÷${100-parts[4]}%約為${Math.round(parts[3]/(100-parts[4])*100)}%。`],()=>['搭捷運與搭自行車的人數相差多少？',total*Math.abs(parts[3]-parts[1])/100,[total*parts[3]/100,total*parts[1]/100,total*(parts[3]+parts[1])/100],'先求比例差，再乘總數。',`${total}×|${parts[3]}%－${parts[1]}%|＝${total*Math.abs(parts[3]-parts[1])/100}。`],()=>['若學校補助公車與捷運，每位補助相同金額，兩類合計會占補助總額的多少？',`${parts[2]+parts[3]}%`,[`${parts[2]}%`,`${parts[3]}%`,`${parts[0]+parts[1]}%`],'每人補助相同，所以金額比例等於人數比例。',`${parts[2]}%＋${parts[3]}%＝${parts[2]+parts[3]}%。`],()=>['若將汽車通學者平均分到步行與自行車，調整後兩類比例相差多少個百分點？',`${Math.abs(parts[0]-parts[1])}個百分點`,[`${Math.abs(parts[0]-parts[1])+parts[4]}個百分點`,`${parts[4]}個百分點`,'0個百分點'],'兩類各增加相同的一半汽車比例，原差距不變。',`兩類都增加${fmt(parts[4]/2)}個百分點，差仍為${Math.abs(parts[0]-parts[1])}個百分點。`]];[q,a,w,h,e]=tasks[v]();
  }else{
    const minSample=100/parts.reduce((g,x)=>gcd(g,x));
    const tasks=[()=>['若分層抽樣並維持圖中比例，各通學方式人數都必須是整數，樣本數最少須為多少人？',minSample,[minSample+10,minSample*2,100],'把各百分比化成最簡分數，找共同分母。',`各比例共同條件下的最小樣本數為${minSample}。`],()=>['若兩位學生不放回抽出，兩人都搭捷運的機率最接近多少？',`${fmt(total*parts[3]/100/total*(total*parts[3]/100-1)/(total-1)*100)}%`,[`${fmt((parts[3]/100)**2*100)}%`,`${parts[3]}%`,`${fmt((total*parts[3]/100-1)/(total-1)*100)}%`],'第二次的捷運人數與總人數都減一。',`${total*parts[3]/100}/${total}×${total*parts[3]/100-1}/${total-1}。`],()=>['若公車類誤將十位自行車學生計入，修正後兩類比例相差多少個百分點？',`${fmt(Math.abs((total*parts[2]/100-10)-(total*parts[1]/100+10))/total*100)}個百分點`,[`${Math.abs(parts[2]-parts[1])}個百分點`,'10個百分點',`${parts[2]+parts[1]}個百分點`],'一類減十，另一類加十，總數不變。','修正兩類人數後再除以總數。'],()=>['若低碳通學定義為步行、自行車與捷運，從低碳通學者中抽一人，搭捷運的機率最接近多少？',`${Math.round(parts[3]/(parts[0]+parts[1]+parts[3])*100)}%`,[`${parts[3]}%`,`${parts[0]+parts[1]+parts[3]}%`,`${Math.round(parts[3]/(100-parts[3])*100)}%`],'條件分母只含三個低碳類別。',`${parts[3]}%÷(${parts[0]}%＋${parts[1]}%＋${parts[3]}%)。`],()=>['若總人數增加百分之二十且各類比例不變，搭汽車增加多少人？',total*.2*parts[4]/100,[total*parts[4]/100,total*.2,total*(.2+parts[4]/100)],'只計算新增總人數中的汽車比例。',`${total}×20%×${parts[4]}%＝${total*.2*parts[4]/100}。`],()=>['學校要讓公車與捷運合計降到全體的四成，且只把這兩類學生移至步行，至少需移動多少人？',Math.max(0,total*(parts[2]+parts[3]-40)/100),[total*.4,total*(parts[2]+parts[3])/100,total*Math.abs(parts[2]+parts[3]-parts[0])/100],'先算目前兩類合計比例超過四成的部分。',`需移動${parts[2]+parts[3]-40}個百分點，即${Math.max(0,total*(parts[2]+parts[3]-40)/100)}人。`],()=>['若圖中百分比皆四捨五入到整數，哪一項最無法由圖中資料唯一確定？','每一類的精確人數',['比例最大的類別','比例最小的類別','各類約略比例'],'四捨五入後可能對應多個精確人數。','即使總數已知，四捨五入比例仍可能使精確人數不唯一。'],()=>['若通學碳排量依序為步行零、自行車零、公車二、捷運一、汽車五個單位，每位學生平均碳排量是多少單位？',fmt(parts[2]/100*2+parts[3]/100+parts[4]/100*5),[fmt((parts[2]+parts[3]+parts[4])/100),fmt(2+1+5),fmt(parts[2]/100*2)],'用各類比例乘單位排放量後相加。',`平均為${parts[2]}%×2＋${parts[3]}%×1＋${parts[4]}%×5。`]];[q,a,w,h,e]=tasks[v]();
  }
  return pack(q,a,w,h,e,fig,seed,'圓形圖');
}
function gcd(a,b){while(b)[a,b]=[b,a%b];return a}

function makeTable(level,v,seed){
  const rows=['七年級','八年級'],cols=['喜歡球類','喜歡游泳'],rv=randomValues(seed+151,4,0,20),data=[[18+rv[0],13+rv[1]],[16+rv[2],24+rv[3]]],fig=tableFig('年級與運動偏好列聯表',rows,cols,data);const r0=sum(data[0]),r1=sum(data[1]),c0=data[0][0]+data[1][0],c1=data[0][1]+data[1][1],n=r0+r1;let q,a,w,h,e;
  if(level==='easy'){
    const tasks=[()=>['七年級喜歡球類的有多少人？',data[0][0],[data[0][1],data[1][0],data[1][1]],'讀取七年級列與球類欄交會格。',`交會格是${data[0][0]}。`],()=>['八年級合計調查多少人？',r1,[r0,c0,c1],'讀取八年級列合計。',`八年級合計${r1}人。`],()=>['喜歡游泳的合計有多少人？',c1,[c0,r0,r1],'讀取游泳欄合計。',`游泳欄合計${c1}人。`],()=>['全表共調查多少人？',n,[r0,r1,c0],'讀取右下角總合計。',`總計${n}人。`],()=>['七年級中兩種偏好相差多少人？',Math.abs(data[0][0]-data[0][1]),[sum(data[0]),data[0][0],data[0][1]],'同一列兩格相減。',`${Math.max(...data[0])}－${Math.min(...data[0])}＝${Math.abs(data[0][0]-data[0][1])}。`],()=>['哪一個年級喜歡游泳的人較多？',data[0][1]>data[1][1]?'七年級':'八年級',['兩年級相同','無法判斷','全校'],'比較游泳欄兩格。',`${data[0][1]}與${data[1][1]}相比。`],()=>['喜歡球類比喜歡游泳多多少人？',c0-c1,[c0+c1,c0,c1],'比較兩欄合計。',`${c0}－${c1}＝${c0-c1}。`],()=>['從表中任選一人，最可能落在哪一格？',largestCell(rows,cols,data),otherCells(rows,cols,largestCell(rows,cols,data)),'找四個內部格的最大值。','最大交會格代表最可能類別。']];[q,a,w,h,e]=tasks[v]();
  }else if(level==='medium'){
    const tasks=[()=>['在七年級學生中，喜歡游泳者約占百分之多少？',`${Math.round(data[0][1]/r0*100)}%`,[`${Math.round(data[0][1]/n*100)}%`,`${Math.round(c1/n*100)}%`,`${Math.round(data[0][0]/r0*100)}%`],'條件是七年級，分母用七年級列合計。',`${data[0][1]}÷${r0}。`],()=>['在喜歡球類的學生中，八年級約占百分之多少？',`${Math.round(data[1][0]/c0*100)}%`,[`${Math.round(data[1][0]/r1*100)}%`,`${Math.round(data[1][0]/n*100)}%`,`${Math.round(data[0][0]/c0*100)}%`],'條件是喜歡球類，分母用球類欄合計。',`${data[1][0]}÷${c0}。`],()=>['若七年級有三人由球類改選游泳，七年級兩類偏好相差多少人？',Math.abs(data[0][0]-3-(data[0][1]+3)),[Math.abs(data[0][0]-data[0][1]),Math.abs(data[0][0]-3-data[0][1]),6],'同一列一格減三、另一格加三。','調整兩格後再相減。'],()=>['若要讓兩個年級調查人數相同，人數較少的年級需增加多少人？',Math.abs(r0-r1),[r0+r1,r0,r1],'比較兩列合計。',`兩列合計相差${Math.abs(r0-r1)}。`],()=>['任選一人，抽到八年級且喜歡游泳的機率約為多少？',`${Math.round(data[1][1]/n*100)}%`,[`${Math.round(data[1][1]/r1*100)}%`,`${Math.round(c1/n*100)}%`,`${Math.round(r1/n*100)}%`],'「且」對應單一交會格，分母為總人數。',`${data[1][1]}÷${n}。`],()=>['任選一人，抽到七年級或喜歡球類的共有多少種符合資料？',r0+c0-data[0][0],[r0+c0,r0+c0+data[0][0],n-(r0+c0-data[0][0])],'加兩個合計後扣掉重複交會格。',`${r0}＋${c0}－${data[0][0]}＝${r0+c0-data[0][0]}。`],()=>['比較兩年級游泳偏好率，哪一個年級較高？',data[0][1]/r0>data[1][1]/r1?'七年級':'八年級',['兩者相同','只看人數無法比較','全校'],'分別用各年級游泳人數除以該年級合計。','比較兩個列內百分比。'],()=>['若每位球類學生需一顆球、每兩位游泳學生共用一塊浮板，器材總數至少多少？',c0+Math.ceil(c1/2),[c0+c1,Math.ceil(c0/2)+c1,Math.floor(c1/2)],'球是一人一顆；浮板兩人一塊要無條件進位。',`${c0}＋⌈${c1}÷2⌉＝${c0+Math.ceil(c1/2)}。`]];[q,a,w,h,e]=tasks[v]();
  }else{
    const tasks=[()=>['已知抽到七年級學生，他喜歡球類；與已知喜歡球類而抽到七年級相比，哪個條件機率較大？',data[0][0]/r0>data[0][0]/c0?'前者':'後者',['兩者相同','資料不足','皆為百分之五十'],'兩者分子相同，但條件分母不同。',`比較${data[0][0]}/${r0}與${data[0][0]}/${c0}。`],()=>['若每格各漏登相同比例的學生，下列哪一項保持不變？','各格占總數的比例',['各格人數','總人數','列合計人數'],'所有格同乘相同倍率，比例不變。','等比例縮放不改變相對分布。'],()=>['若從七年級球類移兩人到八年級游泳，哪兩個邊際合計會同時改變？','兩個年級列合計與兩種偏好欄合計',['只有總人數','只有年級列合計','只有偏好欄合計'],'跨列又跨欄移動，列與欄合計都變，總數不變。','來源列欄各減，目的列欄各加。'],()=>['若分別從兩個年級各抽一人，兩人都喜歡游泳的機率最接近多少？',`${fmt(data[0][1]/r0*data[1][1]/r1*100)}%`,[`${fmt((c1/n)**2*100)}%`,`${fmt(c1/n*100)}%`,`${fmt(data[0][1]*data[1][1]/n**2*100)}%`],'兩次抽樣來自不同年級，分母各用該列合計。','兩個條件機率相乘。'],()=>['若要求兩年級的球類偏好率完全相同，且只能在八年級兩類間調整，至少需移動幾人最接近目標？',closestShift(data),[Math.abs(data[0][0]-data[1][0]),Math.abs(r0-r1),0],'七年級比率作為目標，八年級總數不變。','以八年級合計乘七年級球類比率，和目前球類人數比較。'],()=>['若只公布列百分比而隱藏人數，下列哪項仍可直接比較？','同一年級內兩種偏好的相對高低',['兩年級總人數','全校總人數','某格確切人數'],'列百分比保留列內比例，但沒有規模。','可比較同列比例，不能還原人數。'],()=>['以卡方概念觀察年級與偏好是否可能相關，哪種現象最值得進一步檢查？','兩年級的列內偏好比例差距明顯',['所有格人數相同','總人數是偶數','欄合計大於零'],'關聯性表現在條件分布差異。','若列內比例不同，年級可能與偏好相關。'],()=>['若隨機抽兩人且不放回，第一人是七年級球類、第二人是八年級游泳的機率為何？',`${fmt(data[0][0]/n*data[1][1]/(n-1)*100)}%`,[`${fmt(data[0][0]/n*data[1][1]/n*100)}%`,`${fmt(data[0][0]/r0*data[1][1]/r1*100)}%`,`${fmt((data[0][0]+data[1][1])/n*100)}%`],'第一次後總人數減一，指定第二格人數不變。',`${data[0][0]}/${n}×${data[1][1]}/${n-1}。`]];[q,a,w,h,e]=tasks[v]();
  }
  return pack(q,a,w,h,e,fig,seed,'列聯表');
}
function largestCell(rows,cols,data){let best=[-1,''];data.forEach((r,i)=>r.forEach((x,j)=>{if(x>best[0])best=[x,`${rows[i]}且${cols[j]}`]}));return best[1]}
function otherCells(rows,cols,answer){return rows.flatMap((r,i)=>cols.map((c,j)=>`${r}且${c}`)).filter(x=>x!==answer).slice(0,3)}
function closestShift(data){const r0=sum(data[0]),r1=sum(data[1]),target=Math.round(data[0][0]/r0*r1);return Math.abs(target-data[1][0])}

function makeFreq(level,v,seed){
  const profiles=[['閱讀時間','分鐘'],['通勤時間','分鐘'],['每日運動時間','分鐘'],['解題時間','分鐘'],['圖書借閱量','冊']];
  const [subject,unit]=profiles[seed%profiles.length],groups=['0–9','10–19','20–29','30–39','40–49','50–59'],rv=randomValues(seed+227,6,0,8),vals=[2+rv[0]%5,6+rv[1],11+rv[2],20+rv[3],9+rv[4],3+rv[5]],fig=freqFig(`${subject}（${unit}）次數分配折線圖`,groups,vals);let q,a,w,h,e;const n=sum(vals),cum=vals.map((_,i)=>sum(vals.slice(0,i+1)));
  if(level==='easy'){
    const tasks=[()=>['次數最多的是哪一組？',groups[vals.indexOf(Math.max(...vals))],groups.filter(x=>x!==groups[vals.indexOf(Math.max(...vals))]).slice(0,3),'找最高資料點。',`最高點次數為${Math.max(...vals)}。`],()=>[`${subject}落在第二組的有多少人？`,vals[1],[vals[0],vals[2],vals[3]],'讀取第二組資料點旁數值。',`第二組次數為${vals[1]}。`],()=>['全體共調查多少人？',n,[Math.max(...vals),sum(vals.slice(0,3)),sum(vals.slice(3))],'把各組次數相加。',`${vals.join('＋')}＝${n}。`],()=>['第三組與第四組相差多少人？',Math.abs(vals[2]-vals[3]),[vals[2]+vals[3],vals[2],vals[3]],'兩組次數相減。',`${Math.max(vals[2],vals[3])}－${Math.min(vals[2],vals[3])}＝${Math.abs(vals[2]-vals[3])}。`],()=>['累積到第三組共有多少人？',cum[2],[vals[2],cum[1],n-cum[2]],'加總前三組次數。',`${vals.slice(0,3).join('＋')}＝${cum[2]}。`],()=>['次數低於第二組的組別共有幾組？',vals.filter(x=>x<vals[1]).length,[1,2,5],'用第二組次數逐一比較。',`共有${vals.filter(x=>x<vals[1]).length}組。`],()=>['曲線由第三組到第四組呈現什麼變化？','上升',['下降','不變','無法判斷'],'比較兩資料點高度與標示數值。',`${vals[2]}增加到${vals[3]}。`],()=>['最後兩組合計有多少人？',vals[4]+vals[5],[Math.abs(vals[4]-vals[5]),vals[4],vals[5]],'加總最後兩組。',`${vals[4]}＋${vals[5]}＝${vals[4]+vals[5]}。`],()=>['前三組與後三組的人數相差多少？',Math.abs(sum(vals.slice(0,3))-sum(vals.slice(3))),[sum(vals.slice(0,3)),sum(vals.slice(3)),n],'分別加總前三組與後三組，再相減。',`兩部分相差${Math.abs(sum(vals.slice(0,3))-sum(vals.slice(3)))}人。`],()=>['次數至少為十人的組別共有幾組？',vals.filter(x=>x>=10).length,[2,3,6],'檢查各資料點的標示次數是否達十人。',`共有${vals.filter(x=>x>=10).length}組達到十人。`]];[q,a,w,h,e]=tasks[v]();
  }else if(level==='medium'){
    const mids=[4.5,14.5,24.5,34.5,44.5,54.5],est=sum(mids.map((x,i)=>x*vals[i]))/n;
    const tasks=[()=>[`用各組組中點估計，平均${subject}約為多少${unit}？`,fmt(est),[fmt(mean(mids)),fmt(n/6),fmt(est+5)],'各組組中點乘次數，加總後除以總人數。',`估計平均約${fmt(est)}${unit}。`],()=>['中位數落在哪一組？',groups[cum.findIndex(x=>x>=n/2)],groups.filter(x=>x!==groups[cum.findIndex(x=>x>=n/2)]).slice(0,3),'找累積次數首次達總數一半的組。',`總數一半為${fmt(n/2)}，查看累積次數。`],()=>['第三組的相對次數約為百分之多少？',`${Math.round(vals[2]/n*100)}%`,[`${Math.round(vals[2]/Math.max(...vals)*100)}%`,`${vals[2]}%`,`${Math.round(cum[2]/n*100)}%`],'該組次數除以總次數。',`${vals[2]}÷${n}。`],()=>['若第四組有三人改列入第五組，眾數組是否改變？',vals[3]-3>=vals[4]+3?'仍是第四組':'改為第五組',['改為第三組','兩組次數相同','無法判斷'],'同時調整兩組次數後比較。',`調整後為${vals[3]-3}與${vals[4]+3}。`],()=>[`${subject}至少三十${unit}的共有多少人？`,sum(vals.slice(3)),[cum[2],sum(vals.slice(2)),vals[3]],'加總第四組以後的次數。',`${vals.slice(3).join('＋')}＝${sum(vals.slice(3))}。`],()=>[`若每組上限都增加相同${unit}而次數不變，哪個統計量一定不變？`,'各組次數分布形狀',['估計平均數','各組組中點',subject],'水平平移不改變每組次數。','折線的高低形狀不變。'],()=>['若只抽取前三組中的一人，他來自第三組的機率約為多少？',`${Math.round(vals[2]/cum[2]*100)}%`,[`${Math.round(vals[2]/n*100)}%`,`${Math.round(cum[2]/n*100)}%`,`${Math.round(vals[2]/sum(vals.slice(2))*100)}%`],'條件分母只包含前三組。',`${vals[2]}÷${cum[2]}。`],()=>['若第一組與最後一組資料全部移除，新總人數是多少？',n-vals[0]-vals[5],[n,vals[0]+vals[5],sum(vals.slice(1,4))],'總數扣除首尾兩組。',`${n}－${vals[0]}－${vals[5]}＝${n-vals[0]-vals[5]}。`],()=>['第二組到第四組合計約占全體百分之多少？',`${Math.round(sum(vals.slice(1,4))/n*100)}%`,[`${Math.round(cum[2]/n*100)}%`,`${Math.round(sum(vals.slice(2,5))/n*100)}%`,`${Math.round(vals[3]/n*100)}%`],'先合計第二至第四組，再除以總人數。',`比例約為${Math.round(sum(vals.slice(1,4))/n*100)}%。`],()=>['若樣本數擴大為原來兩倍且分布比例不變，第四組預期有多少人？',vals[3]*2,[vals[3],n*2,Math.round(vals[3]/n*200)],'各組次數都依相同倍率放大。',`第四組由${vals[3]}人增為${vals[3]*2}人。`]];[q,a,w,h,e]=tasks[v]();
  }else{
    const mids=[4.5,14.5,24.5,34.5,44.5,54.5],est=sum(mids.map((x,i)=>x*vals[i]))/n;
    const tasks=[()=>['若每組資料都以組中點代表，估計變異程度時必須先知道哪一項？','估計平均數',['眾數組名稱','折線顏色','橫軸寬度'],'平方離差需以平均數為中心。','先求加權平均，再計算各組中點離差。'],()=>['若中位數位於第四組，僅依此圖最能確定的是什麼？','排序後中間位置落在第四組範圍',['中位數的精確值','平均數等於中位數','第四組每人數值相同'],'組距資料只能定位組別，不能唯一還原組內數值。','可確定中位數組，不能確定精確中位數。'],()=>[`若第三組全體增加相同${unit}但仍留在原組，圖上哪項完全不變？`,'各組次數與折線形狀',['原始平均數',`每人的${subject}`,'資料總和'],'未跨組，所以次數分配不變。','組內變動未改變任何組別次數。'],()=>['若要使第五組成為唯一眾數組，至少需由第四組移多少人到第五組？',Math.floor((vals[3]-vals[4])/2)+1,[vals[3]-vals[4],Math.ceil((vals[3]-vals[4])/2),1],'移一人會讓兩組差距縮小二，且第五組須嚴格較大。',`至少移${Math.floor((vals[3]-vals[4])/2)+1}人。`],()=>[`以組中點估計平均數後，若第一組一人移到最後一組，估計平均增加多少${unit}？`,fmt((mids[5]-mids[0])/n),[fmt(mids[5]-mids[0]),fmt((mids[5]+mids[0])/n),fmt(est/n)],'總和增加兩組中點差，再除以總人數。',`平均增加(${mids[5]}－${mids[0]})÷${n}。`],()=>[`若從${subject}至少三十${unit}者中隨機抽一人，抽到第五組的機率約為多少？`,`${Math.round(vals[4]/sum(vals.slice(3))*100)}%`,[`${Math.round(vals[4]/n*100)}%`,`${Math.round(sum(vals.slice(4))/n*100)}%`,`${Math.round(vals[4]/sum(vals.slice(2))*100)}%`],'條件分母為第四到第六組總次數。',`${vals[4]}÷${sum(vals.slice(3))}。`],()=>['兩班的次數分配折線形狀相同，但其中一班每組次數都是此圖的兩倍，哪項敘述正確？','兩班相對次數分布相同',['兩班總人數相同','兩班每組次數相同','兩班資料總和必相同'],'所有次數同比例放大，相對次數不變。','比例形狀相同但規模不同。'],()=>['若實際資料在各組內都集中於上限附近，以組中點估計平均數會有何傾向？','可能低估實際平均數',['一定高估','一定完全相等','無法形成任何判斷'],'組中點小於靠近上限的實際值。','各組代表值偏低，因此估計平均可能偏低。'],()=>['只知道各組次數而不知道組內原始值，下列哪一項通常無法唯一確定？','原始資料的精確平均數',['總人數','眾數組','累積到第三組的人數'],'分組會遺失組內每筆資料的確切位置。','可估計平均，但不能唯一還原精確平均。'],()=>[`若所有組距不變，但每一組的上下限都同時增加五${unit}，以組中點估計的平均會如何改變？`,`增加5${unit}`,[`不變`,`增加10${unit}`,`減少5${unit}`],'所有組中點同時增加五，次數不變。',`加權平均也會增加5${unit}。`]];[q,a,w,h,e]=tasks[v]();
  }
  return pack(q,a,w,h,e,fig,seed,'次數分配折線圖');
}

function pack(question,answer,wrong,hint,explanation,figureSvg,seed,figureType){
  const o=optionSet(answer,wrong,seed);
  const detailedExplanation=`${explanation} 因此答案為${answer}。`;
  return {question,options:o.options,answerIndex:o.answerIndex,hint,explanation:detailedExplanation,figureType,figureSvg,difficultyDesign:{name:seed<0?'':'',steps:'',description:''}};
}

const makers={長條圖:makeBar,折線圖:makeLine,圓形圖:makePie,列聯表:makeTable,次數分配折線圖:makeFreq};
const typeSchedule=Array.from({length:revise842to901?20:40},(_,i)=>TYPES[i%5]);
if(!revise842to901){
  typeSchedule[32]='次數分配折線圖';
  typeSchedule[38]='次數分配折線圖';
}
const levelCounts={easy:0,medium:0,hard:0},levelTypeCounts={},typeTotals={};
for(let i=START;i<END;i++){
  const old=bank.questions[i],display=i-238,level=old.level,type=typeSchedule[levelCounts[level]++],key=`${level}|${type}`,variant=levelTypeCounts[key]||0,ordinal=typeTotals[type]||0;
  levelTypeCounts[key]=variant+1;typeTotals[type]=ordinal+1;
  const made=makers[type](level,variant,display,ordinal);
  made.difficultyDesign=level==='easy'
    ?{name:'基礎讀圖',steps:'1～2步',description:'讀取單一圖表資訊並完成一次比較或運算'}
    :level==='medium'
      ?{name:'統整應用',steps:'2～3步',description:'轉換圖表資訊、處理條件分母或完成多步驟運算'}
      :{name:'會考鑑別',steps:'3步以上',description:'分析條件、評估限制或推論資料，不能由易題直接拼接作答'};
  bank.questions[i]={...old,...made};
}
const reviewKey=revise842to901?'review842to901':'review482to601';
bank.metadata={...bank.metadata,[reviewKey]:{revisedAt:new Date().toISOString(),displayRange:revise842to901?'842-901':'482-601',count:END-START,chartTypes:TYPES,rule:'題幹與圖表一致；五種圖表平均配置；中難題為獨立推理題，不拼接易題'}};
writeFileSync(source,JSON.stringify(bank,null,2),'utf8');
console.log(revise842to901?'已重寫第842～901題：60題，五種圖表，易中難各20題。':'已重寫第482～601題：120題，五種圖表，易中難各40題。');
