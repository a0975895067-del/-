// Procedural pigmentation only: no changes to the approved silhouette or joints.
export function addDinoMarkings(T,mesh){
 const g=mesh.geometry;
 g.setAttribute('dinoRest',g.attributes.position.clone());
 g.setAttribute('dinoRestNormal',g.attributes.normal.clone());
 const mat=mesh.material.clone();mat.roughness=.67;
 mat.customProgramCacheKey=()=> 'dino-markings-20261026-1';
 mat.onBeforeCompile=s=>{
  s.vertexShader='attribute vec3 dinoRest; attribute vec3 dinoRestNormal; varying vec3 vDinoRest; varying vec3 vDinoN;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDinoRest=dinoRest; vDinoN=dinoRestNormal;');
  s.fragmentShader=`varying vec3 vDinoRest; varying vec3 vDinoN;
float dsHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float dsScales(vec2 p){
 p*=24.0; p.x+=mod(floor(p.y),2.0)*.5;
 vec2 cell=floor(p), q=fract(p)-.5;
 float r=length(q*vec2(1.0,1.25));
 float edge=smoothstep(.34,.47,r);
 return edge*(.7+.3*dsHash(cell));
}
float dsPattern(vec3 p,vec3 n){vec3 w=pow(abs(n),vec3(4.0));w/=max(w.x+w.y+w.z,.001);return dot(vec3(dsScales(p.yz),dsScales(p.xz),dsScales(p.xy)),w);}
`+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec3 dp=vDinoRest; vec3 dn=normalize(vDinoN);
float scales=dsPattern(dp,dn);
// Tapered bands travel from the spine down the flanks; not separate raised pieces.
float wave=sin(dp.z*13.0+dp.y*2.8+.55*sin(dp.z*7.0));
float band=smoothstep(.38,.65,wave)*smoothstep(-.2,.35,dp.y);
float side=smoothstep(.25,.55,abs(dn.x));
vec2 spotP=vec2(dp.z*9.0,dp.y*10.0);spotP.x+=mod(floor(spotP.y),2.0)*.5;
float fleck=(1.0-smoothstep(.12,.24,length(fract(spotP)-.5)))*step(.52,dsHash(floor(spotP)))*side;
float belly=(1.0-smoothstep(-.34,-.05,dp.y))*(1.0-smoothstep(.25,.47,abs(dp.x)))*smoothstep(-1.1,-.7,dp.z)*smoothstep(-.1,.65,-dn.y);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.26,.075,.018),band*.7);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.32,.105,.025),fleck*.55);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.63,.40,.17),belly*.8);
diffuseColor.rgb*=1.0-scales*.16;
// Subtle underside folds, shaded into the skin rather than hard rings.
float fold=pow(max(0.0,sin(dp.z*24.0+dp.x*.7)),16.0)*belly;
diffuseColor.rgb*=1.0-fold*.12;
`);
  // Very shallow relief in lighting; geometry stays unchanged.
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
float dh=dsPattern(vDinoRest,normalize(vDinoN))*.0015;
vec3 dx=dFdx(-vViewPosition),dy=dFdy(-vViewPosition);
vec3 rx=cross(dy,normal),ry=cross(normal,dx);
float det=dot(dx,rx);
if(abs(det)>.0000001)normal=normalize(abs(det)*normal-sign(det)*(dFdx(dh)*rx+dFdy(dh)*ry));
`);
 };
 mesh.material=mat;
 return mat;
}
