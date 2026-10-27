// Local visual effects only. Never changes damage, timing, accounts or reports.
export function impactEnvelope(turn, phase) {
 if(!turn?.damage || phase<2 || phase>=2.85)return 0;
 const t=(phase-2)/.85;
 return Math.sin(Math.min(t/.12,1)*Math.PI/2)*(1-t)**2;
}
export function createImpactBackground(T,scene,camera,stage){
 const css=document.createElement('link');css.rel='stylesheet';css.href='./battle-impact-background.css';document.head.append(css);
 const controls=document.createElement('div');controls.className='controls';controls.innerHTML='<label>背景特效 <select id="impactStrength"><option value="0">關閉</option><option value="0.45">柔和</option><option value="1" selected>標準</option></select></label><label><input id="reduceImpactMotion" type="checkbox">減少震動與動態特效</label><span class="note">重擊：金色衝擊／受傷：暖紅色暈／防守：藍色護盾</span>';
 stage.closest('.arena').before(controls);
 const strength=controls.querySelector('select'),reduced=controls.querySelector('input');
 const preference=matchMedia('(prefers-reduced-motion: reduce)');reduced.checked=preference.matches;
 preference.addEventListener('change',e=>{reduced.checked=e.matches;});
 const overlay=document.createElement('div');overlay.className='battle-impact-backdrop';overlay.setAttribute('aria-hidden','true');
 overlay.innerHTML='<div class="impact-vignette"></div><div class="impact-rays"></div><div class="impact-burst"></div><div class="impact-word"></div>';
 stage.append(overlay);
 const rays=overlay.querySelector('.impact-rays'),burst=overlay.querySelector('.impact-burst'),word=overlay.querySelector('.impact-word');
 const ground=new T.Mesh(new T.RingGeometry(.72,.83,64),new T.MeshBasicMaterial({color:'#f0c78a',transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));ground.rotation.x=-Math.PI/2;ground.visible=false;scene.add(ground);
 const dust=Array.from({length:12},()=>{const m=new T.Mesh(new T.SphereGeometry(.1,8,6),new T.MeshBasicMaterial({color:'#c5af8a',transparent:true,opacity:0,depthWrite:false}));m.visible=false;scene.add(m);return m;});
 const base=new T.Color('#dce8da'),tint=new T.Color(),screen=new T.Vector3();
 function update(turn,phase,target){
  const amount=impactEnvelope(turn,phase)*Number(strength.value),quiet=reduced.checked;
  ground.visible=false;dust.forEach(d=>d.visible=false);stage.querySelector('canvas').style.transform='';scene.background.copy(base);scene.fog.color.copy(base);
  overlay.style.opacity=String(amount*(quiet?.28:1));overlay.dataset.impact=amount>0?(turn.guard?'guard':turn.damage>=90?'heavy':'hurt'):'none';
  if(!amount||!target)return;
  const guard=turn.guard,heavy=!guard&&turn.damage>=90,t=phase-2;
  screen.set(target.x,1.05,target.z).project(camera);
  overlay.style.setProperty('--hit-x',`${(screen.x*.5+.5)*100}%`);overlay.style.setProperty('--hit-y',`${(-screen.y*.5+.5)*100}%`);
  overlay.style.setProperty('--impact-rgb',guard?'104, 190, 216':heavy?'231, 164, 65':'200, 106, 87');
  word.textContent=guard?'格擋':heavy?'重擊！':'受擊';
  rays.style.display=quiet?'none':'';burst.style.transform=`translate(-50%,-50%) scale(${quiet?1:.45+t*2.3})`;
  tint.set(guard?'#bad6db':heavy?'#dec394':'#d8b4a5');scene.background.copy(base).lerp(tint,amount*.25);scene.fog.color.copy(scene.background);
  if(quiet)return;
  const power=guard?1.2:heavy?4:2;
  stage.querySelector('canvas').style.transform=`translate(${Math.sin(t*53)*amount*power}px,${Math.sin(t*39)*amount*power*.6}px)`;
  ground.visible=true;ground.position.set(target.x,-.055,target.z);ground.scale.setScalar(.4+t*3.5);ground.material.opacity=amount*.65;ground.material.color.set(guard?'#8fcada':'#e1bb80');
  if(!guard)dust.forEach((d,i)=>{const a=i*Math.PI*2/12;d.visible=true;d.position.set(target.x+Math.cos(a)*t*2,.05+Math.sin(Math.min(t/.85,1)*Math.PI)*(.15+i%3*.06),target.z+Math.sin(a)*t*2);d.scale.setScalar(.6+t*1.6);d.material.opacity=amount*.55;});
 }
 return {update};
}
