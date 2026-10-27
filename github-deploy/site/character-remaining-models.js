import {continuousSkin} from './dino-continuous-skin.js';
// Each silhouette has its own construction. No external assets, accounts or unlock records.
export function makeCharacter(T,scene,entry){
 const [code,name,kind,color]=entry,root=new T.Group();scene.add(root);
 const material=(c,r=.65)=>new T.MeshStandardMaterial({color:c,roughness:r});
 const base=material(color),accent=material(new T.Color(color).multiplyScalar(.66)),light=material('#f3e2bf'),eyeMat=material('#273d3c',.25),leafMat=material('#6e9e67');
 const body=new T.Group();body.position.y=1;root.add(body);const sources=[],limbs=[],wings=[],tails=[],details=[];
 const sphere=new T.SphereGeometry(1,32,24);
 function group(p,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;}
 function ball(p,x,y,z,a,b,c,m=base,merge=m===base){const o=new T.Mesh(sphere,m);o.position.set(x,y,z);o.scale.set(a,b,c);o.castShadow=true;o.receiveShadow=true;p.add(o);if(merge)sources.push(o);return o;}
 function tube(p,points,r,m=base){const curve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),o=new T.Mesh(new T.TubeGeometry(curve,40,r,10,false),m);o.castShadow=true;p.add(o);return o;}
 function eye(p,x,y,z,r=.065){ball(p,x,y,z,r,r*1.1,r*.55,eyeMat);ball(p,x-r*.22,y+r*.3,z+r*.5,r*.23,r*.26,r*.14,light);}
 function face(p,x,y,z,r=.065){eye(p,-x,y,z,r);eye(p,x,y,z,r);tube(p,[[-.035,y-.12,z+.015],[0,y-.132,z+.025],[.035,y-.12,z+.015]],.009,eyeMat);}
 function cone(p,x,y,z,r,h,m=light,rx=0,rz=0){const o=new T.Mesh(new T.ConeGeometry(r,h,16),m);o.position.set(x,y,z);o.rotation.set(rx,0,rz);o.castShadow=true;p.add(o);return o;}
 function limb(x,y,z,len=.5,width=.15){const g=group(body,x,y,z);ball(g,0,-len*.3,0,width,len*.45,width);ball(g,0,-len*.8,.07,width*.8,len*.22,width*.95);ball(g,0,-len,.12,width*1.15,.11,width*1.5);limbs.push(g);return g;}
 function blade(p,x,y,z,a,b,c,m=accent,angle=0){const o=ball(p,x,y,z,a,b,c,m,false);o.rotation.z=angle;return o;}
 function tail(points,r=.17,m=base){const g=group(body),curve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),geo=new T.TubeGeometry(curve,40,r,10,false),a=geo.attributes.position;for(let j=0;j<=40;j++){const c=curve.getPointAt(j/40),scale=Math.max(.015,Math.pow(1-j/40,.75));for(let k=0;k<=10;k++){const i=j*11+k;a.setXYZ(i,c.x+(a.getX(i)-c.x)*scale,c.y+(a.getY(i)-c.y)*scale,c.z+(a.getZ(i)-c.z)*scale);}}geo.computeVertexNormals();const mesh=new T.Mesh(geo,m);mesh.castShadow=true;g.add(mesh);tails.push(g);return g;}
 function quad(y=-.2,z=.48){for(const s of [-1,1])for(const t of [-1,1])limb(s*.46,y,t*z,.55,.2);}
 let description='',motion='step';
 if(kind==='mantis'){
  ball(body,0,.15,0,.2,.7,.24);ball(body,0,.81,.07,.35,.22,.26);face(body,.23,.83,.28,.075);for(const s of [-1,1]){limb(s*.17,-.35,-.08,.65,.065);const arm=group(body,s*.25,.45,.03);tube(arm,[[0,0,0],[s*.2,-.1,.1],[s*.34,.14,.2]],.07);blade(arm,s*.34,-.05,.2,.09,.38,.055,accent,-s*.25);wings.push(arm);tube(body,[[s*.15,.95,.03],[s*.24,1.2,0],[s*.3,1.35,.1]],.018,accent);}description='修長螳螂輪廓、葉刃前臂；交叉前臂防守。';
 }else if(kind==='boar'||kind==='goat'){
  ball(body,0,0,0,.58,.47,.8);const h=group(body,0,.05,.67);ball(h,0,0,.07,.34,.3,.42);ball(h,0,-.03,.38,.25,.19,.18);face(h,.2,.1,.44,.045);quad();
  for(const s of [-1,1]){blade(h,s*.29,.27,.02,.11,.21,.07,base,s*.6);if(kind==='boar'){tube(h,[[s*.23,-.13,.43],[s*.37,-.02,.49],[s*.33,.15,.45]],.065,light);for(let i=0;i<7;i++)cone(body,0,.43,-.55+i*.17,.1,.26,accent,-.4);}else{const pts=[];for(let i=0;i<30;i++){const a=i/29*Math.PI*1.7;pts.push([s*(.23+Math.sin(a)*.22),.31+Math.cos(a)*.28,.02-i*.003]);}tube(h,pts,.075,accent);cone(h,0,-.3,.24,.12,.28,light,Math.PI);}}tail([[0,.06,-.69],[0,.23,-.94],[.12,.17,-1.04]],.055);description=kind==='boar'?'短腿、獠牙與背鬃；低頭蓄力。':'山羊肩背、雙螺旋角與鬍鬚；停步觀察。';
 }else if(kind==='crab'||kind==='scorpion'||kind==='beetle'){
  body.position.y=.65;ball(body,0,0,0,kind==='crab'?.67:.39,.28,kind==='scorpion'?.65:.45);face(body,.19,.12,.42,.05);
  for(const s of [-1,1]){for(let i=0;i<3;i++){const leg=group(body,s*.31,-.05,-.32+i*.3);tube(leg,[[0,0,0],[s*.38,.03,.15],[s*.52,-.49,.25]],.047);limbs.push(leg);}if(kind==='beetle'){tube(body,[[s*.17,.02,.4],[s*.32,.06,.78],[s*.13,.14,1.05]],.075,accent);cone(body,s*.25,.04,.78,.06,.2,accent,0,-s*1.1);}else{const claw=group(body,s*.45,.02,.32);tube(claw,[[0,0,0],[s*.21,.04,.2],[s*.25,.12,.44]],.1);ball(claw,s*.25,.12,.46,s<0?.23:.18,.19,.24);cone(claw,s*.17,.12,.65,.085,.29,accent,Math.PI/2);cone(claw,s*.36,.12,.62,.07,.24,accent,Math.PI/2);wings.push(claw);}}
  if(kind==='scorpion'){const g=tail([[0,.06,-.53],[0,.3,-.87],[0,.91,-.79],[0,1.2,-.35],[0,1.02,.02]],.105);cone(g,0,1.0,.09,.13,.29,accent,Math.PI/2);}
  if(kind==='beetle'){ball(body,0,.15,-.06,.35,.24,.4,accent);tube(body,[[0,.4,-.38],[0,.42,0],[0,.32,.28]],.012,light);}description='甲殼、細足與獨立前肢；各足交替移動，非整體平移。';
 }else if(kind==='falcon'||kind==='bird'||kind==='moth'){
  motion='fly';body.position.y=1.45;ball(body,0,0,0,.24,.43,.27);ball(body,0,.38,.1,.25,.25,.25);face(body,.135,.4,.3,.05);
  for(const s of [-1,1]){const wing=group(body,s*.17,.18,0);wings.push(wing);if(kind==='moth'){blade(wing,s*.42,.17,0,.51,.41,.055,accent,s*.4);blade(wing,s*.28,-.26,0,.34,.3,.05,base,-s*.4);ball(wing,s*.45,.2,.06,.13,.14,.025,light);tube(body,[[s*.08,.6,.12],[s*.15,.81,.08],[s*.25,.84,.14]],.015,accent);}else{for(let i=0;i<7;i++)blade(wing,s*(.18+i*.09),-.025-i*.035,-i*.065,.12,.38-i*.02,.045,i%2?base:accent,-s*(.55+i*.06));limb(s*.1,-.3,.08,.27,.04);cone(body,0,.35,.39,.09,.22,accent,Math.PI/2);}}
  if(kind!=='moth')for(let i=-1;i<=1;i++)blade(body,i*.12,-.36,-.3,.09,kind==='bird'?.66:.36,.045,accent,.15*i);description='展翼、收翼與翅膀擺動；飛行輪廓不使用四足骨架。';
 }else if(kind==='snake'||kind==='seahorse'){
  motion='float';body.position.y=.35;
  const pts=kind==='snake'?[[.65,0,.2],[.3,0,.55],[-.45,0,.45],[-.62,.1,-.16],[0,.3,-.4],[.2,.75,-.08],[.15,1.25,.15]]:[[.2,.18,.25],[-.18,.1,.17],[-.26,.32,.12],[.08,.45,0],[.2,.85,0],[0,1.3,.1],[0,1.65,.12]];
  for(let i=0;i<pts.length;i++)ball(body,...pts[i],.17,.28,.19);tube(body,pts,.18);const end=pts.at(-1),h=group(body,...end);ball(h,0,.05,.08,.23,.22,.29);face(h,.13,.11,.28,.05);if(kind==='seahorse'){ball(h,0,-.04,.37,.08,.08,.24);for(let i=0;i<4;i++)blade(body,.2,.7+i*.14,-.22,.05,.13,.19,accent,.3);}else{for(let i=0;i<5;i++)blade(body,.18,.55+i*.15,-.21,.07,.15,.2,accent,.2);}description='長身曲線與捲尾輪廓；緩慢游動和擺頭。';
 }else if(kind==='gecko'){
  body.position.y=.45;ball(body,0,0,0,.35,.17,.66);ball(body,0,.04,.62,.31,.19,.28);face(body,.23,.15,.76,.05);
  for(const s of [-1,1])for(const z of [-1,1]){const l=group(body,s*.27,0,z*.36);tube(l,[[0,0,0],[s*.22,-.08,.08],[s*.35,-.28,.16]],.065);for(let j=-2;j<=2;j++)tube(l,[[s*.35,-.28,.16],[s*(.44+Math.abs(j)*.015),-.3,.16+j*.09]],.023);limbs.push(l);}tail([[0,0,-.55],[.15,.04,-.9],[-.1,.09,-1.19],[.13,.12,-1.45]],.09);description='扁身、張開的腳趾與長尾；貼近地面移動。';
 }else if(kind==='tea'||kind==='lantern'||kind==='acorn'||kind==='mushroom'||kind==='pudding'){
  if(kind==='tea'){const pts=[[0,-.55],[.25,-.55],[.42,-.32],[.49,.35],[.44,.38],[.4,-.23],[.22,-.43],[0,-.43]].map(p=>new T.Vector2(...p));const cup=new T.Mesh(new T.LatheGeometry(pts,64),base);body.add(cup);tube(body,[[.44,.23,0],[.74,.21,0],[.75,-.18,0],[.42,-.25,0]],.07,accent);ball(body,0,.25,0,.405,.02,.405,accent);face(body,.18,0,.46);for(const s of [-1,1])limb(s*.2,-.5,0,.3,.08);tube(body,[[0,.32,0],[.1,.6,0],[-.06,.84,0],[.08,1.02,0]],.026,light);}
  if(kind==='lantern'){motion='float';ball(body,0,0,0,.48,.62,.48);face(body,.2,.06,.44);for(let i=0;i<8;i++){const a=i*Math.PI/4,pts=[];for(let j=0;j<16;j++){const t=j/15*Math.PI;pts.push([Math.cos(a)*Math.sin(t)*.49,Math.cos(t)*.62,Math.sin(a)*Math.sin(t)*.49]);}tube(body,pts,.013,accent);const tassel=group(body,Math.cos(a)*.2,-.57,Math.sin(a)*.2);tube(tassel,[[0,0,0],[.02,-.3,0],[.05,-.62,.02]],.018,accent);tails.push(tassel);}}
  if(kind==='acorn'){ball(body,0,-.04,0,.46,.61,.43);ball(body,0,.39,-.03,.57,.24,.53,accent);tube(body,[[0,.57,0],[.04,.77,0],[.13,.8,0]],.055,accent);face(body,.18,.1,.43,.05);for(const s of [-1,1])limb(s*.23,-.55,0,.25,.09);}
  if(kind==='mushroom'){ball(body,0,-.1,0,.22,.68,.23);const cap=new T.Mesh(new T.SphereGeometry(.69,48,24,0,Math.PI*2,0,Math.PI*.58),accent);cap.position.y=.46;cap.scale.y=.65;cap.rotation.z=.1;body.add(cap);face(body,.11,.04,.23,.04);for(let j=0;j<7;j++){const a=j*2.4;ball(body,Math.cos(a)*.4,.73+Math.sin(j)*.015,Math.sin(a)*.3,.075,.02,.06,light);}for(const s of [-1,1])limb(s*.12,-.65,0,.18,.065);}
  if(kind==='pudding'){body.position.y=.5;for(let i=0;i<3;i++){const g=group(body,0,i*.48,0),r=.53-i*.09;ball(g,0,0,0,r,.31,r,base,false);ball(g,0,.24,0,r*.83,.07,r*.83,accent,false);face(g,r*.38,.02,r*.94,.043);details.push(g);}motion='wobble';}description='器物或植物專屬輪廓；緩慢擺動、收勢與表情。';
 }else if(kind==='shell'){
  body.position.y=.65;ball(body,0,0,0,.62,.12,.46,accent);ball(body,0,.22,.12,.27,.27,.27,light);face(body,.1,.25,.365,.035);const lid=group(body,0,0,-.35);for(let i=-4;i<=4;i++){const a=i*.18;blade(lid,Math.sin(a)*.44,.5,.05,.13,.57,.07,base,-a);}wings.push(lid);description='扇形上殼可開合，珍珠臉藏在殼內。';
 }else if(kind==='star'){
  motion='wobble';ball(body,0,0,0,.37,.37,.18);for(let i=0;i<5;i++){const a=i/5*Math.PI*2;const g=group(body,Math.sin(a)*.18,Math.cos(a)*.18,0);const arm=ball(g,Math.sin(a)*.2,Math.cos(a)*.2,0,.17,.4,.16);arm.rotation.z=-a;wings.push(g);}face(body,.12,.04,.19,.04);description='五角柔軟腕足；張開與內收，不使用通用手腳。';
 }else if(kind==='snail'){
  body.position.y=.3;ball(body,0,0,.1,.34,.2,.8);ball(body,0,.26,.62,.26,.37,.26);face(body,.13,.41,.83,.04);ball(body,0,.48,-.2,.5,.58,.47,accent);const spiral=[];for(let i=0;i<80;i++){const a=i/79*Math.PI*4.7,r=.03+i/79*.42;spiral.push([.49, .49+Math.sin(a)*r,-.2+Math.cos(a)*r]);}tube(body,spiral,.028,light);for(const s of [-1,1])tube(body,[[s*.1,.5,.62],[s*.16,.8,.67],[s*.2,.87,.69]],.027);motion='crawl';description='貼地軟身、連續腹足、大螺旋殼與觸角。';
 }else if(kind==='whale'){
  motion='float';ball(body,0,0,0,.54,.47,.87);ball(body,0,.02,.56,.49,.4,.43);face(body,.31,.04,.84,.06);for(const s of [-1,1]){const f=group(body,s*.43,-.15,.12);blade(f,s*.15,0,-.03,.3,.06,.2,accent,s*.2);wings.push(f);}tail([[0,-.03,-.65],[0,0,-.98],[0,.09,-1.2]],.16);for(const s of [-1,1])blade(body,s*.22,.1,-1.2,.33,.05,.2,accent,s*.2);description='流線鯨身，胸鰭及尾鰭擺動推進。';
 }else if(kind==='toast'){
  const sh=new T.Shape();sh.moveTo(-.47,-.48);sh.lineTo(.47,-.48);sh.lineTo(.47,.28);sh.bezierCurveTo(.7,.68,.05,.8,0,.56);sh.bezierCurveTo(-.1,.83,-.68,.7,-.47,.28);sh.closePath();const geo=new T.ExtrudeGeometry(sh,{depth:.24,bevelEnabled:true,bevelSize:.075,bevelThickness:.075,bevelSegments:5,steps:1});body.add(new T.Mesh(geo,base));face(body,.19,.05,.34,.06);for(const s of [-1,1])limb(s*.25,-.46,.12,.36,.09);description='圓角吐司外皮與方形輪廓；左右小步搖擺。';
 }else if(kind==='sprout'){
  ball(body,0,0,0,.16,.82,.17);face(body,.075,.5,.15,.03);for(const s of [-1,1]){blade(body,s*.19,.89,0,.26,.06,.12,leafMat,s*.4);limb(s*.08,-.75,0,.2,.045);}motion='wobble';description='高瘦根莖與雙葉，彎腰後柔和回彈。';
 }else if(kind==='log'){
  const g=new T.CylinderGeometry(.43,.49,1.2,48,1,true),o=new T.Mesh(g,base);o.material.side=T.DoubleSide;body.add(o);const rim=new T.Mesh(new T.TorusGeometry(.43,.055,10,48),accent);rim.rotation.x=Math.PI/2;rim.position.y=.6;body.add(rim);face(body,.17,.05,.47,.045);for(const s of [-1,1]){const branch=group(body,s*.4,.05,0);tube(branch,[[0,0,0],[s*.22,.1,0],[s*.35,s<0?.42:.25,.06]],.065);wings.push(branch);limb(s*.24,-.58,0,.26,.1);}description='中空樹幹和長短不對稱枝手；木紋保留在表面。';
 }else if(kind==='dumpling'){
  body.position.y=.65;ball(body,0,0,0,.67,.43,.29);face(body,.22,-.03,.29,.045);for(let i=0;i<11;i++){const a=i/10*Math.PI;tube(body,[[Math.cos(a)*.6,Math.sin(a)*.4,.08],[Math.cos(a)*.56,Math.sin(a)*.44,0],[Math.cos(a)*.6,Math.sin(a)*.4,-.08]],.02,accent);}for(const s of [-1,1])limb(s*.32,-.33,0,.18,.08);motion='wobble';description='半月軟肚與細皺褶頂；壓縮後輕彈。';
 }else if(kind==='umbrella'){
  const canopy=new T.Mesh(new T.ConeGeometry(.76,.45,12,1,true),base);canopy.position.y=.35;canopy.rotation.z=Math.PI;body.add(canopy);face(body,.19,.4,.5,.045);tube(body,[[0,.1,0],[0,-.45,0],[.12,-.7,0],[.3,-.65,0]],.055,accent);for(let i=0;i<12;i++){const a=i/12*Math.PI*2;tube(body,[[0,.125,0],[Math.sin(a)*.76,.575,Math.cos(a)*.76]],.012,light);}motion='wobble';description='倒傘面、細骨線及單一彎柄腳。';
 }else if(kind==='potato'){
  const b=ball(body,0,-.12,0,.45,.64,.38);b.rotation.z=.18;face(body,.16,.13,.37,.045);tube(body,[[.1,.47,0],[.1,.69,0],[.23,.76,.03]],.026,leafMat);for(let i=0;i<8;i++)ball(body,Math.sin(i*2.4)*.35,-.4+(i%4)*.2,.3,.016,.025,.01,accent);for(const s of [-1,1])limb(s*.2,-.62,0,.2,.08);motion='wobble';description='不規則薯身、極小五官與單芽。';
 }else if(kind==='ptero'){
  motion='fly';body.position.y=1.6;ball(body,0,0,0,.23,.31,.49);ball(body,0,.22,.35,.16,.31,.19);const h=group(body,0,.43,.48);ball(h,0,0,0,.2,.18,.24);cone(h,0,-.035,.48,.14,.78,base,Math.PI/2);cone(h,0,.12,-.24,.12,.52,accent,-1.0);for(const s of [-1,1])eye(h,s*.16,.04,.12,.042);
  for(const s of [-1,1]){const w=group(body,s*.18,.09,.04);wings.push(w);const shoulder=ball(w,s*.12,.015,.04,.22,.16,.2);const upperWing=ball(w,s*.36,.04,.12,.33,.14,.15);tube(w,[[0,0,0],[s*.46,.08,.16],[s*.82,.03,.29],[s*1.85,0,-.17]],.06);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([0,0,0,s*.46,.08,.16,s*.82,.03,.29,s*1.85,0,-.17,s*1.25,-.04,-.38,s*.65,-.06,-.58,0,-.06,-.42],3));geo.setIndex([0,1,6,1,2,6,2,5,6,2,4,5,2,3,4]);geo.computeVertexNormals();const membrane=material('#bd895f');membrane.side=T.DoubleSide;const membraneMesh=new T.Mesh(geo,membrane);w.add(membraneMesh);for(let j=0;j<3;j++)tube(w,[[s*.78,.03,.27],[s*(.82+j*.09),.06,.43+j*.025]],.018,light);limb(s*.14,-.17,-.3,.27,.055);}
  description='翼手龍類飛行爬行動物：長喙、後冠、翼膜及翼端小爪；前肢延伸成翼，並非另外裝翅膀的恐龍。';
 }else{
  // Dinosaur branches share skin construction, not the same silhouette.
  const four=['triceratops','sauropod','stego','anky'].includes(kind);
  const shapeByKind={para:[.49,.63,.63],spino:[.42,.4,.94],raptor:[.31,.35,.72],theri:[.61,.65,.55]},dims=shapeByKind[kind]||[four?.62:.47,.47,four?.86:.65];
  ball(body,0,0,-.12,...dims);if(four)quad();else{const legWidth=kind==='raptor'?.15:.23;limb(-.35,-.22,-.18,.65,legWidth);limb(.35,-.22,-.18,.65,legWidth);}
  const long=kind==='sauropod',hz=kind==='spino'?1:kind==='raptor'?.85:long?.62:.66,hy=long?1.34:kind==='theri'?.94:kind==='para'?.75:kind==='raptor'?.22:.38;
  if(long){ball(body,0,.48,.55,.23,.65,.26);ball(body,0,1.0,.61,.19,.48,.22);}else if(kind==='theri'||kind==='para'){ball(body,0,.42,.46,.23,.58,.29);}else ball(body,0,.2,.5,.25,.36,.36);
  const h=group(body,0,hy,hz);ball(h,0,0,.12,long?.22:kind==='theri'?.22:kind==='raptor'?.23:.32,long?.19:.25,long?.28:.36);const snout=kind==='spino'?.62:kind==='raptor'?.36:.23;ball(h,0,-.055,.4,kind==='para'?.32:kind==='spino'?.14:.22,kind==='para'?.09:.14,snout);for(const s of [-1,1])eye(h,s*(kind==='theri'?.18:.24),.1,.29,.048);
  if(!four){for(const s of [-1,1]){
   // Separate deltoid, biceps/triceps, narrow elbow, and long forearm volumes.
   const a=group(body,s*(kind==='theri'?.58:.48),.4,.23);wings.push(a);
   ball(a,s*.07,-.06,.015,.29,.29,.28);
   const upper=ball(a,s*.23,-.31,.055,.235,.43,.24);upper.rotation.z=s*.26;
   ball(a,s*.25,-.3,.19,.22,.29,.22);
   ball(a,s*.26,-.32,-.105,.23,.32,.2);
   ball(a,s*.34,-.64,.12,.16,.17,.17);
   const fore=ball(a,s*.35,-.67,.4,.225,.205,.38);fore.rotation.x=-.12;
   ball(a,s*.35,-.715,.66,.145,.135,.2);
   ball(a,s*.35,-.74,.82,.235,.15,.225);
   // Short surface creases follow the muscle boundary, not rings around the arm.
   tube(a,[[s*.39,-.12,.17],[s*.475,-.26,.15],[s*.46,-.4,.13]],.012,accent);
   tube(a,[[s*.44,-.56,.19],[s*.53,-.57,.36],[s*.51,-.61,.52]],.011,accent);
   for(let j=-1;j<=1;j++)tube(a,[[s*.35+j*.10,-.74,.96],[s*.35+j*.115,-.79,kind==='theri'?1.3:1.14],[s*.35+j*.12,-.9,kind==='theri'?1.4:1.2]],kind==='theri'?.034:.03,light);
  }}
  const ta=tail([[0,0,-.7],[0,.03,-1.13],[.08,.17,-1.63]],kind==='anky'?.13:.12);if(kind==='anky')ball(ta,.08,.17,-1.64,.29,.21,.27,accent);
  if(kind==='triceratops'){blade(h,0,.2,-.14,.64,.54,.1,accent);for(const s of [-1,1])cone(h,s*.24,.32,.2,.085,.53,light,.8);cone(h,0,.15,.54,.06,.24,light,.6);}
  if(kind==='stego')for(let i=0;i<7;i++)for(const s of [-1,1])cone(body,s*.15,.57,-.63+i*.2,.15,.36+Math.sin(i/6*Math.PI)*.22,accent,0,s*.1);
  if(kind==='anky')for(let i=-2;i<=2;i++)for(let j=-1;j<=1;j++)blade(body,j*.31,.4,-.65+i*.27,.21,.1,.2,accent);
  if(kind==='para')tube(h,[[0,.18,.02],[0,.5,-.24],[0,.57,-.55]],.09,accent);
  if(kind==='spino'){const shape=new T.Shape();shape.moveTo(-.7,0);shape.lineTo(-.55,.6);shape.quadraticCurveTo(.05,1.12,.55,.45);shape.lineTo(.65,0);shape.closePath();const sail=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:3}),accent);sail.rotation.y=Math.PI/2;sail.position.y=.38;body.add(sail);}
  if(kind==='raptor'||kind==='theri')for(const s of [-1,1])for(let j=0;j<5;j++)blade(body,s*(.39+j*.035),.04,-.1-j*.085,.07,.25,.045,accent,s*.5);
  if(kind==='pachy')ball(h,0,.25,.08,.29,.25,.27,accent);
  description={triceratops:'寬頸盾、三角與四足護衛姿態。',sauropod:'長頸、小頭、四足與長尾；頭部緩慢觀察。',stego:'雙排背板、低矮頭部與側掃長尾。',anky:'低伏寬身、背甲與尾錘。',para:'向後長冠、寬吻與雙足輪廓。',spino:'高背帆、狹長吻與前爪。',raptor:'水平長尾、羽毛輪廓與敏捷雙足。',pachy:'厚圓頂頭骨、短前肢與穩定後腿。',theri:'長臂、長爪與羽毛肚；收臂防守。'}[kind];
 }
 let skin=null;if(sources.length){body.updateWorldMatrix(true,true);const box=new T.Box3(),inv=body.matrixWorld.clone().invert();for(const s of sources){s.geometry.computeBoundingBox();const b=s.geometry.boundingBox.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inv,s.matrixWorld));box.union(b);}box.expandByScalar(.2);skin=continuousSkin(T,body,sources,base,{lo:box.min.toArray(),hi:box.max.toArray(),step:.08});
 const g=skin.mesh.geometry;g.setAttribute('restSurface',g.attributes.position.clone());const m=base.clone();m.customProgramCacheKey=()=>`roster-${kind}`;m.onBeforeCompile=sh=>{sh.vertexShader='attribute vec3 restSurface; varying vec3 vRestSurface;\n'+sh.vertexShader;sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRestSurface=restSurface;');sh.fragmentShader='varying vec3 vRestSurface;\n'+sh.fragmentShader;sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\nfloat grain=sin(vRestSurface.x*143.0)*sin(vRestSurface.y*159.0+vRestSurface.z*107.0);diffuseColor.rgb*=.97+grain*.025;\n`+(code[0]==='D'?'float stripe=smoothstep(.6,.85,sin(vRestSurface.z*13.0+vRestSurface.y*3.0))*smoothstep(0.0,.4,vRestSurface.y);diffuseColor.rgb*=1.0-stripe*.25;':''));};skin.mesh.material=m;}
 const baseY=body.position.y;
 function animate(t,mode){root.position.set(0,0,0);root.rotation.y=0;body.position.y=baseY;body.rotation.set(0,0,0);body.scale.set(1,1,1);const moving=mode==='walk',attack=mode==='attack',guard=mode==='guard',pulse=Math.max(0,Math.sin((t%4)/4*Math.PI*2));
 body.position.y+=Math.sin(t*1.5)*.01;if(motion==='float'||motion==='fly')body.position.y+=Math.sin(t*1.7)*.07;
 limbs.forEach((l,i)=>{l.rotation.x=moving?Math.sin(t*4+i*Math.PI)*.22:0;});
 wings.forEach((w,i)=>{w.rotation.x=guard?-.55:attack?-pulse*.6:0;w.rotation.z=(motion==='fly'?Math.sin(t*4)*.22:Math.sin(t*1.6)*.035)*(i%2?1:-1);if(kind==='shell')w.rotation.x=guard?1.3:attack?-pulse*.25:.1;});
 tails.forEach((ta,i)=>ta.rotation.y=Math.sin(t*1.5+i)*.06);
 if(moving){root.position.z=Math.sin(t*.6)*.18;if(motion==='wobble')body.rotation.z=Math.sin(t*3)*.07;if(motion==='crawl')body.scale.z=1+Math.sin(t*2)*.018;}
 if(attack){body.rotation.x=-pulse*.1;body.position.y-=pulse*.035;if(motion==='fly'||motion==='float')root.position.z=pulse*.22;}
 if(guard){body.position.y-=.04;body.rotation.x=.07;}
 if(mode==='hurt'){body.rotation.z=Math.sin(t*11)*.035;root.position.z=-Math.max(0,Math.sin(t*3))*.07;}
 details.forEach((d,i)=>d.scale.y=1+Math.sin(t*2-i*.5)*(attack?.06:.015));if(skin)skin.update();}
 return {root,animate,description};
}
