import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import type {Appearance} from './player-design';

/** Runtime modules use the approved Blender rig's rest coordinates (Y up, face +Z).
 * Each rigid part attaches to its existing bone; no second skeleton is animated. */
export function dressAthlete(model:THREE.Group,a:Appearance){
 const bones=new Map<string,THREE.Bone>();model.traverse(o=>{if(o instanceof THREE.Bone)bones.set(o.name,o)});
 const mats=new Map<string,THREE.MeshStandardMaterial>();
 const material=(color:string)=>{let m=mats.get(color);if(!m){m=new THREE.MeshStandardMaterial({color,roughness:.83});mats.set(color,m)}return m};
 const white='#fff7ef',ink='#25272d',hair=a.hair,cloth=a.jersey;
 const H=(x:number,z:number,y=0)=>new THREE.Vector3(x,z-.5064,-y);
 const bodyY=(z:number)=>z<=.23?z*.78:z<=.98?.1794+(z-.23)*.5:.5544+(z-.98)*.72;
 const B=(x:number,z:number,y=0)=>new THREE.Vector3(x,bodyY(z),-y);
 const slot=(name:string)=>{const group=new THREE.Group();group.name=`option-${name}`;group.userData.option=name;model.add(group);return group};
 const hide=(name:string)=>model.traverse(o=>{if(o.userData.module_slot===name)o.visible=false});
 function mesh(parent:THREE.Object3D,g:THREE.BufferGeometry,color:string,p:THREE.Vector3){const m=new THREE.Mesh(g,material(color));m.position.copy(p);m.castShadow=true;m.receiveShadow=true;m.userData.ownedGeometry=true;parent.add(m);return m}
 function box(parent:THREE.Object3D,p:THREE.Vector3,size:[number,number,number],color:string,r=.015){return mesh(parent,new RoundedBoxGeometry(...size,2,r),color,p)}
 function attach(group:THREE.Object3D,bone:string){model.updateMatrixWorld(true);bones.get(bone.replace('.', ''))!.attach(group)}
 function point(bone:string){model.updateMatrixWorld(true);return model.worldToLocal(bones.get(bone.replace('.', ''))!.getWorldPosition(new THREE.Vector3()))}
 function link(parent:THREE.Object3D,p:THREE.Vector3,q:THREE.Vector3,width:number,depth:number,color:string,radius=.022){const m=box(parent,p.clone().add(q).multiplyScalar(.5),[width,p.distanceTo(q),depth],color,radius);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),q.clone().sub(p).normalize());return m}
 function line(parent:THREE.Object3D,pts:THREE.Vector3[],color:string,r=.009){for(let i=1;i<pts.length;i++){const p=pts[i-1],q=pts[i],m=mesh(parent,new THREE.CylinderGeometry(r,r,p.distanceTo(q),8),color,p.clone().add(q).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),q.clone().sub(p).normalize())}}
 function plate(parent:THREE.Object3D,outline:[number,number][],front:number,depth:number,color:string,head=true){const s=new THREE.Shape();outline.forEach(([x,z],i)=>{const y=head?z-.5064:bodyY(z);i?s.lineTo(x,y):s.moveTo(x,y)});s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false});return mesh(parent,g,color,new THREE.Vector3(0,0,front))}
 function mark(group:THREE.Group,p:THREE.Vector3,size=.026,color=white){line(group,[p.clone().add(new THREE.Vector3(-size,-size*.65,0)),p.clone().add(new THREE.Vector3(0,size,0)),p.clone().add(new THREE.Vector3(size,-size*.65,0)),p.clone().add(new THREE.Vector3(-size,-size*.65,0))],color,.004)}

 // One base body is shared by boy and girl styling. Face choices affect only skin,
 // preserving the approved hair envelope and eye placement.
 if(a.face!=='oval')model.traverse(o=>{if(!(o instanceof THREE.SkinnedMesh)||!(o.name.startsWith('head_base')||o.parent?.name==='head_base'))return;const materials=Array.isArray(o.material)?o.material:[o.material];if(!materials.some(m=>m.name==='MAT_skin'))return;const g=o.geometry.clone(),p=g.attributes.position;g.computeBoundingBox();const center=g.boundingBox!.getCenter(new THREE.Vector3());for(let i=0;i<p.count;i++){const x=p.getX(i)-center.x;p.setX(i,center.x+x*(a.face==='round'?1.035:.97))}g.computeVertexNormals();o.geometry=g;o.userData.ownedGeometry=true});

 // Replace only the facial marks, retaining the original head, ears and blush.
 hide('eyebrows');
 model.traverse(o=>{if(!(o instanceof THREE.Mesh)||!(o.name.startsWith('head_base')||o.parent?.name==='head_base'))return;
  const materials=Array.isArray(o.material)?o.material:[o.material];
  if(materials.every(m=>['MAT_grip','MAT_mouth','MAT_tongue'].includes(m.name)))o.visible=false;
 });
 const expression=slot(`expression-${a.expression}`),mouth='#713c2c';
 const curve=(x:number,y:number,w:number,h:number,color:string,r=.010)=>line(expression,Array.from({length:17},(_,i)=>{const t=i/16;return H(x+(t-.5)*w,y+h*4*t*(1-t),-.269)}),color,r);
 for(const sign of [-1,1]){
  const x=sign*.137,wink=a.expression==='confident'&&sign===1;
  if(a.expression==='happy'||wink)curve(x,1.587,.083,.037,ink,.012);
  else if(a.expression==='crying'){
   curve(x,1.606,.079,-.022,ink,.011);
   box(expression,H(x,1.537,-.262),[.032,.10,.013],'#71c9ee',.013);
   mesh(expression,new THREE.SphereGeometry(.021,12,8),'#71c9ee',H(x,1.482,-.271));
  }else box(expression,H(x,1.601,-.260),[.061,.112,.015],ink,.024);
  const browY=a.expression==='confident'&&sign===1?1.702:1.692;
  const brow=box(expression,H(x,browY,-.265),[.081,.025,.015],hair,.010);
  brow.rotation.z=a.expression==='determined'||a.expression==='angry'?sign*.38:a.expression==='crying'?-sign*.34:a.expression==='confident'&&sign===1?-.20:0;
 }
 if(a.expression==='happy'){
  plate(expression,[[-.057,1.520],[.057,1.520],[.052,1.476],[.027,1.454],[-.027,1.454],[-.052,1.476]],.260,.010,mouth);
  box(expression,H(0,1.468,-.273),[.060,.019,.008],'#f4534c',.008);
 }else if(a.expression==='serious')curve(0,1.487,.080,0,mouth,.008);
 else if(a.expression==='crying'||a.expression==='angry')curve(0,1.477,.088,.027,mouth,.010);
 else if(a.expression==='confident')line(expression,[H(-.042,1.493,-.269),H(-.017,1.482,-.269),H(.011,1.485,-.269),H(.047,1.510,-.269)],mouth,.009);
 else curve(0,1.505,.087,-.025,mouth,.009);
 attach(expression,'head');

 if(a.paddleShape!=='rectangular'){
  const bounds=new THREE.Box3();model.updateMatrixWorld(true);
  model.traverse(o=>{if(!(o instanceof THREE.Mesh)||!o.name.startsWith('paddle_01'))return;
   const materials=Array.isArray(o.material)?o.material:[o.material];
   if(!materials.every(m=>['MAT_paddle_color','MAT_paddle_face'].includes(m.name)))return;
   const matrix=model.matrixWorld.clone().invert().multiply(o.matrixWorld),p=o.geometry.attributes.position;
   for(let i=0;i<p.count;i++)bounds.expandByPoint(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(matrix));
   o.visible=false;
  });
  if(!bounds.isEmpty()){
   const g=slot(`paddle-${a.paddleShape}`),center=bounds.getCenter(new THREE.Vector3());
   const w=a.paddleShape==='squarish'?.30:.28,h=a.paddleShape==='squarish'?.28:.30,r=a.paddleShape==='squarish'?.025:.075;
   center.y=bounds.max.y-h/2;
   function face(inset:number,depth:number,color:string){
    const shape=new THREE.Shape(),halfW=w/2-inset,halfH=h/2-inset;
    if(a.paddleShape==='circular')shape.absellipse(0,0,halfH,halfH,0,Math.PI*2,false,0);
    else{
     const corner=Math.max(.01,r-inset);
     shape.moveTo(-halfW+corner,-halfH);shape.lineTo(halfW-corner,-halfH);shape.quadraticCurveTo(halfW,-halfH,halfW,-halfH+corner);
     shape.lineTo(halfW,halfH-corner);shape.quadraticCurveTo(halfW,halfH,halfW-corner,halfH);
     shape.lineTo(-halfW+corner,halfH);shape.quadraticCurveTo(-halfW,halfH,-halfW,halfH-corner);
     shape.lineTo(-halfW,-halfH+corner);shape.quadraticCurveTo(-halfW,-halfH,-halfW+corner,-halfH);
    }
    return mesh(g,new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:16}),color,center.clone().add(new THREE.Vector3(0,0,-depth/2)));
   }
   face(0,.027,a.paddle);face(.013,.030,'#303d3e');attach(g,'paddle_socket');
  }
 }

 // Hairstyles are complete shells, with shared fringe pieces sized for hats.
 if(a.hairStyle!=='ponytail'){
  hide('hair');
  if(a.hairStyle!=='none'){
   const g=slot(`hair-${a.hairStyle}`),style=a.hairStyle;
   if(style==='mohawk'){
    // A narrow front-to-back crest leaves the sides of the head exposed.
    box(g,H(0,1.915,.01),[.14,.065,.51],hair,.018);
    for(let i=0;i<5;i++){
     const crest=mesh(g,new THREE.ConeGeometry(.092,.20+(2-Math.abs(i-2))*.045,4),hair,H(0,2.035+(2-Math.abs(i-2))*.022,.22-i*.105));
     crest.scale.x=.76;
    }
   }else{
   box(g,H(0,1.865,.01),[.68,.18,.53],hair,.035);
   const long=style==='long'||style==='bob';
   box(g,H(0,long?1.59:1.73,.215),[.65,long?.54:.29,.11],hair,.022);
   for(const sign of [-1,1])box(g,H(sign*.30,long?1.57:1.72,.035),[.073,long?.49:.21,.43],hair,.018);
   if(style==='curls'){
    for(let row=0;row<2;row++)for(let col=0;col<5;col++){const m=box(g,H((col-2)*.133,1.79+row*.108,-.255+row*.035),[.16,.15,.15],hair,.04);m.rotation.z=(col%2?1:-1)*.13}
    for(const sign of [-1,1])for(let i=0;i<3;i++)box(g,H(sign*.29,1.74,.07+i*.11),[.15,.15,.14],hair,.04);
   }else if(style==='spiky'){
    for(let i=0;i<5;i++)plate(g,[[i*.12-.31,1.77],[i*.12-.19,1.77],[i*.12-.20,1.98+(i%2)*.055],[i*.12-.29,1.91]],.20,.12,hair);
   }else if(style==='bob'){
    plate(g,[[-.335,1.91],[.335,1.91],[.335,1.70],[.10,1.70],[.055,1.81],[.01,1.70],[-.335,1.70]],.255,.064,hair);
   }else if(style==='side-part'){
    plate(g,[[-.335,1.91],[.335,1.91],[.335,1.72],[.20,1.73],[.105,1.82],[-.09,1.67],[-.335,1.70]],.255,.069,hair);
    box(g,H(-.12,1.95,-.07),[.30,.12,.35],hair,.028).rotation.z=-.12;
   }else{
    plate(g,[[-.335,1.91],[.335,1.91],[.335,1.72],[.15,1.72],[.06,1.80],[-.06,1.70],[-.335,1.72]],.255,.064,hair);
   }
   if(style==='bun'){
    box(g,H(0,1.975,.12),[.20,.055,.20],a.accent,.012);
    box(g,H(0,2.075,.14),[.25,.19,.24],hair,.04);
   }
   if(style==='long')for(const sign of [-1,1])box(g,H(sign*.285,1.46,.04),[.13,.39,.40],hair,.025);
   }
   attach(g,'head');
  }
 }
 // Tuck the upper hair into closed headwear, including the authored ponytail.
 // Work in rest/model space and clone shared GLB geometry before changing it.
 if(['cap','backwards','beanie','bucket'].includes(a.hat)){
  const hairGroup=model.getObjectByName(`option-hair-${a.hairStyle}`)??(a.hairStyle==='ponytail'?model.getObjectByName('hair_ponytail_01'):undefined);
  model.updateMatrixWorld(true);
  hairGroup?.traverse(o=>{if(!(o instanceof THREE.Mesh))return;
   if(!o.userData.ownedGeometry){o.geometry=o.geometry.clone();o.userData.ownedGeometry=true}
   const toModel=new THREE.Matrix4().copy(model.matrixWorld).invert().multiply(o.matrixWorld),toLocal=toModel.clone().invert();
   const p=o.geometry.attributes.position;
   for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(toModel);
    if(v.y>1.28){v.y=Math.min(v.y,1.38);v.x=THREE.MathUtils.clamp(v.x,-.30,.30);v.z=THREE.MathUtils.clamp(v.z,-.265,.265);v.applyMatrix4(toLocal);p.setXYZ(i,v.x,v.y,v.z)}
   }p.needsUpdate=true;o.geometry.computeVertexNormals();o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere();
  });
  if(a.hairStyle!=='none'){
   // Keep an uncompressed hairline below the crown. Tucking tall hair must
   // not pull the temple/back coverage inside the square head's surface.
   const lining=slot('hair-under-hat');
   for(const sign of [-1,1])box(lining,new THREE.Vector3(sign*.322,1.205,-.015),[.057,.163,.435],hair,.008);
   box(lining,new THREE.Vector3(0,1.205,-.255),[.66,.163,.054],hair,.008);
   attach(lining,'head');
  }
 }
 if(a.hat!=='none'){
  const g=slot(`hat-${a.hat}`),color=a.hatColor;
  if(a.hat==='visor'||a.hat==='headband'){
   box(g,H(0,1.816,-.287),[.713,.079,.043],a.hat==='visor'?white:color,.012);
   for(const sign of [-1,1])box(g,H(sign*.34,1.816,.004),[.043,.079,.55],a.hat==='visor'?white:color,.012);
   box(g,H(0,1.816,.272),[.70,.079,.04],a.hat==='visor'?white:color,.01);
   if(a.hat==='visor'){box(g,H(0,1.78,-.35),[.713,.037,.24],color,.014);mark(g,H(0,1.816,-.312),.020,color)}
  }else{
   const backward=a.hat==='backwards';
   // Rounded rectangular crown with a curved dome rather than a flat box lid.
   const crown=new THREE.BufferGeometry(),vertices:number[]=[],indices:number[]=[],segments=32,rings=10;
   for(let row=0;row<=rings;row++){
    const angle=Math.max(0,(row-1)/(rings-1))*Math.PI/2,radius=Math.cos(angle);
    const y=1.79-.5064+(row===0?0:.085)+Math.sin(angle)*.235;
    for(let i=0;i<=segments;i++){const t=i/segments*Math.PI*2,c=Math.cos(t),s=Math.sin(t);
     vertices.push(Math.sign(c)*Math.pow(Math.abs(c),.65)*.39*radius,y,Math.sign(s)*Math.pow(Math.abs(s),.65)*.35*radius-.015);
     if(row<rings&&i<segments){const n=row*(segments+1)+i;indices.push(n,n+segments+1,n+1,n+1,n+segments+1,n+segments+2)}
    }
   }
   crown.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));crown.setIndex(indices);crown.computeVertexNormals();mesh(g,crown,color,new THREE.Vector3());
   if(a.hat==='beanie'){
    box(g,H(0,1.839,.015),[.742,.09,.615],color,.018);
    box(g,H(.13,1.841,-.302),[.075,.042,.01],white,.004);
   }else if(a.hat==='bucket'){
    box(g,H(0,1.80,.015),[.87,.055,.79],color,.025);
    box(g,H(0,1.847,-.29),[.73,.052,.025],white,.005);
   }else{
    box(g,H(0,1.833,backward?.365:-.365),[.69,.046,.28],color,.014);
    if(!backward){box(g,H(0,1.899,-.351),[.43,.105,.022],white,.02);mark(g,H(0,1.899,-.365),.037,color)}
    else box(g,H(0,1.891,-.354),[.17,.065,.025],hair,.008);
   }
  }attach(g,'head');
 }
 if(a.glasses!=='none'){
  const g=slot(`glasses-${a.glasses}`),sun=a.glasses==='sunglasses'||a.glasses==='sport',round=a.glasses==='round'||a.glasses==='oval',frame=a.glassesColor;
  for(const sign of [-1,1]){
   const cx=sign*.137,cy=1.602-.5064;
   let lensOutline:number[][];
   if(round)lensOutline=Array.from({length:32},(_,i)=>{const t=i*Math.PI/16;return [Math.cos(t)*.068*(a.glasses==='oval'?1.14:1),Math.sin(t)*.068*(a.glasses==='oval'?.72:1)]});
   else lensOutline=[];
   if(round){const ring=mesh(g,new THREE.TorusGeometry(.072,.009,6,24),frame,new THREE.Vector3(cx,cy,.282));if(a.glasses==='oval')ring.scale.set(1.14,.72,1)}
   else{
    const outline=a.glasses==='hexagon'?Array.from({length:7},(_,i)=>[Math.cos(i*Math.PI/3)*.082,Math.sin(i*Math.PI/3)*.077]):a.glasses==='cat-eye'?[[-.072,-.052],[.058,-.052],[.095,.080],[-.070,.052],[-.072,-.052]].map(([x,y])=>[x*sign,y]):[[-.076,-.073],[.076,-.073],[.076,.073],[-.076,.073],[-.076,-.073]];
    lensOutline=outline;
    const pts=outline.map(([x,y])=>new THREE.Vector3(cx+x,cy+y,.28));line(g,pts,frame,.010);
   }
   const shape=new THREE.Shape(lensOutline.map(([x,y])=>new THREE.Vector2(x,y)));
   const lens=mesh(g,new THREE.ShapeGeometry(shape),a.lensColor,new THREE.Vector3(cx,cy,.277));
   lens.material=(lens.material as THREE.MeshStandardMaterial).clone();
   Object.assign(lens.material,{transparent:true,opacity:sun?.88:.38,depthWrite:false,side:THREE.DoubleSide,roughness:.22});
   lens.name='glasses-lens';lens.castShadow=false;
   line(g,[H(sign*.213,1.629,-.28),H(sign*.347,1.629,-.17),H(sign*.347,1.61,.025)],frame,.007);
  }
  line(g,[H(-.06,1.624,-.284),H(0,1.635,-.286),H(.06,1.624,-.284)],frame,.008);attach(g,'head');
 }
 if(a.top!=='tank'){
  hide('top');const g=slot(`top-${a.top}`);
  box(g,B(0,1.135,0),[.353,.235,.245],cloth,.020);
  mark(g,B(.080,1.18,-.128),.020);
  if(a.top==='polo'){
   for(const sign of [-1,1]){const m=box(g,B(sign*.05,1.286,-.108),[.085,.052,.035],white,.006);m.rotation.z=sign*.35}
   line(g,[B(0,1.28,-.129),B(0,1.19,-.129)],white,.006);
  }
  if(a.top==='hoodie'){
   box(g,B(0,1.27,.13),[.26,.105,.12],cloth,.032);
   for(const sign of [-1,1])line(g,[B(sign*.04,1.27,-.135),B(sign*.041,1.14,-.14)],white,.004);
   box(g,B(0,1.035,-.129),[.19,.039,.014],a.accent,.008);
  }
  attach(g,'chest');
  for(const side of ['L','R']){
   const shoulder=point('upper_arm.'+side),elbow=point('forearm.'+side),wrist=point('hand.'+side),upper=slot(`sleeve-${side}`);
   link(upper,shoulder,shoulder.clone().lerp(elbow,a.top==='hoodie'?1:.58),.154,.152,cloth);attach(upper,'upper_arm.'+side);
   if(a.top==='hoodie'){const lower=slot(`long-sleeve-${side}`);link(lower,elbow,elbow.clone().lerp(wrist,.76),.143,.142,cloth);attach(lower,'forearm.'+side)}
  }
 }
 if(a.bottom!=='skirt'){
  hide('bottom');const g=slot(`bottom-${a.bottom}`);
  // Shorts use only the two fitted leg shells, without raised waist or hem trim.
  if(a.bottom==='skort'||a.bottom==='pleated-skirt')box(g,B(0,.946,0),[.335,.035,.233],a.bottomColor,.012);
  if(a.bottom==='pleated-skirt'){
   const outline:[number,number][]=[[-.24,.717],[.24,.717],[.164,.943],[-.164,.943]];
   plate(g,outline,-.142,.284,a.bottomColor,false);
   for(const sign of [-1,1])plate(g,[[sign*.09,.723],[sign*.13,.723],[sign*.085,.935],[sign*.063,.935]],.144,.008,white,false);
  }else if(a.bottom==='skort'){
   // A flat-front wrap panel distinguishes this from the original flared skirt.
   plate(g,[[-.229,.717],[.23,.755],[.163,.943],[-.163,.943]],.139,.015,a.bottomColor,false);
   box(g,B(0,.84,.065),[.37,.115,.16],a.bottomColor,.012);
  }
  attach(g,'pelvis');
  if(a.bottom!=='pleated-skirt')for(const side of ['L','R']){
   const hip=point('thigh.'+side),knee=point('shin.'+side),group=slot(`short-leg-${side}`),start=hip.clone();start.y+=.045;
   const end=hip.clone().lerp(knee,a.bottom==='long-shorts'?.90:.58);
   start.z-=.012;end.z-=.012;
   // The compacted thigh is wider across this rotated garment frame than
   // its source width. Keep clearance at the rounded front/side corners.
   const shell=link(group,start,end,.225,.25,a.bottomColor,.022);
   // Taper toward the knee and soften the corners of the fitted leg shells.
   const vertices=shell.geometry.attributes.position,length=start.distanceTo(end);
   for(let i=0;i<vertices.count;i++){
    const taper=1-.04*THREE.MathUtils.clamp(vertices.getY(i)/length+.5,0,1);
    vertices.setXYZ(i,vertices.getX(i)*taper,vertices.getY(i),vertices.getZ(i)*taper);
   }
   shell.geometry.computeVertexNormals();
   if(a.bottom==='skort')box(group,end.clone().add(new THREE.Vector3(side==='L'?.113:-.113,0,.02)),[.012,.038,.15],white,.003);
   attach(group,'thigh.'+side);
  }
 }
 if(a.shoeStyle!=='court'){
  hide('shoes');
  for(const side of ['L','R']){
   const g=slot(`shoe-${side}`),x=side==='L'?.15:-.15,runner=a.shoeStyle==='runner',high=a.shoeStyle==='high-top',slip=a.shoeStyle==='slip-on';
   box(g,B(x,.043,-.057),[.218,.053,runner?.35:.326],white,.018);
   box(g,B(x,.112,-.064),[.205,.089,.307],a.shoes,.030);
   box(g,B(x,high?.207:.161,.036),[.175,high?.166:.083,.135],a.shoes,.022);
   if(runner){
    box(g,B(x,.073,-.192),[.211,.035,.079],ink,.010);
    for(const sign of [-1,1])line(g,[B(x+sign*.104,.10,-.13),B(x+sign*.104,.155,-.055),B(x+sign*.104,.11,.018)],white,.008);
   }
   if(slip)box(g,B(x,.175,-.059),[.125,.012,.075],white,.010);
   else{
    box(g,B(x,.184,-.067),[.112,.029,.13],a.shoes,.012);
    for(let i=0;i<(high?3:2);i++)box(g,B(x,.206,-.11+i*.043),[.125,.010,.018],white,.004);
   }
   if(high)box(g,B(x,.28,.036),[.182,.025,.142],white,.009);
   attach(g,'foot.'+side);
  }
 }
 if(a.accessory!=='wristband'){
  hide('wrist_accessory');if(a.accessory==='watch'){
   const g=slot('watch'),elbow=point('forearm.L'),wrist=point('hand.L'),c=elbow.clone().lerp(wrist,.77);
   const band=link(g,elbow.clone().lerp(wrist,.68),elbow.clone().lerp(wrist,.86),.146,.142,a.accent);
   const face=box(g,c.clone().add(new THREE.Vector3(0,0,.077)),[.065,.055,.018],white,.008);face.quaternion.copy(band.quaternion);attach(g,'forearm.L');
  }
 }
 // Compress only the neck bone. Cancel its scale on the head so the face,
 // hair and accessories retain their size while the full head sits lower.
 const neck=bones.get('neck'),head=bones.get('head');
 if(neck&&head){neck.scale.y*=.7;head.scale.y/=.7}
}
