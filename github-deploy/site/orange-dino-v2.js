// Local concept prototype; no account, gameplay or production data access.
import {continuousSkin} from './dino-continuous-skin.js';
import {addDinoMarkings} from './dino-skin-markings.js';
export function orangeDino(T,scene){
 const root=new T.Group();scene.add(root);
 const material=(c,r=.43)=>new T.MeshStandardMaterial({color:c,roughness:r});
 const orange=material('#d76b19',.57),cream=material('#cdad71'),spot=material('#823613'),ivory=material('#fff1cc'),black=material('#20120e',.22),amber=material('#e6a313',.25),mouth=material('#43191a'),tongue=material('#ad5253');
 const sphere=new T.SphereGeometry(1,48,32);
 function ball(p,m,x,y,z,a,b,c){const o=new T.Mesh(sphere,m);o.position.set(x,y,z);o.scale.set(a,b,c);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
 function group(p,x,y,z){const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;}
 const body=group(root,0,1.49,0);ball(body,orange,0,.1,-.1,.57,.55,.94);ball(body,cream,0,-.27,.02,.43,.23,.68);
 const neck=ball(body,orange,0,.26,.7,.34,.48,.52);neck.rotation.x=.5;
 const head=group(body,0,.6,1.02);head.scale.set(.78,.86,.87);
 // A continuous broad skull with a deep rear and narrower muzzle, not a round toy head.
 const sections=[[-.55,.12,.01,.01],[-.4,.14,.48,.4],[-.12,.18,.65,.46],[.2,.15,.65,.4],[.6,.09,.54,.33],[1.03,.06,.44,.28],[1.2,.04,.32,.23],[1.25,.04,.01,.01]],sv=[],si=[],sn=40;
 sections.forEach(([z,y,w,h])=>{for(let j=0;j<=sn;j++){const a=j/sn*Math.PI*2,c=Math.cos(a),s=Math.sin(a);sv.push(Math.sign(c)*Math.pow(Math.abs(c),.7)*w,y+Math.sign(s)*Math.pow(Math.abs(s),.8)*h,z);}});
 for(let i=0;i<sections.length-1;i++)for(let j=0;j<sn;j++){const a=i*(sn+1)+j,b=a+sn+1;si.push(a,a+1,b,a+1,b+1,b);}const skullGeo=new T.BufferGeometry();skullGeo.setAttribute('position',new T.Float32BufferAttribute(sv,3));skullGeo.setIndex(si);skullGeo.computeVertexNormals();const skull=new T.Mesh(skullGeo,orange);skull.castShadow=true;head.add(skull);
 // Heavy cheek and nasal ridges replace the rounded baby-face silhouette.
 for(const s of [-1,1]){const ridge=ball(head,orange,s*.25,.32,.68,.14,.12,.48);ridge.rotation.z=s*.14;}
 // Lower jaw rotates separately around the back of the mouth.
 ball(head,mouth,0,-.255,.57,.59,.12,.55);
 const jaw=group(head,0,-.23,.04);ball(jaw,orange,0,-.12,.58,.69,.18,.65);ball(jaw,tongue,0,.015,.64,.38,.04,.34);
 const eyelids=[];
 for(const s of [-1,1]){
  const eye=group(head,s*.61,.34,.15);eye.rotation.y=s*1.05;eye.scale.setScalar(.68);
  ball(eye,spot,0,0,.015,.215,.155,.13);ball(eye,amber,0,-.025,.108,.156,.105,.075);ball(eye,black,0,-.022,.172,.051,.078,.024);ball(eye,ivory,-.029,.012,.19,.017,.019,.008);
  const brow=ball(eye,orange,0,.103,.126,.255,.105,.12);brow.rotation.z=s*.34;
  const lid=ball(eye,orange,0,-.02,.13,.16,.11,.08);lid.visible=false;eyelids.push(lid);
  ball(head,spot,s*.38,.23,1.035,.075,.055,.035);ball(head,black,s*.38,.233,1.059,.039,.029,.014);
  for(let i=0;i<7;i++){const length=i===1||i===4?.25:.17;const tooth=new T.Mesh(new T.ConeGeometry(.06,length,16),ivory);tooth.position.set(s*(.59-i*.045),-.29,.32+i*.125);tooth.rotation.z=Math.PI;head.add(tooth);const lower=new T.Mesh(new T.ConeGeometry(.044,.12,14),ivory);lower.position.set(s*(.55-i*.04),.065,.32+i*.125);jaw.add(lower);}
  for(let i=0;i<6;i++)ball(head,spot,s*(.73-Math.floor(i/3)*.015),-.03+(i%3)*.105,.03+Math.floor(i/3)*.15,.018,.035+(i%2)*.014,.04);
 }
 const feet=[],arms=[],elbows=[];
 for(const s of [-1,1]){
  const hip=group(body,s*.46,-.29,-.26);ball(hip,orange,0,-.18,.09,.34,.46,.4);
  const shin=group(hip,0,-.57,.2);const sh=ball(shin,orange,0,-.23,-.08,.16,.34,.19);sh.rotation.x=.24;const foot=group(shin,0,-.47,-.03);ball(foot,orange,0,.025,.15,.22,.12,.38);
  for(let j=-1;j<=1;j++)ball(foot,ivory,j*.15,.025,.37,.073,.083,.11);feet.push({hip,shin,foot});
  const arm=group(body,s*.5,.06,.5);arm.rotation.z=s*.18;
  ball(arm,orange,s*.04,-.025,0,.28,.27,.27);
  const upper=ball(arm,orange,s*.13,-.28,.02,.23,.4,.235);upper.rotation.z=s*.14;
  ball(arm,orange,s*.15,-.27,.16,.22,.29,.22);
  ball(arm,orange,s*.17,-.29,-.12,.22,.31,.18);
  // Longer forearms retain the approved inward elbow pose and smaller wrist.
  ball(arm,orange,s*.21,-.59,.09,.155,.17,.16);
  const elbow=group(arm,s*.21,-.59,.09);elbow.rotation.set(-.42,-s*.62,0);elbows.push({joint:elbow,side:s});
  ball(elbow,orange,0,0,.25,.16,.15,.35);
  ball(elbow,orange,0,0,.55,.105,.10,.12);
  ball(elbow,orange,0,0,.70,.155,.11,.15);
  for(let j=0;j<2;j++){
   const x=(j-.5)*.15,curve=new T.CatmullRomCurve3([new T.Vector3(x,0,.80),new T.Vector3(x,.015,.91),new T.Vector3(x,-.025,1.02),new T.Vector3(x,-.105,1.08)]);
   const clawGeo=new T.TubeGeometry(curve,24,.06,12,false),pa=clawGeo.attributes.position;
   for(let k=0;k<=24;k++){const center=curve.getPointAt(k/24),taper=Math.pow(1-k/24,.85);for(let n=0;n<=12;n++){const idx=k*13+n;pa.setXYZ(idx,center.x+(pa.getX(idx)-center.x)*taper,center.y+(pa.getY(idx)-center.y)*taper,center.z+(pa.getZ(idx)-center.z)*taper);}}
   clawGeo.computeVertexNormals();const claw=new T.Mesh(clawGeo,ivory);claw.castShadow=true;elbow.add(claw);
  }
  const muscleLine=new T.CatmullRomCurve3([new T.Vector3(s*.31,-.1,.18),new T.Vector3(s*.36,-.25,.16),new T.Vector3(s*.34,-.4,.13)]);arm.add(new T.Mesh(new T.TubeGeometry(muscleLine,20,.012,6,false),spot));arms.push(arm);
  for(let j=0;j<6;j++)ball(body,spot,s*.587,.2+(j%3)*.16,-.16+Math.floor(j/3)*.16,.025,.053,.052);
 }
 const tailGroup=group(body,0,.01,-.69);tailGroup.scale.z=1.3;
 const curve=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(0,-.05,-.55),new T.Vector3(0,.03,-1.15),new T.Vector3(0,.36,-1.8)]);
 const vertices=[],inds=[],rings=48,segs=32;
 for(let i=0;i<=rings;i++){const t=i/rings,p=curve.getPoint(t),r=.33*Math.pow(1-t,.85)+.004;for(let j=0;j<=segs;j++){const a=j/segs*Math.PI*2;vertices.push(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r,p.z);}}
 for(let i=0;i<rings;i++)for(let j=0;j<segs;j++){const a=i*(segs+1)+j,b=a+segs+1;inds.push(a,b,a+1,a+1,b,b+1);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(inds);geo.computeVertexNormals();const tailMesh=new T.Mesh(geo,orange);tailMesh.castShadow=true;tailGroup.add(tailMesh);
 for(let i=0;i<7;i++){const p=curve.getPoint(i/8),r=.33*Math.pow(1-i/8,.85);ball(tailGroup,spot,0,p.y+r,p.z,.09*(1-i/10),.13*(1-i/10),.11);}
 // Small dorsal ridges, with no fantasy horns on the skull.
 for(let i=0;i<6;i++)ball(body,spot,0,.61-i*.035,-.55+i*.18,.055,.05,.1);
 const flame=group(head,0,-.25,1.08);const flameMat=new T.MeshBasicMaterial({color:'#ff8a05',transparent:true,opacity:.7,depthWrite:false});const core=new T.MeshBasicMaterial({color:'#ffec88',transparent:true,opacity:.88,depthWrite:false});const sparks=[];
 for(let i=0;i<18;i++){sparks.push(ball(flame,i%3?flameMat:core,0,0,0,.1,.1,.1));}flame.visible=false;
 // Replace overlapping body / limb balls with a single blended, deformable skin.
 const sources=[];
 function gather(p){if(p===head||p===tailGroup)return;for(const child of p.children){if(child.isMesh&&child.geometry===sphere&&child.material===orange)sources.push(child);else if(child.isGroup)gather(child);}}
 gather(body);tailMesh.visible=false;
 for(let i=0;i<=16;i++){const t=i/16,p=curve.getPoint(t),r=.33*Math.pow(1-t,.85)+.006;sources.push(ball(tailGroup,orange,p.x,p.y,p.z,r,r,Math.max(.07,r)));}
 for(const child of body.children)if(child.isMesh&&(child.material===cream||child.material===spot))child.visible=false;
 for(const child of tailGroup.children)if(child.material===spot)child.visible=false;
  const skin=continuousSkin(T,body,sources,orange,{lo:[-1.4,-1.55,-3.22],hi:[1.4,1.01,1.85]});
 addDinoMarkings(T,skin.mesh);
 function animate(t,mode){root.position.set(0,0,0);root.rotation.y=0;body.position.y=1.49;body.rotation.set(0,0,Math.sin(t*1.6)*.009);body.scale.y=1+Math.sin(t*2)*.012;head.rotation.set(.06,Math.sin(t*.55)*.05,0);jaw.rotation.x=.16+Math.sin(t*2)*.015;flame.visible=false;tailGroup.rotation.y=Math.sin(t*1.2)*.09;
 feet.forEach(({hip,shin,foot})=>{hip.rotation.x=0;shin.rotation.x=0;foot.rotation.x=0;});arms.forEach((a,i)=>{a.rotation.x=Math.sin(t*1.7+i)*.025;a.rotation.z=(i===0?-1:1)*.18;});
 elbows.forEach(({joint,side},i)=>joint.rotation.set(-.42+Math.sin(t*1.7+i)*.045,-side*(.62+Math.sin(t*1.3+i)*.055),0));eyelids.forEach(e=>e.visible=t%4.8>4.64);
 if(mode==='walk'){const g=t*5;root.position.z=Math.sin(t*.7)*.26;feet.forEach(({hip,shin,foot},i)=>{const k=Math.sin(g+i*Math.PI);hip.rotation.x=k*.32;shin.rotation.x=Math.max(0,-k)*.48;foot.rotation.x=-hip.rotation.x-shin.rotation.x;});body.position.y+=Math.cos(g*2)*.025;arms.forEach((a,i)=>a.rotation.x=Math.sin(g+i*Math.PI)*.16);}
 if(mode==='attack'){const a=t%4,breath=a>1&&a<2.6?Math.sin((a-1)/1.6*Math.PI):0;body.position.y-=a<1?Math.sin(a*Math.PI)*.1:0;jaw.rotation.x=breath*.75;head.rotation.x=-breath*.12;arms.forEach(a=>a.rotation.x=-breath*.6);flame.visible=breath>.1;sparks.forEach((p,i)=>{const q=((t*1.6+i/18)%1);p.position.set(Math.sin(i*2.4+t*8)*q*.23,Math.cos(i*3.1+t*6)*q*.19,q*1.7);p.scale.setScalar((.06+q*.19)*breath);});}
 if(mode==='guard'){body.position.y-=.12;head.rotation.x=.12;arms.forEach((a,i)=>{a.rotation.x=-.35;a.rotation.z=(i===0?-1:1)*.1;});}
 if(mode==='walk')elbows.forEach(({joint,side},i)=>{joint.rotation.x=-.42+Math.sin(t*5+i*Math.PI)*.09;joint.rotation.y=-side*(.62+Math.sin(t*5+i*Math.PI)*.07);});
 if(mode==='attack')elbows.forEach(({joint,side})=>{const curl=Math.max(0,Math.sin((t%4)*Math.PI/2));joint.rotation.x=-.42-curl*.25;joint.rotation.y=-side*(.62+curl*.18);});
 if(mode==='guard')elbows.forEach(({joint,side})=>joint.rotation.set(-.78,-side*.83,0));
 if(mode==='hurt'){root.position.z=-Math.max(0,Math.sin(t*3))*.16;head.rotation.z=Math.sin(t*10)*.05;}
 skin.update();
 }
 return {root,animate};
}
