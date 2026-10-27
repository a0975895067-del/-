// Smooth implicit union, triangulated once, then blended across the existing joints.
export function continuousSkin(T,body,sources,material,options={}){
 body.updateWorldMatrix(true,true);
 const invBody=body.matrixWorld.clone().invert(),v=new T.Vector3();
 const bones=[],boneIds=new Map();
 const fields=sources.map(o=>{
  const bone=o.parent;if(!boneIds.has(bone)){boneIds.set(bone,bones.length);bones.push({bone,bind:new T.Matrix4().multiplyMatrices(invBody,bone.matrixWorld).invert(),matrix:new T.Matrix4()});}
  const m=new T.Matrix4().multiplyMatrices(invBody,o.matrixWorld),inverse=m.clone().invert(),sc=new T.Vector3();m.decompose(new T.Vector3(),new T.Quaternion(),sc);
  o.visible=false;return {inverse,e:inverse.elements,min:Math.min(sc.x,sc.y,sc.z),id:boneIds.get(bone)};
 });
 function dist(f,x,y,z){const e=f.e;return (Math.hypot(e[0]*x+e[4]*y+e[8]*z+e[12],e[1]*x+e[5]*y+e[9]*z+e[13],e[2]*x+e[6]*y+e[10]*z+e[14])-1)*f.min;}
 function sdf(x,y,z){let d=100;for(const f of fields){const b=dist(f,x,y,z),k=.135,h=Math.max(k-Math.abs(d-b),0)/k;d=Math.min(d,b)-h*h*k*.25;}return d;}
 const lo=options.lo||[-1,-1.55,-3.22],hi=options.hi||[1,1.01,1.35],step=options.step||.065;
 const n=lo.map((x,i)=>Math.ceil((hi[i]-x)/step)+1),idx=(x,y,z)=>(z*n[1]+y)*n[0]+x,values=new Float32Array(n[0]*n[1]*n[2]);
 for(let z=0;z<n[2];z++)for(let y=0;y<n[1];y++)for(let x=0;x<n[0];x++)values[idx(x,y,z)]=sdf(lo[0]+x*step,lo[1]+y*step,lo[2]+z*step);
 const offsets=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
 const positions=[],normals=[],weights=[],ids=[];
 function normal(p){const e=.002;return new T.Vector3(sdf(p[0]+e,p[1],p[2])-sdf(p[0]-e,p[1],p[2]),sdf(p[0],p[1]+e,p[2])-sdf(p[0],p[1]-e,p[2]),sdf(p[0],p[1],p[2]+e)-sdf(p[0],p[1],p[2]-e)).normalize();}
 function tri(a,b,c){const na=normal(a),nb=normal(b),nc=normal(c),ab=new T.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]),ac=new T.Vector3(c[0]-a[0],c[1]-a[1],c[2]-a[2]);if(ab.cross(ac).dot(na)<0){[b,c]=[c,b];[nb.x,nc.x]=[nc.x,nb.x];[nb.y,nc.y]=[nc.y,nb.y];[nb.z,nc.z]=[nc.z,nb.z];}
  [a,b,c].forEach((p,i)=>{positions.push(...p);const nn=[na,nb,nc][i];normals.push(nn.x,nn.y,nn.z);const ws=new Map();for(const f of fields){const w=Math.exp(-Math.abs(dist(f,...p))*28);ws.set(f.id,(ws.get(f.id)||0)+w);}const best=[...ws].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=best.reduce((s,x)=>s+x[1],0);for(let j=0;j<4;j++){ids.push(best[j]?.[0]||0);weights.push((best[j]?.[1]||0)/sum);}});
 }
 for(let z=0;z<n[2]-1;z++)for(let y=0;y<n[1]-1;y++)for(let x=0;x<n[0]-1;x++){
  const ds=offsets.map(o=>values[idx(x+o[0],y+o[1],z+o[2])]);if(ds.every(d=>d>=0)||ds.every(d=>d<0))continue;
  const ps=offsets.map(o=>[lo[0]+(x+o[0])*step,lo[1]+(y+o[1])*step,lo[2]+(z+o[2])*step]);
  const edge=(a,b)=>{const t=ds[a]/(ds[a]-ds[b]);return ps[a].map((p,i)=>p+(ps[b][i]-p)*t);};
  for(const tet of tets){const a=tet.filter(i=>ds[i]<0),b=tet.filter(i=>ds[i]>=0);if(a.length===1)tri(...b.map(i=>edge(a[0],i)));else if(a.length===3)tri(...a.map(i=>edge(b[0],i)));else if(a.length===2){const p=edge(a[0],b[0]),q=edge(a[0],b[1]),r=edge(a[1],b[0]),s=edge(a[1],b[1]);tri(p,q,r);tri(q,s,r);}}
 }
 const rest=new Float32Array(positions),norm=new Float32Array(normals),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(rest.slice(),3));g.setAttribute('normal',new T.Float32BufferAttribute(norm.slice(),3));
 const mesh=new T.Mesh(g,material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;body.add(mesh);
 const points=g.attributes.position.array,ns=g.attributes.normal.array,inv=new T.Matrix4();
 function update(){body.updateWorldMatrix(true,true);inv.copy(body.matrixWorld).invert();for(const b of bones)b.matrix.multiplyMatrices(inv,b.bone.matrixWorld).multiply(b.bind);
  for(let i=0;i<rest.length/3;i++){let x=0,y=0,z=0,nx=0,ny=0,nz=0;const k=i*3;for(let j=0;j<4;j++){const w=weights[i*4+j];if(!w)continue;const e=bones[ids[i*4+j]].matrix.elements,px=rest[k],py=rest[k+1],pz=rest[k+2];x+=w*(e[0]*px+e[4]*py+e[8]*pz+e[12]);y+=w*(e[1]*px+e[5]*py+e[9]*pz+e[13]);z+=w*(e[2]*px+e[6]*py+e[10]*pz+e[14]);nx+=w*(e[0]*norm[k]+e[4]*norm[k+1]+e[8]*norm[k+2]);ny+=w*(e[1]*norm[k]+e[5]*norm[k+1]+e[9]*norm[k+2]);nz+=w*(e[2]*norm[k]+e[6]*norm[k+1]+e[10]*norm[k+2]);}points[k]=x;points[k+1]=y;points[k+2]=z;const l=Math.hypot(nx,ny,nz)||1;ns[k]=nx/l;ns[k+1]=ny/l;ns[k+2]=nz/l;}g.attributes.position.needsUpdate=true;g.attributes.normal.needsUpdate=true;
 }
 return {update,mesh};
}
