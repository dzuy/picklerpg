import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import type {Appearance} from './player-design';
import type {AthletePose} from './athlete-motion';
import {FUN_THEMES} from './fun-themes';

/** Dedicated Fun modules attached to the existing rig, independent of Style items. */
export function dressFunAthlete(model:THREE.Group,a:Appearance){
 const theme=FUN_THEMES.find(t=>t.id===a.funTheme);if(!theme)return;
 const bones=new Map<string,THREE.Bone>();model.traverse(o=>{if(o instanceof THREE.Bone)bones.set(o.name,o)});
 const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
 const point=(name:string)=>{model.updateMatrixWorld(true);return model.worldToLocal(bones.get(name)!.getWorldPosition(v(0,0,0)))};
 const material=new Map<string,THREE.MeshStandardMaterial>();
 function mesh(g:THREE.Object3D,geo:THREE.BufferGeometry,color:string,p:THREE.Vector3){let m=material.get(color);if(!m){m=new THREE.MeshStandardMaterial({color,roughness:a.funTheme==='disco'?.4:.85,metalness:a.funTheme==='disco'?.25:0});material.set(color,m)}const o=new THREE.Mesh(geo,m);o.position.copy(p);o.castShadow=true;o.userData.ownedGeometry=true;g.add(o);return o}
 function box(g:THREE.Object3D,p:THREE.Vector3,size:[number,number,number],color:string){return mesh(g,new RoundedBoxGeometry(...size,2,.015),color,p)}
 function ball(g:THREE.Object3D,p:THREE.Vector3,size:[number,number,number],color:string){const o=mesh(g,new THREE.SphereGeometry(1,16,10),color,p);o.scale.set(...size);return o}
 function group(name:string){const g=new THREE.Group();g.name='fun-'+name;model.add(g);return g}
 function attach(g:THREE.Group,bone:string){model.updateMatrixWorld(true);bones.get(bone)!.attach(g)}
 function link(g:THREE.Group,p:THREE.Vector3,q:THREE.Vector3,w:number,color:string){const o=box(g,p.clone().add(q).multiplyScalar(.5),[w,p.distanceTo(q)+.03,w],color);o.quaternion.setFromUnitVectors(v(0,1,0),q.clone().sub(p).normalize())}
 if(theme){
  const [dark,primary,accent]=theme.colors,variant=a.funVariant??0,cloth=theme.id==='horrified'?(variant?primary:dark):theme.id==='disco'&&variant?accent:primary,light='#fff3d9';
  const overrides=new Set(a.funOverrides??[]);
  model.traverse(o=>{const slot=o.userData.module_slot as string|undefined;const part=slot==='socks'?'shoes':slot;const option=o.name.startsWith('option-top')?'top':o.name.startsWith('option-bottom')?'bottom':o.name.startsWith('option-shoe')?'shoes':null;if((part&&['top','bottom','shoes'].includes(part)&&!overrides.has(part as 'top'))||(option&&!overrides.has(option))||o.name.startsWith('outfit-'))o.visible=false;});
  const body=group('jacket');box(body,v(0,.7,0),[.43,.32,.32],cloth);
  const hips=group('hips');box(hips,v(0,.48,0),[.4,.15,.3],cloth);attach(hips,'pelvis');
  for(const side of ['L','R']){
   const upper=group('sleeve-'+side);link(upper,point('upper_arm'+side),point('forearm'+side),.16,cloth);attach(upper,'upper_arm'+side);
   const lower=group('cuff-'+side);link(lower,point('forearm'+side),point('hand'+side),.145,cloth);attach(lower,'forearm'+side);
   const thigh=group('trouser-'+side);link(thigh,point('thigh'+side),point('shin'+side),.20,theme.id==='fairy'?dark:cloth);attach(thigh,'thigh'+side);
   const shin=group('leg-'+side);link(shin,point('shin'+side),point('foot'+side),theme.id==='disco'?.25:.18,theme.id==='fairy'?dark:cloth);
   if(theme.id==='horrified'&&!variant){const p=point('shin'+side),q=point('foot'+side);p.z+=.105;q.z+=.105;link(shin,p,q,.035,light)}attach(shin,'shin'+side);
   const foot=group('shoe-'+side);ball(foot,point('foot'+side).add(v(0,-.01,.08)),[.12,.075,.19],light);attach(foot,'foot'+side);
  }
  if(theme.id==='disco'){
   for(const s of [-1,1]){const lapel=box(body,v(s*.09,.79,.18),[.10,.19,.025],light);lapel.rotation.z=s*.35}
   for(let i=0;i<18;i++)ball(body,v((i%6-2.5)*.06,.6+Math.floor(i/6)*.06,.174),[.012,.012,.012],accent);
   box(body,v(0,.54,.02),[.45,.045,.33],dark);box(body,v(0,.54,.2),[.06,.05,.02],accent);
  }else if(theme.id==='eighties'){
   for(const s of [-1,1]){const stripe=box(body,v(s*.1,.71,.18),[.22,.06,.025],accent);stripe.rotation.z=s*.4}
   box(body,v(0,.7,.20),[.016,.30,.02],light);
   if(variant)for(const s of [-1,1])box(body,v(s*.16,.72,.18),[.10,.3,.06],light);
   const band=group('headband');box(band,v(0,1.38,.285),[.70,.055,.08],accent);attach(band,'head');
  }else if(theme.id==='horrified'){
   if(!variant){box(body,v(0,.69,.19),[.025,.26,.025],light);for(let i=0;i<3;i++)for(const s of [-1,1]){const rib=box(body,v(s*.085,.63+i*.065,.19),[.14,.025,.025],light);rib.rotation.z=s*.14}}
   else{box(body,v(-.1,.68,.19),[.12,.11,.02],accent);for(let i=0;i<3;i++)box(body,v(-.14+i*.04,.68,.21),[.012,.07,.012],dark)}
   const mask=group('mask');ball(mask,v(0,1.2,.29),[.32,.28,.065],variant?primary:light);
   for(const s of [-1,1])ball(mask,v(s*.12,1.25,.35),[.065,.075,.025],dark);
   box(mask,v(0,1.1,.354),[.19,.035,.02],dark);if(!variant)for(const x of [-.06,0,.06])box(mask,v(x,1.1,.367),[.014,.055,.012],light);attach(mask,'head');
  }else{
   const skirt=group('petals');for(let i=0;i<8;i++){const angle=i*Math.PI/4,p=ball(skirt,v(Math.sin(angle)*.2,.43,Math.cos(angle)*.2),[.12,.20,.075],i%2?accent:primary);p.rotation.z=-Math.sin(angle)*.25}attach(skirt,'pelvis');
   const crown=group('crown');box(crown,v(0,1.48,.05),[.68,.055,.52],light);for(const x of [-.25,0,.25])mesh(crown,new THREE.ConeGeometry(.085,.18,4),light,v(x,1.57,.3));ball(crown,v(0,1.55,.37),[.035,.04,.02],accent);attach(crown,'head');
   if(variant){const wings=group('wings');for(const s of [-1,1]){const wing=ball(wings,v(s*.33,.77,-.23),[.30,.38,.06],primary);wing.rotation.z=-s*.5;ball(wings,v(s*.29,.48,-.23),[.22,.2,.05],accent)}attach(wings,'chest');}
   ball(body,v(0,.72,.2),[.055,.065,.025],light);
  }
  attach(body,'chest');
  model.traverse(o=>{if(!o.name.startsWith('fun-'))return;const part=/^fun-(jacket|sleeve|cuff)/.test(o.name)?'top':/^fun-(hips|trouser|leg|petals)/.test(o.name)?'bottom':o.name.startsWith('fun-shoe')?'shoes':/^fun-(crown|headband)/.test(o.name)?'hat':null;if(part&&overrides.has(part))o.visible=false;});
 }
}
/** Small raised motifs on both faces of the existing paddle socket. */
export function dressFunPaddle(g:THREE.Group,center:THREE.Vector3,a:Appearance){
 const t=FUN_THEMES.find(t=>t.id===a.funPaddle);if(!t)return;
 g.traverse(o=>{if(o.name.startsWith('paddle-pattern-'))o.visible=false});
 for(const side of [-1,1]){
  const parent=new THREE.Group();parent.position.copy(center);parent.position.z+=side*.018;parent.rotation.y=side<0?Math.PI:0;g.add(parent);
  const mark=(geometry:THREE.BufferGeometry,color:string,x:number,y:number,z=0)=>{const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.5}));m.position.set(x,y,z);m.userData.ownedGeometry=true;parent.add(m);return m};
  mark(new THREE.CircleGeometry(.105,24),t.colors[1],0,0);
  if(t.id==='disco'){for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)mark(new THREE.PlaneGeometry(.038,.038),(x+y)%2?t.colors[2]:'#e7f4ef',x*.045,y*.045,.002)}
  if(t.id==='eighties'){mark(new THREE.CircleGeometry(.075,24),t.colors[2],0,0,.002);for(let y=-2;y<=1;y++)mark(new THREE.PlaneGeometry(.13,.008),t.colors[1],0,y*.025,.004)}
  if(t.id==='horrified'){mark(new THREE.CircleGeometry(.067,18),'#fff3d9',0,.01,.002);for(const x of [-.024,.024])mark(new THREE.CircleGeometry(.010,10),t.colors[0],x,.018,.004);mark(new THREE.TorusGeometry(.02,.004,6,12,Math.PI),t.colors[0],0,-.01,.004).rotation.z=Math.PI}
  if(t.id==='fairy'){for(const x of [-.035,.035]){const m=mark(new THREE.CircleGeometry(.042,18),t.colors[2],x,.005,.002);m.scale.y=1.4}mark(new THREE.PlaneGeometry(.012,.095),t.colors[0],0,0,.004)}
 }
}
export function funCelebration(pose:AthletePose,a:Appearance,time:number,reduced:boolean){
 if(!a.funTheme||a.funTheme==='none'||reduced)return;
 const wave=Math.sin(time*5);
 if(a.funTheme==='disco'){pose.armX=-2.4;pose.offArm=-.6;pose.torso=wave*.22;pose.armZ=wave*.15}
 if(a.funTheme==='eighties'){pose.armX=-1.1;pose.offArm=-1.1;pose.stride=wave*.22;pose.torso=wave*.16}
 if(a.funTheme==='horrified'){pose.armX=-1.5;pose.offArm=-1.5;pose.elbow=-.45;pose.offElbow=-.45;pose.lean=wave*.06}
 if(a.funTheme==='fairy'){pose.armZ=.9;pose.offArmZ=-.9;pose.torso=wave*.3;pose.crouch=(1+wave)*.025}
}
