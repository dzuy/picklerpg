import * as THREE from 'three';
import {CourtEnvironment} from './court-environments';
import {FUN_THEMES,type FunThemeId} from './fun-themes';

/** Render-only decorations. Side props start outside the doubles run-off lane. */
export class FunCourt extends CourtEnvironment {
 private animated:Array<{group:THREE.Group;y:number;kind:'spin'|'float'|'wing'}>=[];
 private equalizer:THREE.Group[]=[];
 private discoLights:THREE.ShaderMaterial|null=null;
 constructor(readonly theme:FunThemeId){
  super(.06);this.group.name=`fun-court-${theme}`;
  const [dark,pink,accent]=FUN_THEMES.find(t=>t.id===theme)!.colors;
  const add=(x:number,y:number,z:number)=>{const g=new THREE.Group();g.position.set(x,y,z);this.group.add(g);return g};
  const ball=(g:THREE.Group,r:number,x:number,y:number,z:number,color:string)=>this.mesh(new THREE.SphereGeometry(r,16,10),color,x,y,z,g);
  const disc=(g:THREE.Group,r:number,depth:number,x:number,y:number,z:number,color:string)=>{const m=this.mesh(new THREE.CylinderGeometry(r,r,depth,24),color,x,y,z,g);m.rotation.x=Math.PI/2;return m};
  const speaker=(x:number,z:number,boombox=false)=>{const g=add(x,.1,z);g.rotation.y=x<0?Math.PI/2:-Math.PI/2;
   this.box(boombox?1.8:1.1,boombox?.85:1.8,.55,0,boombox?.45:.9,0,dark,g);
   for(const k of [-1,1]){const xx=boombox?k*.53:0,yy=boombox?.45:.9+k*.43;disc(g,.31,.06,xx,yy,.31,pink);disc(g,.22,.07,xx,yy,.35,dark);disc(g,.09,.08,xx,yy,.39,accent)}
   if(boombox){this.box(.5,.13,.08,0,.65,.32,accent,g);this.box(.8,.08,.1,0,1.02,0,pink,g);for(const s of [-1,1])this.box(.07,.2,.1,s*.38,.93,0,pink,g)}this.fadeable(g);
  };
  if(theme==='disco'){
   // One transparent projection layer: soft mirrorball reflections, with no extra lights/shadows.
   const positions:number[]=[],uvs:number[]=[],spotColors:number[]=[],shapes:number[]=[];
   const random=(seed:number)=>{const n=Math.sin(seed*127.1+31.7)*43758.5453;return n-Math.floor(n)};
   const lightColors=['#ff1461','#14b3ff','#a626ff','#ff6614'].map(c=>new THREE.Color(c));
   for(let spot=0;spot<68;spot++){
    const seed=spot*3.17,radius=.7+7.1*Math.sqrt(random(seed+2));
    const angle=random(seed+7)*Math.PI*2;
    const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius,turn=random(seed+13)*Math.PI*2;
    const size=.2+random(seed+19)*.24,w=size*(.65+random(seed+23)*1.3),h=size*(.45+random(seed+29)*.6);
    const color=lightColors[Math.floor(random(seed+47)*4)].clone().multiplyScalar(.65+random(seed+41)*.35);
    for(const [u,v] of [[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]]){
     positions.push(x+u*w*Math.cos(turn)-v*h*Math.sin(turn),y+u*w*Math.sin(turn)+v*h*Math.cos(turn),0);
     uvs.push(u,v);spotColors.push(color.r,color.g,color.b);shapes.push(random(seed+37));
    }
   }
   const reflectionsGeometry=new THREE.BufferGeometry();
   reflectionsGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
   reflectionsGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
   reflectionsGeometry.setAttribute('spotColor',new THREE.Float32BufferAttribute(spotColors,3));
   reflectionsGeometry.setAttribute('tileShape',new THREE.Float32BufferAttribute(shapes,1));
   this.discoLights=new THREE.ShaderMaterial({
    uniforms:{time:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`uniform float time;attribute vec3 spotColor;attribute float tileShape;
     varying vec2 spotUv;varying vec3 color;varying float shape;
     void main(){
      spotUv=uv;color=spotColor;shape=tileShape;
      float angle=time*0.18;vec3 p=position;
      p.xy=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*p.xy;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
     }`,
    fragmentShader:`varying vec2 spotUv;varying vec3 color;varying float shape;
     void main(){
      float distance=mix(length(spotUv),max(abs(spotUv.x),abs(spotUv.y)),shape*0.55);
      float glow=1.0-smoothstep(0.25,1.0,distance);
      gl_FragColor=vec4(color,glow*0.46);
     }`,
   });
   const reflections=new THREE.Mesh(reflectionsGeometry,this.discoLights);
   // Vertex rotation must not move spots outside their CPU-side culling bounds.
   reflectionsGeometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),9);
   reflections.name='disco-ground-lights';reflections.rotation.x=-Math.PI/2;
   // Above the kitchen surface, below the court lines and ball shadow.
   reflections.position.y=.0545;this.group.add(reflections);
   const g=add(0,6.2,0);this.animated.push({group:g,y:6.2,kind:'spin'});
   // Faceted mirror tiles are a single vertex-colored mesh, not hundreds of draw calls.
   const geo=new THREE.SphereGeometry(.68,20,12).toNonIndexed(),colors=[];const shades=['#b9e7ef','#ffe5a3','#f0a8cf','#b0a0da'];
   for(let i=0;i<geo.attributes.position.count;i++){const c=new THREE.Color(shades[Math.floor(i/6)%4]);colors.push(c.r,c.g,c.b)}geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
   const mirror=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,metalness:.65,roughness:.28,flatShading:true}));g.add(mirror);this.fadeable(g);
   this.link(new THREE.Vector3(-5,0,0),new THREE.Vector3(-5,7,0),.055,dark);this.link(new THREE.Vector3(5,0,0),new THREE.Vector3(5,7,0),.055,dark);this.link(new THREE.Vector3(-5,7,0),new THREE.Vector3(5,7,0),.045,dark);this.box(.025,.8,.025,0,6.85,0,dark);
   for(const x of [-5.6,5.6])for(const z of [-7.8,7.8]){speaker(x,z);const lamp=add(x,.1,z-1.2);this.box(.4,.3,.4,0,.2,0,dark,lamp);ball(lamp,.16,0,.4,0,accent);this.fadeable(lamp)}
   for(let i=0;i<12;i++){const x=-4.6+i*.84;this.mesh(new THREE.SphereGeometry(.085,8,6),i%2?pink:accent,x,6.9,0,this.group,.7)}
  }else if(theme==='eighties'){
   const cream='#fff0cf',lavender='#b4a4ee',coral='#ff987d';
   const memphis=(g:THREE.Group,width:number,height:number,z:number)=>{
    this.box(width,height,.09,0,0,z,dark,g);
    for(let i=0;i<9;i++){
     const x=((i%3)-1)*width*.29+Math.sin(i*4.7+width)*width*.055,y=(Math.floor(i/3)-1)*height*.28+Math.cos(i*2.3+width)*height*.07,c=[pink,accent,cream][(i+Math.floor(width))%3];
     if(i%3===0){for(let j=0;j<3;j++){const bar=this.box(width*.13,.055,.025,x+(j-1)*width*.09,y+(j%2)*.1,z+.06,c,g);bar.rotation.z=j%2?-.7:.7}}
     else if(i%3===1){const triangle=this.mesh(new THREE.ConeGeometry(height*.13,.035,3),c,x,y,z+.06,g);triangle.rotation.x=Math.PI/2;triangle.rotation.z=i*.4;}
     else {this.mesh(new THREE.TorusGeometry(height*.1,.035,5,14,Math.PI*1.65),c,x,y,z+.06,g);}
    }
   };
   // Two recognisable upright cabinets, facing the spectator side of the court.
   for(const side of [-1,1]){
    const g=add(side<0?-5.75:6.1,0,side<0?-5.7:-2.4);g.name='eighties-arcade';g.rotation.y=side<0?.2:-.55;g.scale.setScalar(side<0?1:.92);
    this.box(1.3,1.25,.9,0,.65,0,dark,g);this.box(1.38,.15,1.06,0,.12,0,accent,g,.25);
    for(const x of [-.64,.64]){this.box(.11,2.65,1.08,x,1.4,-.06,pink,g);this.box(.035,2.6,.035,x,1.4,.5,accent,g,.5)}
    this.box(1.2,1.2,.14,0,1.94,-.35,dark,g);
    this.box(1.11,.86,.07,0,1.94,-.25,accent,g,.35);
    this.box(.96,.72,.08,0,1.94,-.2,'#142447',g);
    // Tiny paddle game drawn directly in geometry on the screen.
    for(const x of [-.36,.36])this.box(.04,.22,.015,x,1.94+x*.35,-.15,cream,g,.7);
    for(let i=0;i<5;i++)this.box(.018,.055,.015,0,1.67+i*.13,-.15,lavender,g,.4);
    this.box(.065,.065,.025,.16,2.03,-.14,pink,g,.8);
    const deck=this.box(1.28,.12,.72,0,1.33,.2,lavender,g);deck.rotation.x=-.13;
    this.box(.045,.19,.045,-.32,1.49,.37,dark,g);ball(g,.085,-.32,1.6,.37,pink);
    for(let i=0;i<3;i++)this.mesh(new THREE.CylinderGeometry(.065,.065,.035,12),i%2?pink:accent,.08+i*.17,1.43,.36,g);
    this.box(.2,.25,.025,0,.65,.47,lavender,g);this.box(.11,.035,.03,0,.69,.49,dark,g);
    this.box(1.4,.4,1.12,0,2.76,-.02,dark,g);this.box(1.18,.25,.025,0,2.76,.56,accent,g,.5);
    for(let i=0;i<5;i++){const mark=this.box(.095,.14,.028,(i-2)*.18,2.76,.58,i%2?pink:dark,g);mark.rotation.z=i%2?.3:-.3}
    this.fadeable(g);
   }
   // Oversized pairs of quad skates: tall boots, cuffs, laces, four wheels and toe stops.
   for(const side of [-1,1]){
    const pair=add(side<0?-5.15:5.7,.05,side<0?4.7:7.15);pair.name='eighties-roller-skates';pair.rotation.y=side<0?-.65:.18;pair.scale.setScalar(side<0?1:.88);
    for(const foot of [-1,1]){
     const g=new THREE.Group();g.position.set(foot*(side<0?.43:.52),0,foot*(side<0?.19:-.26));g.rotation.y=foot*(side<0?.22:.48);pair.add(g);
     this.box(.53,.1,1.04,0,.31,.05,cream,g);
     this.box(.48,.32,.91,0,.52,.07,foot<0?pink:accent,g);
     this.box(.46,.63,.44,0,.91,-.17,foot<0?pink:accent,g);
     this.box(.51,.13,.49,0,1.22,-.17,cream,g);
     for(const x of [-.29,.29])for(const z of [-.26,.4]){const wheel=this.mesh(new THREE.CylinderGeometry(.17,.17,.13,12),coral,x,.18,z,g);wheel.rotation.z=Math.PI/2;}
     for(let i=0;i<4;i++)this.box(.28,.034,.045,0,.73+i*.105,.066,cream,g);
     this.box(.36,.065,.035,0,.52,.535,lavender,g);
     ball(g,.1,0,.24,.63,accent);this.fadeable(g);
    }
    this.fadeable(pair);
   }
   // Memphis banners and folded pastel chairs create a courtside hangout.
   for(const side of [-1,1]){
    const banner=add(side<0?-4.5:7,side<0?1.8:1.65,side<0?-9.25:-6.2);banner.name='eighties-memphis-banner';banner.rotation.y=side<0?.1:-.65;banner.rotation.z=side<0?-.045:.035;memphis(banner,2.8,side<0?1.45:1.15,0);
    for(const x of [-1.28,1.28])this.box(.045,2.55,.045,x,-.5,-.08,accent,banner);this.fadeable(banner);
    const chair=add(side<0?-6.3:6.45,0,side<0?6.7:3.65);chair.name='eighties-pastel-chair';chair.rotation.y=side<0?.55:-.48;
    this.box(1.05,.09,.9,0,.68,.15,pink,chair);
    const back=this.box(1.05,.95,.065,0,1.18,-.28,lavender,chair);back.rotation.x=-.15;
    for(const x of [-.55,.55]){this.link(new THREE.Vector3(x,.05,-.4),new THREE.Vector3(x,.8,.6),.045,cream,chair);this.link(new THREE.Vector3(x,.05,.6),new THREE.Vector3(x,1.7,-.38),.045,cream,chair);this.box(.09,.07,.8,x,1,.13,accent,chair)}
    for(const x of [-.31,0,.31])this.box(.08,.77,.018,x,1.19,-.19,cream,chair);this.fadeable(chair);
   }
   const cooler=add(6.2,0,5.25);cooler.name='eighties-cooler';cooler.rotation.y=.28;this.box(.95,.62,.65,0,.35,0,accent,cooler);this.box(1.04,.12,.74,0,.72,0,cream,cooler);this.box(.38,.07,.065,0,.53,.37,pink,cooler);this.fadeable(cooler);
   // Neon palm sculptures retain a clear silhouette against any existing location.
   for(const side of [-1,1]){
    const palm=add(side<0?-7.05:7.45,0,side<0?-8.5:.1);palm.name='eighties-neon-palm';palm.scale.setScalar(side<0?1.08:.83);palm.rotation.y=side<0?.25:-.5;
    this.link(new THREE.Vector3(0,0,0),new THREE.Vector3(-side*.35,3.8,0),.085,pink,palm);
    for(let i=0;i<7;i++){
     const a=i*Math.PI*2/7,points=[new THREE.Vector3(-side*.35,3.8,0),new THREE.Vector3(Math.cos(a)*.65-side*.35,4.12,Math.sin(a)*.65),new THREE.Vector3(Math.cos(a)*1.3-side*.35,3.55,Math.sin(a)*1.3)];
     this.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),8,.075,5),accent,0,0,0,palm,.55);
    }
    this.box(.75,.15,.75,0,.08,0,lavender,palm);this.fadeable(palm);
   }
   speaker(-5.35,-.2,true);speaker(5.2,-7.7,true);
   const music=add(-6.15,1.1,1.7);music.name='eighties-music-corner';music.rotation.y=.3;memphis(music,2,1.3,0);
   this.box(1.62,.75,.08,0,.05,.1,'#142447',music);
   for(let i=0;i<8;i++){const bar=new THREE.Group();bar.position.set(-.65+i*.185,-.27,.17);music.add(bar);this.box(.1,.55,.035,0,.275,0,i%2?pink:accent,bar,.45);this.equalizer.push(bar)}
   for(const x of [-.85,.85])this.box(.055,1.8,.055,x,-.2,-.1,lavender,music);this.fadeable(music);
   for(let i=0;i<3;i++){const tape=add(-5.2+[-.15,-.7,.2][i],.04,2+[.1,.55,.8][i]);tape.name='eighties-cassette';tape.rotation.y=i*.55;this.box(.54,.09,.34,0,.03,0,i%2?pink:lavender,tape);this.box(.4,.025,.19,0,.085,0,cream,tape);for(const x of [-.11,.11])this.mesh(new THREE.CylinderGeometry(.045,.045,.025,10),dark,x,.105,0,tape);this.fadeable(tape)}
   {const g=add(3.7,0,-10.2);g.rotation.y=-.12;this.box(.06,2.8,.06,-.7,1.4,0,accent,g,.65);this.box(.06,2.8,.06,.7,1.4,0,pink,g,.65);this.box(1.46,.06,.06,0,2.8,0,pink,g,.65);this.fadeable(g)}
   const sunset=add(-1.6,3.3,-10.7);disc(sunset,1.6,.12,0,0,0,pink);for(let y=-1.25;y<.1;y+=.25)this.box(2*Math.sqrt(Math.max(0,2.56-y*y)),.065,.16,0,y,.08,accent,sunset,.25);this.fadeable(sunset);
   for(const x of [-4.4,4.4])this.box(.045,.035,16,x,.06,0,x<0?pink:accent,this.group,.8);
  }else if(theme==='horrified'){
   const cream='#fff5df',violet='#8d73bf';
   const pumpkin=(x:number,z:number,size:number,turn:number)=>{
    const g=add(x,.07,z);g.name='spooky-pumpkin';g.scale.setScalar(size);g.rotation.y=turn;
    const body=ball(g,.48,0,.42,0,accent);body.scale.set(1.15,.85,1);
    this.box(.1,.22,.1,0,.91,0,pink,g);
    for(const s of [-1,1]){const eye=this.mesh(new THREE.ConeGeometry(.075,.025,3),dark,s*.16,.5,.435,g);eye.rotation.x=Math.PI/2;}
    const smile=this.mesh(new THREE.TorusGeometry(.19,.03,6,14,Math.PI),dark,0,.4,.455,g);smile.rotation.z=Math.PI;
    this.box(.065,.09,.025,.05,.28,.46,accent,g);this.fadeable(g);
   };
   for(const [x,z,size,turn] of [[-5.1,5.8,1.4,.25],[-6.15,5.1,.8,-.3],[-5.85,6.5,.6,.6],[5.4,-6.7,1.1,-.4],[6.2,-7.4,.68,.2],[5.1,3.1,.75,-.5],[-4.8,-8.1,.6,.1]])pumpkin(x,z,size,turn);
   for(const [x,y,z,size] of [[-5.3,2.7,-4.7,1],[6.4,1.8,5.3,.72],[3.8,3.1,-9.4,.85]]){
    const g=add(x,y,z);g.name='spooky-friendly-ghost';g.scale.setScalar(size);
    ball(g,.42,0,0,0,cream);this.mesh(new THREE.ConeGeometry(.47,.7,18),cream,0,-.3,0,g);
    for(const side of [-1,1]){ball(g,.055,side*.14,.03,.38,dark);const arm=ball(g,.16,side*.43,-.17,0,cream);arm.scale.set(1.6,.65,.7)}
    const smile=this.mesh(new THREE.TorusGeometry(.12,.022,6,12,Math.PI),dark,0,-.12,.4,g);smile.rotation.z=Math.PI;
    this.animated.push({group:g,y,kind:'float'});this.fadeable(g);
   }
   for(const [x,z,height,lean] of [[-6.3,1.2,2.2,.12],[5.7,-3.8,1.7,-.1],[6.8,7.5,1.25,.16]]){
    const g=add(x,0,z);g.name='spooky-lantern';g.rotation.z=lean;
    this.box(.08,height,.08,0,height/2,0,dark,g);this.box(.42,.55,.4,0,height,0,accent,g,.45);
    for(const side of [-1,1])this.box(.045,.57,.045,side*.21,height,.21,dark,g);
    this.mesh(new THREE.ConeGeometry(.36,.3,4),violet,0,height+.42,0,g);this.fadeable(g);
   }
   // A crooked little graveyard occupies one back corner, rather than framing both sides.
   for(const [x,z,height,lean] of [[-6.4,-7.1,1.25,.14],[-5.5,-8.7,.95,-.17],[-7.2,-8.6,.7,.08]]){
    const g=add(x,0,z);g.name='spooky-storybook-marker';g.rotation.z=lean;g.rotation.y=-lean*2;
    this.box(.75,height,.2,0,height/2,0,violet,g);const top=ball(g,.375,0,height,0,violet);top.scale.set(1,.6,.27);
    this.mesh(new THREE.TorusGeometry(.15,.033,6,16),cream,0,height*.72,.12,g);
    this.box(.34,.035,.03,0,height*.4,.12,cream,g);this.box(.22,.03,.03,0,height*.27,.12,cream,g);this.fadeable(g);
   }
   const fence=add(-1.5,0,-9.6);fence.name='spooky-crooked-fence';fence.rotation.y=.1;
   for(let i=0;i<6;i++){const post=this.box(.16,1.1+(i%3)*.14,.12,(i-2.5)*.55,.6,0,violet,fence);post.rotation.z=Math.sin(i*2)*.12;}
   for(const y of [.4,.86]){const rail=this.box(3.3,.1,.1,0,y,.08,dark,fence);rail.rotation.z=.045;}this.fadeable(fence);
   // An open web is made from thin strands, not an opaque screen over the scenery.
   const web=add(-6.8,2.5,-6.7);web.name='spooky-cobweb';web.rotation.y=.2;
   for(let spoke=0;spoke<8;spoke++){const a=spoke*Math.PI/4;this.link(new THREE.Vector3(),new THREE.Vector3(Math.cos(a)*1.1,Math.sin(a)*1.1,0),.015,cream,web);}
   for(const r of [.3,.6,.9])for(let i=0;i<8;i++){const a=i*Math.PI/4,b=(i+1)*Math.PI/4;this.link(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,0),new THREE.Vector3(Math.cos(b)*r,Math.sin(b)*r,0),.012,cream,web);}
   ball(web,.11,.5,-.62,.05,dark);for(const side of [-1,1])for(let i=0;i<3;i++)this.link(new THREE.Vector3(.5,-.62,.05),new THREE.Vector3(.5+side*.24,-.48-i*.13,.05),.015,dark,web);this.fadeable(web);
   for(const [x,y,z,size] of [[5.6,3.6,-5.6,.65],[-6.2,3.6,2.8,.45],[2.8,3.8,-10,.48]]){
    const g=add(x,y,z);g.name='spooky-bat';g.scale.setScalar(size);
    const wing=new THREE.Shape();wing.moveTo(0,0);wing.quadraticCurveTo(.55,.8,1.2,.48);wing.lineTo(.96,.05);wing.quadraticCurveTo(.73,.35,.61,-.1);wing.quadraticCurveTo(.34,.13,.16,-.28);wing.lineTo(0,0);
    for(const side of [-1,1]){const m=this.mesh(new THREE.ShapeGeometry(wing),violet,0,0,0,g);m.scale.x=side;m.material.side=THREE.DoubleSide;}
    const body=ball(g,.16,0,-.03,.03,dark);body.scale.y=1.5;for(const side of [-1,1]){this.mesh(new THREE.ConeGeometry(.08,.2,6),dark,side*.09,.2,0,g);ball(g,.035,side*.065,.025,.18,cream)}
    this.animated.push({group:g,y,kind:'wing'});this.fadeable(g);
   }
   const pot=add(5.8,0,.1);pot.name='spooky-bubbling-cauldron';
   const bowl=this.mesh(new THREE.SphereGeometry(.62,18,12,0,Math.PI*2,.45,Math.PI-.45),dark,0,.7,0,pot);bowl.scale.y=.8;
   const rim=this.mesh(new THREE.TorusGeometry(.52,.07,8,22),violet,0,1.13,0,pot);rim.rotation.x=Math.PI/2;
   this.mesh(new THREE.CylinderGeometry(.49,.49,.03,22),pink,0,1.1,0,pot,.4);
   for(const x of [-.36,.36])this.box(.14,.3,.16,x,.22,0,violet,pot);
   for(const [x,y,z,r] of [[-.2,1.2,.12,.13],[.22,1.35,-.08,.1],[.03,1.57,.05,.075]])ball(pot,r,x,y,z,pink);this.fadeable(pot);
   const sign=add(-5.35,0,-.7);sign.name='spooky-crooked-sign';sign.rotation.z=-.12;sign.rotation.y=.2;
   this.box(.12,1.65,.12,0,.83,0,violet,sign);const plank=this.box(1.1,.52,.13,0,1.5,0,accent,sign);plank.rotation.z=.15;
   // A friendly ghost emblem makes the sign readable without text or a texture.
   const emblem=ball(sign,.18,0,1.52,.1,cream);emblem.scale.set(1,1.15,.2);for(const x of [-.06,.06])ball(sign,.027,x,1.55,.15,dark);this.fadeable(sign);
  }else{
   const cream='#fff3d2',gold='#eebd56',blue='#79c9f2',royal='#546dcc',rose='#ed79a1',leaf='#70b97b',red='#df4c55';
   // A woodland cottage and apple tree on one side, a royal carriage on the other.
   const cottage=add(-5.8,0,-6.6);cottage.name='fairy-woodland-cottage';cottage.rotation.y=.22;
   this.box(2.2,1.65,1.5,0,.85,0,cream,cottage);
   const roofShape=new THREE.Shape();roofShape.moveTo(-1.3,0);roofShape.lineTo(1.3,0);roofShape.lineTo(0,.95);roofShape.closePath();
   this.mesh(new THREE.ExtrudeGeometry(roofShape,{depth:1.85,bevelEnabled:false}),red,0,1.68,-.925,cottage);
   this.box(.3,.9,.3,.64,2.25,-.25,gold,cottage);
   this.box(.55,1.05,.08,-.2,.56,.8,dark,cottage);this.box(.42,.9,.035,-.2,.52,.86,royal,cottage);ball(cottage,.035,-.06,.52,.9,gold);
   for(const x of [-.76,.65]){this.box(.42,.48,.06,x,1.12,.8,blue,cottage,.15);for(const dx of [-.26,.26])this.box(.1,.52,.07,x+dx,1.12,.82,red,cottage);this.box(.46,.04,.03,x,1.12,.84,cream,cottage);this.box(.04,.5,.03,x,1.12,.84,cream,cottage);this.box(.56,.16,.2,x,.77,.85,gold,cottage);for(let i=0;i<3;i++)ball(cottage,.085,x+(i-1)*.16,.91,.9,[rose,blue,red][i]);}
   this.fadeable(cottage);
   const tree=add(-6.8,0,-1.6);tree.name='fairy-apple-tree';
   this.link(new THREE.Vector3(),new THREE.Vector3(.2,2.8,0),.17,'#936d59',tree);
   for(const [x,y,z,r] of [[-.5,2.6,0,.8],[.48,3,.1,.95],[.05,2.75,-.5,.72]]){const crown=ball(tree,r,x,y,z,leaf);crown.scale.y=.85;}
   for(const [x,y,z] of [[-.5,2.45,.68],[.42,2.8,.87],[.88,3.13,.58],[-.03,3.3,.65],[-.87,2.65,.4]]){ball(tree,.13,x,y,z,red);this.box(.025,.1,.025,x,y+.13,z,dark,tree);}
   this.fadeable(tree);
   const basket=add(-5.35,0,.15);basket.name='fairy-apple-basket';this.mesh(new THREE.CylinderGeometry(.4,.3,.42,12),gold,0,.24,0,basket);const handle=this.mesh(new THREE.TorusGeometry(.36,.045,6,18,Math.PI),gold,0,.44,0,basket);for(const [x,z] of [[-.17,0],[.14,.12],[.08,-.15]])ball(basket,.13,x,.5,z,red);this.fadeable(basket);
   const carriage=add(6.05,0,3.2);carriage.name='fairy-enchanted-carriage';carriage.rotation.y=-.38;
   this.box(1.7,.16,1.6,0,.59,0,gold,carriage);
   const cabin=ball(carriage,1.05,0,1.55,0,blue);cabin.scale.set(.87,1,.77);
   for(const x of [-.87,.87])for(const z of [-.64,.64]){
    const wheel=this.mesh(new THREE.TorusGeometry(.43,.065,7,20),gold,x,.46,z,carriage);wheel.rotation.y=Math.PI/2;
    for(let i=0;i<5;i++){const a=i*Math.PI/5;this.link(new THREE.Vector3(x,.46+Math.cos(a)*.38,z+Math.sin(a)*.38),new THREE.Vector3(x,.46-Math.cos(a)*.38,z-Math.sin(a)*.38),.019,cream,carriage);}
    ball(carriage,.095,x,.46,z,gold);
   }
   // Tall arched door and curved gilt ribs make the coach readable from the court camera.
   this.box(.64,.69,.055,0,1.25,.76,royal,carriage);const arch=disc(carriage,.32,.055,0,1.61,.77,royal);arch.scale.y=1.2;
   const frame=this.mesh(new THREE.TorusGeometry(.36,.035,6,18,Math.PI),gold,0,1.61,.81,carriage);
   for(const x of [-.36,.36])this.box(.035,.7,.035,x,1.26,.8,gold,carriage);
   this.box(.75,.08,.4,0,.66,1,cream,carriage);ball(carriage,.045,.2,1.15,.81,gold);
   for(const x of [-.6,.6]){const rib=this.mesh(new THREE.TorusGeometry(.94,.026,5,24,Math.PI),gold,0,1.54,0,carriage);rib.rotation.y=x;rib.scale.set(.9,1,.8);}
   this.mesh(new THREE.ConeGeometry(.25,.36,7),gold,0,2.7,0,carriage);ball(carriage,.07,0,2.94,0,rose);this.fadeable(carriage);
   const slipper=add(-5.1,0,5.1);slipper.name='fairy-glass-slipper';slipper.rotation.y=.5;
   this.box(1.05,.5,.85,0,.28,0,cream,slipper);this.box(1.12,.08,.92,0,.56,0,gold,slipper);
   const shoe=ball(slipper,.3,0,.78,.07,blue);shoe.scale.set(.65,.5,1.45);this.box(.27,.075,.63,0,.7,0,blue,slipper);this.box(.1,.3,.1,0,.78,-.28,blue,slipper);
   const heel=ball(slipper,.22,0,.91,-.2,blue);heel.scale.set(.85,1,.5);this.mesh(new THREE.OctahedronGeometry(.11),cream,0,.91,.27,slipper,.35);this.fadeable(slipper);
   const castle=add(2.3,0,-10.8);castle.name='fairy-storybook-castle';castle.rotation.y=-.14;
   for(const [x,h,r,c] of [[-1.05,2.4,.4,blue],[.75,3.15,.48,rose],[1.5,1.75,.31,'#ae9cde'] ] as const){
    this.mesh(new THREE.CylinderGeometry(r,r,h,12),cream,x,h/2,0,castle);this.mesh(new THREE.ConeGeometry(r*1.45,.95,12),c,x,h+.4,0,castle);this.box(.14,.42,.035,x,h*.73,r+.015,royal,castle);
    this.box(.025,.6,.025,x,h+1,0,gold,castle);const flag=this.mesh(new THREE.ConeGeometry(.17,.035,3),c,x+.13,h+1.13,0,castle);flag.rotation.x=Math.PI/2;
   }
   this.box(1.9,1.5,.7,0,.78,0,pink,castle);this.box(.49,.9,.035,0,.48,.37,royal,castle);
   disc(castle,.35,.055,0,1.85,.42,gold);disc(castle,.29,.07,0,1.85,.46,cream);this.box(.025,.21,.03,0,1.96,.51,royal,castle);const hand=this.box(.025,.18,.03,.065,1.92,.51,royal,castle);hand.rotation.z=-.75;this.fadeable(castle);
   // Uneven meadow clusters mix coral, butter yellow, blue, and lilac.
   for(const [x,z,size,color] of [[-5.4,7.4,.85,rose],[6.1,-6.2,1.15,red],[5.05,-7.3,.6,blue],[-6.65,3.15,.7,gold],[5.45,7.65,.9,pink]] as const){
    const g=add(x,0,z);g.name='fairy-mushroom';g.scale.setScalar(size);this.mesh(new THREE.CylinderGeometry(.18,.25,.8,12),cream,0,.4,0,g);const cap=this.mesh(new THREE.SphereGeometry(.7,18,10,0,Math.PI*2,0,Math.PI/2),color,0,.75,0,g);cap.scale.y=.65;for(const dx of [-.3,0,.3])ball(g,.085,dx,1.11-Math.abs(dx)*.35,.2,cream);this.fadeable(g);
   }
   for(const [x,z,color] of [[-4.9,6.5,blue],[-5.8,7.9,gold],[5.7,-5.4,rose],[6.9,-6.9,pink],[5.2,6.4,red],[-6.6,-8.6,gold]] as const){
    const g=add(x,0,z);g.name='fairy-flower-patch';
    for(let j=0;j<3;j++){const xx=(j-1)*.32,h=.45+j*.2;this.link(new THREE.Vector3(xx,0,j*.13),new THREE.Vector3(xx,h,j*.13),.025,leaf,g);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const petal=ball(g,.11,xx+Math.cos(a)*.14,h+Math.sin(a)*.14,j*.13,color);petal.scale.z=.35;}ball(g,.08,xx,h,j*.13+.04,gold);}
    this.fadeable(g);
   }
   for(const [x,y,z,c] of [[-4.85,2.1,2.2,rose],[5.8,2.7,-4,blue],[3.7,1.6,-9,gold]] as const){
    const g=add(x,y,z);g.name='fairy-butterfly';for(const side of [-1,1]){const wing=ball(g,.25,side*.2,0,0,c);wing.scale.set(1,1.4,.13);ball(g,.1,side*.17,-.23,.015,pink)}this.box(.04,.35,.06,0,0,.035,dark,g);this.animated.push({group:g,y,kind:'wing'});this.fadeable(g);
   }
   for(const [x,y,z,c] of [[-6,2.63,-5.75,blue],[-7.2,3.35,-1.25,gold],[5.9,1.4,-6.15,rose]] as const){
    const g=add(x,y,z);g.name='fairy-songbird';const body=ball(g,.19,0,0,0,c);body.scale.set(1,1,1.35);ball(g,.14,0,.2,.12,c);const beak=this.mesh(new THREE.ConeGeometry(.07,.16,6),gold,0,.18,.28,g);beak.rotation.x=Math.PI/2;for(const side of [-1,1])ball(g,.022,side*.095,.23,.21,dark);const tail=this.mesh(new THREE.ConeGeometry(.12,.35,5),c,0,.06,-.3,g);tail.rotation.x=-Math.PI/2;this.fadeable(g);
   }

  }
 }
 animate(time:number,reduced:boolean){for(const [i,bar] of this.equalizer.entries())bar.scale.y=reduced?.65:.3+(.5+.5*Math.sin(time*1.6+i*1.7))*.7;if(this.discoLights)this.discoLights.uniforms.time.value=reduced?0:time;for(const a of this.animated){a.group.position.y=a.y+(reduced?0:a.kind==='spin'?0:Math.sin(time*1.3+a.group.position.x*.7+a.group.position.z*.3)*.12);a.group.rotation.y=reduced?0:a.kind==='spin'?time*.18:Math.sin(time)*.2;}}
 dispose(){this.group.removeFromParent();const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();this.group.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m)}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())}
}
