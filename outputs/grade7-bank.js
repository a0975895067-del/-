(()=>{
 const make=(u,l,t,answer,wrong,h,e,fig='')=>{
  const answerText=String(answer),options=[answerText,...wrong.map(String)].filter((v,i,a)=>a.indexOf(v)===i);
  const numeric=Number(answerText);
  const fillers=Number.isFinite(numeric)
   ?[numeric+1,numeric-1,-numeric,numeric+2,numeric-2,numeric*2,0].map(String)
   :['以上皆非','條件不足','無法判斷','兩者相同'];
  for(const value of fillers)if(options.length<4&&!options.includes(value))options.push(value);
  return {u,l,t,o:options.slice(0,4),a:0,h,e,fig};
 };
 const pick=(s,a)=>a[Math.abs(s)%a.length],lv={easy:'基礎',medium:'中等',hard:'挑戰'};
 window.grade7ImportedQuestion=(u,l,s)=>{const k=Math.abs(s)%3,n=3+Math.abs(Math.floor(s/3))%18,p=2+Math.abs(Math.floor(s/7))%8,tag=`【${lv[l]}・解析卷二創】`;
  if(u==='數與數線'){
   if(k===0){const a=n*(l==='hard'?2:1);return make(u,l,`${tag}數線上 A 點表示 −${a}，A 到原點的距離是多少？`,a,[-a,2*a,0],'絕對值是到原點的距離。',`|−${a}|=${a}。`);}
   if(k===1){const a=n,b=p;return make(u,l,`${tag}數線上 P(−${a})、Q(${b})，PQ 的長度是多少？`,a+b,[Math.abs(a-b),a,b],'異號兩點的距離會跨過原點。',`${a}+${b}=${a+b}。`);}
   const a=n,b=p,ans=b-a;return make(u,l,`${tag}升降機從地下 ${a} 層移到地上 ${b} 層，以地面為 0，共上升幾層？`,a+b,[ans,a,b],'從負數移到正數，要計算兩位置的差。',`${b}−(−${a})=${a+b}。`);
  }
  if(u==='整數四則運算'){
   if(k===0){const ans=n+p*3;return make(u,l,`${tag}計算 ${n}−(−${p})×3。`,ans,[(n+p)*3,n-3*p,n+p],'先乘除後加減，減去負數變加法。',`${n}−(−${3*p})=${ans}。`);}
   if(k===1){const start=-n,change=p*2,ans=start+change;return make(u,l,`${tag}清晨氣溫為 ${start}℃，中午上升 ${change}℃，中午氣溫為何？`,ans,[start-change,change,n],'上升用加法表示。',`${start}+${change}=${ans}℃。`);}
   const right=n,wrong=p,total=right*4-wrong*2;return make(u,l,`${tag}答對一題得 4 分、答錯一題扣 2 分。答對 ${right} 題、答錯 ${wrong} 題，總分多少？`,total,[right*4+wrong*2,(right-wrong)*2,right+wrong],'得分與扣分要分開計算。',`${right}×4−${wrong}×2=${total}。`);
  }
  if(u==='分配律與運算規則'){
   if(k===0)return make(u,l,`${tag}${n}×(${p}+5) 展開後是哪一式？`,`${n}×${p}+${n}×5`,[`${n}×${p}+5`,`${n}+${p}×5`,`${n}×${p*5}`],'括號外的數要乘到每一項。',`a(b+c)=ab+ac。`);
   if(k===1){const ans=n*(100-p);return make(u,l,`${tag}利用分配律計算 ${n}×100−${n}×${p}。`,ans,[n*(100+p),100-n*p,n*100-p],'提出共同因數。',`${n}×(100−${p})=${ans}。`);}
   const ans=n*p+n*4;return make(u,l,`${tag}某生把 ${n}×(${p}+4) 算成 ${n}×${p}+4。正確值是多少？`,ans,[n*p+4,n*(p+4)+n,n*p*4],'4 也要乘以括號外的數。',`${n}×${p}+${n}×4=${ans}。`);
  }
  if(u==='指數記法與科學記號'){
   if(k===0){const exp=3+p%5,coef=2+n%7;return make(u,l,`${tag}${coef*10**exp} 的科學記號為何？`,`${coef}×10^${exp}`,[`${coef}×10^${exp-1}`,`10^${exp}`,`${coef*10}×10^${exp}`],'係數需介於 1 與 10 之間。',`小數點移動 ${exp} 位。`);}
   if(k===1){const a=2+n%5,b=2+p%4;return make(u,l,`${tag}2^${a}×2^${b}=2^m，m 為何？`,a+b,[a*b,a-b,2*(a+b)],'同底數相乘，指數相加。',`m=${a}+${b}=${a+b}。`);}
   const a=5+n%4,b=2+p%3;return make(u,l,`${tag}3^${a}÷3^${b}=3^m，m 為何？`,a-b,[a+b,a*b,b-a],'同底數相除，指數相減。',`m=${a}−${b}=${a-b}。`);
  }
  if(u==='因數與倍數'){
   if(k===0){const value=n*p;return make(u,l,`${tag}下列哪一個數一定是 ${value} 的因數？`,p,[p+1,value+1,n+p],'可整除原數才是因數。',`${value}÷${p}=${n}。`);}
   if(k===1){const a=2*n,b=3*n;return make(u,l,`${tag}${a} 與 ${b} 的最小公倍數是多少？`,6*n,[n,3*n,12*n],'列出質因數或共同倍數。',`最小公倍數為 ${6*n}。`);}
   const pieces=4+p%5,minutes=(pieces-1)*n,target=pieces+2;return make(u,l,`${tag}木條鋸成 ${pieces} 段需 ${minutes} 分鐘，每次時間相同；鋸成 ${target} 段需幾分鐘？`,(target-1)*n,[target*n,minutes+n,(target-pieces)*n],'段數比鋸切次數多 1。',`${target} 段需鋸 ${target-1} 次。`);
  }
  if(u==='倍數判別與質數'){
   if(k===0){const divisors=[3,9,11],d=divisors[Math.floor(Math.abs(s)/3)%divisors.length],value=d*n;return make(u,l,`${tag}下列哪個數是 ${d} 的倍數？`,value,[value+1,value+2,value+d-1],'用倍數判別或直接除法。',`${value}÷${d}=${n}。`);}
   if(k===1){const primes=[11,13,17,19,23,29,31,37,41,43,47,53],ans=primes[Math.floor(Math.abs(s)/3)%primes.length];return make(u,l,`${tag}下列哪一個數是質數？`,ans,[ans-1,ans+1,ans+3],'質數只有 1 與本身兩個正因數。',`${ans} 無其他正因數。`);}
   const a=2+n%4,b=3+p%3,value=2**a*3**b;return make(u,l,`${tag}${value} 的標準分解式為何？`,`2^${a}×3^${b}`,[`2^${b}×3^${a}`,`6^${a+b}`,`2×3×${a*b}`],'反覆用質數分解。',`${value}=2^${a}×3^${b}。`);
  }
  if(u==='一元一次方程式'){
   if(k===0){const x=p,a=2+n%5,b=n,c=a*x+b;return make(u,l,`${tag}解方程式 ${a}x+${b}=${c}。`,x,[x+1,x-1,c-b],'先移去常數項，再除以係數。',`${a}x=${c-b}，x=${x}。`);}
   if(k===1){const x=n,price=p,total=x*price+20;return make(u,l,`${tag}買 ${x} 本筆記本另付 20 元運費，共 ${total} 元。每本多少元？`,price,[price+2,total/x,total-20],'設單價並列一次方程式。',`${x}x+20=${total}，x=${price}。`);}
   const age=n,diff=p,total=2*age+diff;return make(u,l,`${tag}哥哥比弟弟大 ${diff} 歲，兩人共 ${total} 歲，弟弟幾歲？`,age,[age+diff,total/2,total-diff],'設弟弟 x 歲，哥哥 x+差。',`2x+${diff}=${total}，x=${age}。`);
  }
  if(u==='一元一次不等式'){
   if(k===0)return make(u,l,`${tag}「服務時數 x 至少 ${n} 小時」應寫成哪個不等式？`,`x≥${n}`,[`x>${n}`,`x≤${n}`,`x<${n}`],'至少包含等於。',`x≥${n}。`);
   if(k===1){const a=p,b=n,limit=a*b;return make(u,l,`${tag}每張票 ${a} 元，預算不超過 ${limit} 元，張數 x 應符合哪一式？`,`${a}x≤${limit}`,[`${a}x≥${limit}`,`${a}+x≤${limit}`,`${a}x<${limit}`],'不超過表示小於或等於。',`${a}x≤${limit}。`);}
   const a=2+p%5,b=n,limit=a*b+3;return make(u,l,`${tag}解不等式 ${a}x+3≤${limit}，x 的最大整數值為何？`,b,[b+1,b-1,limit],'先減 3，再除以正數係數。',`${a}x≤${a*b}，x≤${b}。`);
  }
  if(u==='比例與比值'){
   if(k===0)return make(u,l,`${tag}將比 ${n}:${2*n} 化成最簡整數比。`,'1:2',['2:1',`${n}:${2*n}`,`${n+1}:${2*n+1}`],'前後項同除以最大公因數。','得到 1:2。');
   if(k===1){const total=5*n;return make(u,l,`${tag}男、女生人數比為 2:3，共 ${total} 人，女生有幾人？`,3*n,[2*n,5*n,n],'總份數為 5。',`${total}÷5×3=${3*n}。`);}
   return make(u,l,`${tag}地圖比例尺 1:1000，圖上 ${n} 公分代表實際多少公尺？`,10*n,[n,100*n,1000*n],'公分換公尺要除以 100。',`${n}×1000÷100=${10*n}。`);
  }
  if(u==='工作率與反比'){
   if(k===0){const work=n*p;return make(u,l,`${tag}${n} 人工作 ${p} 天完成，總工作量是多少人日？`,work,[n+p,work+n,p],'人日等於人數乘天數。',`${n}×${p}=${work}。`);}
   if(k===1){const work=6*n,people=3,days=work/people;return make(u,l,`${tag}工作量為 ${work} 人日，改由 ${people} 人完成，需要幾天？`,days,[work,people,days+3],'工作量固定時用除法。',`${work}÷${people}=${days}。`);}
   const old=4,newPeople=8,days=2*p;return make(u,l,`${tag}${old} 人需 ${days} 天完成工作，改由 ${newPeople} 人且效率相同，需要幾天？`,days/2,[days,days*2,newPeople],'人數加倍，時間減半。',`${days}×${old}÷${newPeople}=${days/2}。`);
  }
  if(u==='坐標與線型函數'){
   if(k===0){const x=-(n%8+1),y=p;return make(u,l,`${tag}點 P(${x},${y}) 位於哪一象限？`,'第二象限',['第一象限','第三象限','第四象限'],'x 負、y 正。','位於第二象限。');}
   if(k===1){const a=2+p%4,x=n%6,ans=a*x+3;return make(u,l,`${tag}函數 y=${a}x+3，當 x=${x} 時，y 為何？`,ans,[a+x+3,a*x,ans+3],'把 x 代入函數式。',`y=${a}×${x}+3=${ans}。`);}
   const x=n,y=p,dx=3,dy=-2;return make(u,l,`${tag}點 A(${x},${y}) 向右 3、向下 2 單位後坐標為何？`,`(${x+dx},${y+dy})`,[`(${x-dx},${y+dy})`,`(${x+dx},${y-dy})`,`(${x},${y})`],'向右 x 加，向下 y 減。',`(${x+3},${y-2})。`);
  }
  if(u==='資料分析'){
   if(k===0){const a=n,b=n+2,c=n+4;return make(u,l,`${tag}資料 ${a}、${b}、${c} 的平均數是多少？`,b,[a,c,a+b+c],'總和除以資料個數。',`(${a}+${b}+${c})÷3=${b}。`);}
   if(k===1){const a=n-2,b=n,c=n+3;return make(u,l,`${tag}資料 ${a}、${b}、${b}、${c}、${c+2} 的中位數為何？`,b,[a,c,(b+c)/2],'排序後找中間位置。',`第 3 筆為 ${b}。`);}
   const values=[n,n+2,n+2,n+4,n+7],range=7;return make(u,l,`${tag}資料 ${values.join('、')} 的全距為何？`,range,[n+7,n,5],'全距等於最大值減最小值。',`${n+7}−${n}=7。`);
  }
  const price=p*10,count=n%8+3,total=price*count,discount=20; if(k===0)return make(u,l,`${tag}校慶園遊券每張 ${price} 元，買 ${count} 張共多少元？`,total,[price+count,total-price,price*10],'單價乘數量。',`${price}×${count}=${total}。`);if(k===1)return make(u,l,`${tag}閱讀活動原有 ${n*10} 本書，借出 ${p} 本又新增 ${p+3} 本，現有幾本？`,n*10+3,[n*10-p,n*10+p+3,n*10],'依事件順序加減。',`${n*10}−${p}+${p+3}=${n*10+3}。`);const a=80,b=12,c=18,books=n%10+5,pa=a+b*books,pb=c*books;return make(u,l,`${tag}方案甲基本費 ${a} 元、每本 ${b} 元；乙每本 ${c} 元。借 ${books} 本何者較省？`,pa<pb?'甲':pa>pb?'乙':'一樣',['甲省80元','乙省80元','無法比較'],'分別建立總費用再比較。',`甲 ${pa} 元，乙 ${pb} 元。`);
 };
})();
