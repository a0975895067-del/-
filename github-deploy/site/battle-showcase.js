import * as T from './vendor-three/three.module.min.js';
import {roster} from './character-roster-3d.js';
import {orangeDino} from './orange-dino-v2.js';
import {prototypes} from './character-organic-prototypes.js';
import {makeCharacter} from './character-remaining-models.js';
import {createImpactBackground} from './battle-impact-background.js';
const $=s=>document.querySelector(s),pairs=roster.map((r,i)=>[r[0],roster[(i+11)%roster.length][0]]);
$('#match').replaceChildren(...pairs.map(([a,b],i)=>{const o=document.createElement('option');o.value=i;o.textContent=`${i+1}/40　${a} ${roster[i][1]} × ${b} ${roster[(i+11)%40][1]}`;return o;}));
const tools=document.createElement('section');tools.className='card';tools.innerHTML='<button id="allBattles">全部 40 隻依序對戰</button> <button id="audit">檢查 40 隻動作與模型</button><p id="auditStatus">每隻都有獨立場次；動作檢查不代表美術效果已通過人工審查。</p><ol id="auditResults"></ol>';
$('.bottom').after(tools);
const turns=[{side:0,damage:95,text:'首次答對 · 蓄力出招',guard:false},{side:1,damage:85,text:'對手出招 · 我方防守',guard:true},{side:0,damage:78,text:'修正答對 · 再次進攻',guard:false},{side:1,damage:90,text:'對手近身反擊',guard:false},{side:0,damage:0,text:'再次答錯 · 本題無法攻擊',guard:false},{side:1,damage:82,text:'對手趁勢反擊 · 我方防守',guard:true},{side:0,damage:95,text:'首次答對 · 最後一擊',guard:false}];
let fighters=[],phase=0,round=0,active=false,paused=false,hit=false,defenses=3,loading=false,generation=0,ready=false;
const scene=new T.Scene();scene.background=new T.Color('#dce8da');scene.fog=new T.Fog('#dce8da',17,34);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.4));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;$('#stage').append(renderer.domElement);
const camera=new T.PerspectiveCamera(38,1,.1,60);camera.position.set(0,5,13.8);camera.lookAt(0,1,0);
const impactBackground=createImpactBackground(T,scene,camera,$('#stage'));
scene.add(new T.HemisphereLight('#fff6db','#769177',2.5));const sun=new T.DirectionalLight('#fff4d6',2.6);sun.position.set(-3,7,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-8;sun.shadow.camera.right=8;sun.shadow.normalBias=.04;scene.add(sun);
const floor=new T.Mesh(new T.CylinderGeometry(6.5,6.8,.16,80),new T.MeshStandardMaterial({color:'#b6c79c',roughness:.95}));floor.position.y=-.15;floor.receiveShadow=true;scene.add(floor);
const fx=new T.Group();scene.add(fx);const sparks=Array.from({length:22},(_,i)=>{const m=new T.Mesh(new T.SphereGeometry(1,10,8),new T.MeshBasicMaterial({color:'#ffd58a',transparent:true,opacity:.8}));fx.add(m);return m;});
const shield=new T.Mesh(new T.SphereGeometry(.9,24,16),new T.MeshBasicMaterial({color:'#80cddd',transparent:true,opacity:.25,wireframe:true}));scene.add(shield);shield.visible=false;
const ring=new T.Mesh(new T.TorusGeometry(.6,.055,8,48),new T.MeshBasicMaterial({color:'#ffe2a1',transparent:true,opacity:.9}));scene.add(ring);ring.visible=false;
const ease=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
for(const el of [$('#left'),$('#right')])for(const r of roster){const o=document.createElement('option');o.value=r[0];o.textContent=r[0]+' '+r[1];el.append(o);}
function dispose(group){const geos=new Set(),mats=new Set();group.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());scene.remove(group);}
function build(id,side){const entry=roster.find(r=>r[0]===id),anchor=new T.Group(),facing=new T.Group();anchor.add(facing);scene.add(anchor);facing.rotation.y=side? -Math.PI/2:Math.PI/2;facing.scale.setScalar(.78);let model;
if(['rock','jelly','moss'].includes(entry[2])){const p=prototypes(T,facing),k={rock:0,jelly:1,moss:2}[entry[2]];p.select(k);model={animate:(t,m)=>p.animate(t,m,k)};}else model=entry[2]==='rex'?orangeDino(T,facing):makeCharacter(T,facing,entry);
// Align each attack's wind-up and strike with the scripted impact, not the idle clock.
const animate=model.animate.bind(model);
model.animate=(t,mode)=>animate(mode==='attack'?phase-.25:t,mode);
anchor.position.x=side?3.15:-3.15;return {entry,anchor,model,hp:250};}
function hud(){for(let i=0;i<2;i++){const f=fighters[i],p=i?'right':'left';$('#'+p+'Name').textContent=f.entry[1];$('#'+p+'Hp').textContent='示範體力 '+f.hp+'／250';$('#'+p+'Bar').style.width=f.hp/250*100+'%';}$('#defenses').textContent='防守剩餘 '+defenses+'／3';}
async function load(){const token=++generation;loading=true;ready=false;active=false;$('#pause').disabled=true;$('#start').disabled=true;$('#loading').hidden=false;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));if(token!==generation)return;
try{fighters.forEach(f=>dispose(f.anchor));fighters=[];fighters.push(build($('#left').value,0));fighters.push(build($('#right').value,1));phase=0;round=0;defenses=3;paused=false;hit=false;$('#log').replaceChildren();$('#impact').hidden=true;$('#caption').textContent='雙方就位，按「開始對戰」觀看。';hud();ready=true;$('#loading').hidden=true;}catch(e){$('#loading').textContent='模型載入失敗，請重新整理。';console.error(e);}finally{loading=false;$('#start').disabled=!ready;}}
function log(text){const li=document.createElement('li');li.textContent=text;$('#log').append(li);$('#log').scrollTop=$('#log').scrollHeight;}
function preset(){const p=pairs[Number($('#match').value)];$('#left').value=p[0];$('#right').value=p[1];return load();}
function start(){if(!ready)return;fighters.forEach(f=>f.hp=250);defenses=3;phase=0;round=0;active=true;paused=false;hit=false;$('#log').replaceChildren();$('#pause').disabled=false;$('#pause').textContent='暫停';$('#impact').hidden=true;hud();}
$('#match').onchange=preset;$('#left').onchange=$('#right').onchange=load;$('#start').onclick=start;$('#pause').onclick=()=>{paused=!paused;$('#pause').textContent=paused?'繼續':'暫停';};$('#next').onclick=async()=>{$('#match').value=String((Number($('#match').value)+1)%pairs.length);await preset();start();};
let marathon=0;
const seriesStatus=document.createElement('p');seriesStatus.id='seriesStatus';seriesStatus.className='card';seriesStatus.textContent='完整觀看：第 1 組到第 40 組，共播放兩輪（80 場）。';$('.arena').before(seriesStatus);
const stopSeries=document.createElement('button');stopSeries.textContent='停止兩輪播放';stopSeries.hidden=true;seriesStatus.after(stopSeries);
const lockSeries=locked=>{for(const id of ['match','left','right','start','auto','audit'])$('#'+id).disabled=locked;$('#next').hidden=locked;stopSeries.hidden=!locked;};
const nextSingle=$('#next').onclick;
$('#next').onclick=async()=>{
 if(!marathon)return nextSingle();
 marathon++;
 if(marathon>80){marathon=0;$('#auto').checked=false;lockSeries(false);seriesStatus.textContent='兩輪播放完成：第 1～40 組已依序播放兩次，共 80 場。';return;}
 $('#match').value=String((marathon-1)%40);await preset();start();lockSeries(true);
 seriesStatus.textContent=`第 ${Math.ceil(marathon/40)}/2 輪 · 第 ${(marathon-1)%40+1}/40 組 · 已完成 ${marathon-1}/80 場。切換到其他分頁時會暫停。`;
};
$('#allBattles').textContent='從第 1 組開始，完整播放兩輪';
$('#allBattles').onclick=async()=>{marathon=1;$('#match').value='0';$('#auto').checked=true;await preset();start();lockSeries(true);seriesStatus.textContent='第 1/2 輪 · 第 1/40 組 · 已完成 0/80 場。切換到其他分頁時會暫停。';};
stopSeries.onclick=()=>{marathon=0;active=false;$('#auto').checked=false;lockSeries(false);$('#pause').disabled=true;seriesStatus.textContent='已停止播放，可重新開始兩輪。';};
$('#audit').onclick=async()=>{
 active=false;paused=true;loading=true;$('#auditResults').replaceChildren();
 const controls=[...document.querySelectorAll('button,select,input')];controls.forEach(e=>e.disabled=true);
 let passed=0;
 for(let i=0;i<roster.length;i++){
  fighters.forEach(f=>dispose(f.anchor));fighters=[];
  const row=document.createElement('li');$('#auditResults').append(row);
  try{
   fighters.push(build(roster[i][0],0));fighters.push(build(roster[(i+11)%40][0],1));hud();
   for(const mode of ['idle','walk','attack','guard','hurt']){
    for(const t of [0,.8,1.6,2.4]){
     phase=t+.25;fighters.forEach(f=>f.model.animate(t,mode));scene.updateMatrixWorld(true);
     fighters.forEach(f=>f.anchor.traverse(o=>{if(!o.matrixWorld.elements.every(Number.isFinite))throw Error('動作座標異常');if(o.geometry)for(const key of ['position','normal']){const a=o.geometry.attributes[key];if(a&&!a.array.every(Number.isFinite))throw Error('模型頂點異常');}}));
     renderer.render(scene,camera);
    }
    await new Promise(r=>requestAnimationFrame(r));
   }
   const hp=[250,250];let guards=3;
   for(const turn of turns){
    for(const p of [1.4,1.8,2.1,2.5]){effects(turn,p);renderer.render(scene,camera);}
    let damage=turn.damage;if(turn.guard&&damage&&guards>0){damage=Math.round(damage*.3);guards--;}
    hp[1-turn.side]=Math.max(0,hp[1-turn.side]-damage);
   }
   effects(null,0);
   if(hp[0]!==109||hp[1]!==0||guards!==1)throw Error('攻防結果異常');
   if(renderer.getContext().isContextLost())throw Error('3D 顯示中斷');
   passed++;row.textContent=`${roster[i][0]} ${roster[i][1]}：模型載入、五種動作、七回合攻防與特效檢查通過（動作美感待觀看）`;
  }catch(e){row.textContent=`${roster[i][0]} ${roster[i][1]}：檢查失敗（${e.message}）`;}
  $('#auditStatus').textContent=`已檢查 ${i+1}/40 隻，通過 ${passed} 隻。這是程式與 3D 繪製檢查，動作自然度仍請觀看確認。`;
 }
 controls.forEach(e=>e.disabled=false);loading=false;paused=false;await preset();
};
function effects(turn,p){impactBackground.update(turn,p,turn?fighters[1-turn.side]?.anchor.position:null);sparks.forEach(s=>s.visible=false);shield.visible=false;ring.visible=false;if(!turn||!turn.damage)return;const a=fighters[turn.side],d=fighters[1-turn.side],u=T.MathUtils.clamp((p-1.3)/.7,0,1),color=a.entry[0][0]==='B'?'#83ddeb':a.entry[0][0]==='C'?'#aad875':a.entry[2]==='ptero'?'#d9efff':a.entry[0][0]==='D'?'#ffb153':'#fff2c0';
if(turn.guard&&p>1.15&&p<2.7){shield.visible=true;shield.position.set(d.anchor.position.x,1,0);shield.rotation.y=p;}
if(p>1.3&&p<2.05)sparks.forEach((s,i)=>{s.visible=true;const t=T.MathUtils.clamp(u-i*.011,0,1),x=T.MathUtils.lerp(a.anchor.position.x,d.anchor.position.x,t);s.position.set(x,1.1+Math.sin(t*Math.PI*3+i)*.16,Math.cos(i*2.4)*.18);s.scale.setScalar((i%3===0?.12:.075)*(1+.4*Math.sin(t*Math.PI)));s.material.color.set(color);});
if(p>=2&&p<2.65){ring.visible=true;ring.position.set(d.anchor.position.x,1.1,.2);ring.scale.setScalar(.6+(p-2)*2);ring.material.opacity=1-(p-2)/.65;ring.material.color.set(turn.guard?'#88cfdd':color);}}
let last=performance.now(),idle=0;function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.06);last=now;if(document.hidden||loading)return;if(!paused){idle+=dt; if(active)phase+=dt*Number($('#speed').value);}const turn=active?turns[round]:null,p=phase;
fighters.forEach((f,i)=>{let mode='idle',x=i?3.15:-3.15;const sign=i?-1:1;if(turn){if(i===turn.side){mode=p<.7?'guard':p<1.3?'walk':p<2.2?'attack':p<3.1?'walk':'idle';if(!turn.damage)mode='idle';const melee=f.entry[0][0]==='A'||f.entry[2]==='theri';if(turn.damage&&melee)x+=sign*(ease((p-.7)/.6)-ease((p-2.3)/.7))*2.6;}else{mode=p>1.25&&p<2.7?(turn.guard?'guard':p>=2?'hurt':'idle'):'idle';if(!turn.guard&&turn.damage&&p>2&&p<2.8)x-=sign*Math.sin((p-2)/.8*Math.PI)*.32;}}f.model.animate(idle,mode);f.anchor.position.x=x;f.anchor.rotation.z=f.hp===0?(i?-1:1)*.25:0;});
effects(turn,p);if(turn){$('#caption').textContent=(round+1)+'／'+turns.length+'　'+turn.text;if(p>=2&&!hit){hit=true;const d=fighters[1-turn.side];let damage=turn.damage;if(turn.guard&&damage&&defenses>0){damage=Math.round(damage*.3);defenses--;}d.hp=Math.max(0,d.hp-damage);hud();log(fighters[turn.side].entry[1]+(damage?' 攻擊 → '+d.entry[1]+' 減少 '+damage+' 體力'+(turn.guard?'（防守減傷）':''):' 本題無攻擊機會'));$('#impact').textContent=damage?'−'+damage:'無攻擊';$('#impact').style.left=turn.side?'24%':'67%';$('#impact').hidden=false;}if(p>3.1)$('#impact').hidden=true;if(p>=4.8){phase=0;hit=false;round++;if(round>=turns.length||fighters.some(f=>f.hp===0)){active=false;$('#pause').disabled=true;const winner=fighters.find(f=>f.hp>0);$('#caption').textContent=fighters.some(f=>f.hp===0)?winner.entry[1]+' 完成本場挑戰！可重播或換下一組。':'展示結束，可重播或換下一組。';if($('#auto').checked)$('#next').click();}}}renderer.render(scene,camera);}
const resize=()=>{const h=$('#stage');renderer.setSize(h.clientWidth,h.clientHeight,false);camera.aspect=h.clientWidth/h.clientHeight;camera.position.z=camera.aspect<1.3?20:13.8;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe($('#stage'));resize();requestAnimationFrame(frame);await preset();
