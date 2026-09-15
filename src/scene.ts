import {ArizonaDesert} from './arizona-desert';
import {viewerPoint} from './engine/controllers';
import {ballDisplayScale,bouncePulse,cameraBlend,courtOverlayOffset} from './scene-readability';
import {styleCourtAthlete} from './athlete-rendering';
import {athletePose} from './athlete-motion';
import type {DesignedPlayer} from './player-design';
import * as THREE from 'three';
import {CourtTrees} from './trees';
import {VeniceSunset} from './venice-sunset';
import {LOCATION_PALETTES,type CourtLocation} from './locations';
import {createPickleball} from './pickleball';
import {createAthlete, animateAthlete, disposeAthlete, setAthleteHandedness} from './athlete';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {COURT, type GameState, type PlayerId, type RallyShot, type Team} from './engine/model';
import {sampleLeg} from './engine/rally-engine';
export class CourtScene {
 private viewTeam:Team='home';
 setViewTeam(team:Team){if(this.viewTeam===team)return;this.viewTeam=team;this.lastOpponentShot=null;this.setShotPreview(null);this.customizedView=false;this.updateCamera();}
 onCourtTap:((point:{x:number;z:number;playerId?:PlayerId})=>boolean)|null=null;
 private selectedTarget:{x:number;z:number}|null=null;
 setSelectedTarget(point:{x:number;z:number}|null){this.selectedTarget=point}
 projectTarget(point:{x:number;z:number}){const p=new THREE.Vector3(point.x,.08,point.z).project(this.camera);const rect=this.host.getBoundingClientRect();return {x:rect.left+(p.x*.5+.5)*rect.width,y:rect.top+(-p.y*.5+.5)*rect.height}}

 private reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 private previousRenderTime=0;
 private heightGuide=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:'#eefb8c',transparent:true,opacity:.4}));
 private speedStreak=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:'#e6fa42',transparent:true,opacity:.7}));
 private bounceRing=new THREE.Mesh(new THREE.RingGeometry(.82,1,40),new THREE.MeshBasicMaterial({color:'#f0ff91',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
 private trees=new CourtTrees();
 private forestFurniture=new THREE.Group();
 private venice:VeniceSunset|undefined;
 private arizona:ArizonaDesert|undefined;
 private location:CourtLocation='forest';
 private surfaces:THREE.Mesh<THREE.BoxGeometry,THREE.MeshStandardMaterial>[]=[];
 private motion=new Map<PlayerId,{x:number;z:number;distance:number;time:number}>();
 private retainedTrajectory:RallyShot|null=null;
 setRetainedTrajectory(shot:RallyShot|null){this.retainedTrajectory=shot}
 private turnArrow=document.createElement('div');
 private nextHitter:PlayerId|null=null;
 setNextHitter(id:PlayerId|null){this.nextHitter=id}
 private serveBubble=document.createElement('div');
 private pausedBallMarker=document.createElement('div');
 private ballScreenPosition=new THREE.Vector3();
 private trajectoryArrow=new THREE.Mesh(new THREE.ConeGeometry(.23,.64,12).translate(0,-.32,0),new THREE.MeshBasicMaterial({color:'#efff58',depthTest:false,depthWrite:false}));
 private scene=new THREE.Scene(); private camera=new THREE.PerspectiveCamera(38,1,.1,180); private renderer:THREE.WebGLRenderer;
 private controls:OrbitControls;private customizedView=false;
 private players=new Map<PlayerId,THREE.Group>();private ball:THREE.Group;private ballHalo:THREE.Mesh;private shadow:THREE.Mesh;private trail:THREE.Line;private trailDots:THREE.Points;private target:THREE.Mesh;private labels=new Map<PlayerId,HTMLDivElement>();private cameraDistance=50;private guides=true;private lastShot:RallyShot|null=null;private previewShot:RallyShot|null=null;private lastOpponentShot:RallyShot|null=null;
 constructor(private host:HTMLElement,private selectPlayer:(id:PlayerId)=>void=()=>{}){
  this.turnArrow.className='turn-arrow';this.turnArrow.hidden=true;this.turnArrow.setAttribute('role','img');host.append(this.turnArrow);
  this.serveBubble.className='serve-bubble';this.serveBubble.hidden=true;this.serveBubble.setAttribute('role','status');host.append(this.serveBubble);
  this.pausedBallMarker.className='paused-ball-marker';this.pausedBallMarker.hidden=true;this.pausedBallMarker.setAttribute('role','img');this.pausedBallMarker.setAttribute('aria-label','Ball location — play paused');host.append(this.pausedBallMarker);
  const horizonColor=new THREE.Color('#87b6a1');this.scene.background=horizonColor;this.scene.fog=new THREE.Fog(horizonColor,105,172);
  this.renderer=new THREE.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.NeutralToneMapping;this.renderer.toneMappingExposure=1.2;host.append(this.renderer.domElement);
  this.renderer.domElement.setAttribute('aria-label','Interactive 3D pickleball court. Drag to rotate, pinch or scroll to zoom, and use two fingers or right-drag to move the view.');this.renderer.domElement.setAttribute('role','img');
  this.renderer.domElement.style.touchAction='none';
  let pointerStart:{x:number;y:number}|null=null;
  this.renderer.domElement.addEventListener('pointerdown',event=>{if(event.button!==0){pointerStart=null;return}pointerStart={x:event.clientX,y:event.clientY}});
  this.renderer.domElement.addEventListener('pointerup',event=>{
   if(!pointerStart||Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>8){pointerStart=null;return}
   pointerStart=null;const bounds=this.renderer.domElement.getBoundingClientRect();
   const pointer=new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1,-((event.clientY-bounds.top)/bounds.height)*2+1);
   const hit=new THREE.Raycaster();hit.setFromCamera(pointer,this.camera);
   const ground=hit.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-.07),new THREE.Vector3());
   const object=hit.intersectObjects([...this.players.values()],true)[0]?.object;
   const id=object?.userData.playerId as PlayerId|undefined;
   const player=id?this.players.get(id):undefined;
   if(player&&this.onCourtTap?.({x:player.position.x,z:player.position.z,playerId:id}))return;
   if(ground&&this.onCourtTap?.({x:ground.x,z:ground.z}))return;
   if(id)this.selectPlayer(id);
  });
  this.renderer.domElement.addEventListener('pointercancel',()=>pointerStart=null);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.enablePan=true;this.controls.screenSpacePanning=true;this.controls.rotateSpeed=.65;this.controls.zoomSpeed=.8;this.controls.panSpeed=.55;this.controls.minDistance=6;this.controls.maxDistance=90;this.controls.minPolarAngle=.08;this.controls.maxPolarAngle=Math.PI*.40;this.controls.touches.ONE=THREE.TOUCH.ROTATE;this.controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
  this.controls.addEventListener('start',()=>{this.customizedView=true});
  this.scene.add(new THREE.HemisphereLight('#e4f2ff','#91a58d',2.1));const sun=new THREE.DirectionalLight('#fff1d8',2.9);sun.position.set(-9,18,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14});sun.shadow.bias=-.00015;sun.shadow.normalBias=.022;sun.shadow.radius=2;sun.shadow.camera.near=.5;sun.shadow.camera.far=65;sun.shadow.camera.updateProjectionMatrix();this.scene.add(sun);
  const rim=new THREE.DirectionalLight('#e0f4ff',1.1);rim.position.set(8,9,-10);this.scene.add(rim);
  const faceFill=new THREE.DirectionalLight('#fff6e9',.65);faceFill.position.set(0,4,12);this.scene.add(faceFill);
  this.surfaces=[this.box(340,.15,340,0,-.22,0,'#76A64B'),this.box(12,.16,21,0,-.1,0,'#178668'),this.box(COURT.width+.32,.04,COURT.length+.32,0,-.005,0,'#07505A'),this.box(COURT.width,.03,COURT.length,0,.025,0,'#08AABB'),this.box(COURT.width,.012,COURT.kitchen*2,0,.047,0,'#83D9C9')];
  const w=COURT.width,l=COURT.length,k=COURT.kitchen,t=COURT.line;
  for(const x of [-w/2+t/2,w/2-t/2])this.box(t,.009,l,x,.06,0,'#F7F5EB');
  for(const z of [-l/2+t/2,l/2-t/2])this.box(w,.009,t,0,.06,z,'#F7F5EB');
  for(const sign of [-1,1]){this.box(w,.009,t,0,.06,sign*(k-t/2),'#F7F5EB');this.box(t,.009,l/2-k,0,.06,sign*(k+(l/2-k)/2),'#F7F5EB')}
  this.net();this.environment();this.scene.add(this.trees.group);
  const configs:[PlayerId,string,string][]=[['you','#f3dc86','YOU'],['partner','#d8ebb0','FINN'],['opponent-left','#ec8058','JULES'],['opponent-right','#c95f4d','RIO']];
  for(const [id,color,label] of configs){const player=createAthlete(id,color);styleCourtAthlete(player,id);player.traverse(object=>object.userData.playerId=id);this.players.set(id,player);this.scene.add(player);const div=document.createElement('div');div.className='player-label '+(id==='you'?'is-you':'');div.dataset.team=id==='you'||id==='partner'?'home':'away';div.dataset.name=label;div.textContent=label;div.tabIndex=0;div.setAttribute('role','button');div.setAttribute('aria-label',`View ${label} skills`);div.addEventListener('click',()=>this.selectPlayer(id));div.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();this.selectPlayer(id)}});host.append(div);this.labels.set(id,div)}
  this.ball=createPickleball();this.scene.add(this.ball);
  this.ballHalo=new THREE.Mesh(new THREE.SphereGeometry(.16,12,8),new THREE.MeshBasicMaterial({color:'#DFFF32',transparent:true,opacity:.035,depthWrite:false,blending:THREE.AdditiveBlending}));this.ballHalo.renderOrder=24;this.scene.add(this.ballHalo);
  this.shadow=new THREE.Mesh(new THREE.CircleGeometry(.15,28),new THREE.MeshBasicMaterial({color:'#071A43',transparent:true,opacity:.34,depthWrite:false}));this.shadow.rotation.x=-Math.PI/2;this.scene.add(this.shadow);
  this.trajectoryArrow.renderOrder=22;this.trajectoryArrow.visible=false;this.scene.add(this.trajectoryArrow);
  const trailGeometry=new THREE.BufferGeometry();this.trail=new THREE.Line(trailGeometry,new THREE.LineDashedMaterial({color:'#efff70',transparent:true,opacity:.98,dashSize:.24,gapSize:.07,linewidth:2,depthTest:false}));this.trail.renderOrder=20;this.scene.add(this.trail);
  this.trailDots=new THREE.Points(trailGeometry,new THREE.PointsMaterial({color:'#efff70',size:2.5,sizeAttenuation:false,transparent:true,opacity:.92,depthTest:false}));this.trailDots.renderOrder=21;this.trailDots.visible=false;this.scene.add(this.trailDots);
  this.target=new THREE.Mesh(new THREE.RingGeometry(.28,.32,48),new THREE.MeshBasicMaterial({color:'#edff7f',side:THREE.DoubleSide}));this.target.rotation.x=-Math.PI/2;this.scene.add(this.target);
  this.bounceRing.rotation.x=-Math.PI/2;this.scene.add(this.heightGuide,this.speedStreak,this.bounceRing);
  new ResizeObserver(()=>this.resize()).observe(host);this.resize();
 }
 setLocation(location:CourtLocation){
  this.location=location;
  const palette=LOCATION_PALETTES[location];
  const colors=[palette.ground,palette.apron,palette.border,palette.court,palette.kitchen];
  this.surfaces.forEach((surface,i)=>surface.material.color.set(colors[i]));
  this.scene.background=new THREE.Color(palette.sky);this.scene.fog=new THREE.Fog(palette.sky,105,172);
  this.trees.group.visible=location==='forest';
  this.forestFurniture.visible=location==='forest';
  if(location==='venice'&&!this.venice){this.venice=new VeniceSunset();this.scene.add(this.venice.group)}
  if(this.venice)this.venice.group.visible=location==='venice';
  if(location==='arizona'&&!this.arizona){this.arizona=new ArizonaDesert();this.scene.add(this.arizona.group)}
  if(this.arizona)this.arizona.group.visible=location==='arizona';
  this.renderer.domElement.dataset.location=location;
 }
 private box(w:number,h:number,d:number,x:number,y:number,z:number,color:string){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:1}));mesh.position.set(x,y,z);mesh.receiveShadow=true;this.scene.add(mesh);return mesh}
 private net(){
  const points:THREE.Vector3[]=[];const top=(x:number)=>COURT.netCenter+(COURT.netSideline-COURT.netCenter)*(x/(COURT.width/2))**2;
  for(let x=-COURT.netWidth/2;x<=COURT.netWidth/2;x+=.11)points.push(new THREE.Vector3(x,.05,0),new THREE.Vector3(x,top(x),0));
  for(let y=.09;y<.87;y+=.09)points.push(new THREE.Vector3(-COURT.netWidth/2,y,0),new THREE.Vector3(COURT.netWidth/2,y,0));
  this.scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#101f30',transparent:true,opacity:.95})));
  const curve=new THREE.CatmullRomCurve3(Array.from({length:41},(_,i)=>{const x=-COURT.netWidth/2+i*COURT.netWidth/40;return new THREE.Vector3(x,top(x),0)}));this.scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve,40,.028,6,false),new THREE.MeshStandardMaterial({color:'#F8FCFF'})));
  for(const x of [-COURT.netWidth/2,COURT.netWidth/2]){
   const post=new THREE.Mesh(new THREE.CylinderGeometry(.055,.063,1.03,12),new THREE.MeshStandardMaterial({color:'#122238',metalness:.5,roughness:.45}));post.position.set(x,.515,0);post.castShadow=true;this.scene.add(post);
   this.box(.19,.045,.24,x,.045,0,'#122238');this.box(.10,.025,.10,x,1.035,0,'#bec6af');
   this.box(.10,.035,.035,x+.055,.79,.025,'#7c9584');
  }this.box(.032,COURT.netCenter,.015,0,COURT.netCenter/2,.01,'#F8FCFF');
 }
 private environment(){
  const furnitureStart=this.scene.children.length;
  for(const x of [-4.6,4.6]){
   const side=Math.sign(x);
   // Slatted seats and backs, supported by a dark metal frame.
   for(let i=0;i<4;i++)this.box(.115,.075,2.2,x-.225+i*.15,.49,-4.5,'#b97938').castShadow=true;
   for(const z of [-5.3,-3.7]){
    this.box(.07,.48,.07,x-side*.22,.24,z,'#20343a');this.box(.07,.86,.07,x+side*.27,.43,z,'#20343a');
    this.box(.56,.06,.07,x,.38,z,'#20343a');
   }
   for(const y of [.68,.83])this.box(.07,.105,2.2,x+side*.27,y,-4.5,'#b97938').castShadow=true;
   const bottle=new THREE.Mesh(new THREE.CylinderGeometry(.046,.047,.21,16),new THREE.MeshStandardMaterial({color:x<0?'#e3b754':'#db7655',metalness:.3,roughness:.38}));
   bottle.position.set(x,.64,-5.2);bottle.castShadow=true;this.scene.add(bottle);
   this.box(.055,.035,.055,x,.76,-5.2,'#294b40');
  }
  for(const child of this.scene.children.slice(furnitureStart))this.forestFurniture.add(child);
  this.scene.add(this.forestFurniture);
 }
 getPlayerAppearance(id:PlayerId){return {...this.players.get(id)!.userData.appearance} as DesignedPlayer['appearance']}
 setPlayerDesign(player:DesignedPlayer|null){this.substitutePlayer('you',player)}
 substitutePlayer(id:PlayerId,player:DesignedPlayer|null){
  const colors={you:'#f3dc86',partner:'#d8ebb0','opponent-left':'#ec8058','opponent-right':'#c95f4d'};
  const names={you:'YOU',partner:'FINN','opponent-left':'JULES','opponent-right':'RIO'};
  const old=this.players.get(id)!,avatar=createAthlete(id,colors[id],player?.appearance);
  styleCourtAthlete(avatar,id);avatar.traverse(object=>object.userData.playerId=id);
  avatar.position.copy(old.position);avatar.rotation.copy(old.rotation);this.scene.remove(old);disposeAthlete(old);
  this.players.set(id,avatar);this.scene.add(avatar);this.motion.delete(id);
  const label=this.labels.get(id)!;label.dataset.name=player?.name??names[id];
  label.classList.remove('is-thinking');label.setAttribute('aria-label',`View ${label.dataset.name} skills`);label.textContent=label.dataset.name;
 }
 setCamera(distance:number){this.cameraDistance=Math.max(0,Math.min(100,distance));if(this.customizedView){const pose=this.cameraPose();const radius=pose.position.distanceTo(pose.look);const direction=this.camera.position.clone().sub(this.controls.target).normalize();this.camera.position.copy(this.controls.target).addScaledVector(direction,radius);this.controls.update()}else this.updateCamera()}
 resetCamera(distance=50){this.cameraDistance=Math.max(0,Math.min(100,distance));this.customizedView=false;this.updateCamera()}
 private bottomOverlay=0;
 setBottomOverlay(height:number){
  const changed=this.bottomOverlay!==height;this.bottomOverlay=height;const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;
  if(changed&&!this.customizedView)this.updateCamera();
  this.camera.zoom=height>0?1:1.15;
  this.updateOverlayFraming();
 }
 private framingPoint=new THREE.Vector3();
 private updateOverlayFraming(){
  const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;
  this.camera.clearViewOffset();
  if(this.bottomOverlay<=0)return;
  this.camera.updateMatrixWorld();
  // Measure without last frame's offset so orbiting cannot feed back into the framing.
  let bottom=-Infinity;
  for(const x of [-COURT.width/2-.45,COURT.width/2+.45])for(const z of [-COURT.length/2-.45,COURT.length/2+.45]){
   const point=this.framingPoint.set(x,0,z).project(this.camera);
   if(point.z<1)bottom=Math.max(bottom,(1-point.y)*h/2);
  }
  const elevation=Math.abs(this.camera.position.y-this.controls.target.y)/this.camera.position.distanceTo(this.controls.target);
  const offset=courtOverlayOffset(w,h,this.bottomOverlay,Number.isFinite(bottom)?bottom:h/2,elevation);
  this.camera.setViewOffset(w,h,0,offset,w,h);
 }
 setPlayerNames(visible:boolean){for(const label of this.labels.values())label.hidden=!visible}
 setGuides(value:boolean){this.guides=value}
 setShotPreview(shot:RallyShot|null){this.previewShot=shot;this.lastShot=null}
 private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;if(this.customizedView)this.camera.updateProjectionMatrix();else this.updateCamera();this.setBottomOverlay(this.bottomOverlay)}
 private cameraPose(){
  const t=this.cameraDistance/100,aspect=this.camera.aspect*this.host.clientHeight/Math.max(1,this.host.clientHeight-this.bottomOverlay);
  // Close: behind the team, looking through the net toward the opponents.
  // Far: gain height faster than distance for a downward tactical view.
  const near=t<.5,u=near?t*2:(t-.5)*2;
  const y=THREE.MathUtils.lerp(near?5.2:17.5,near?17.5:27.5,u);
  const z=THREE.MathUtils.lerp(near?17.5:19.8,near?19.8:7.5,u);
  const look=new THREE.Vector3(0,near?THREE.MathUtils.lerp(.6,0,u):0,near?THREE.MathUtils.lerp(-.5,.1,u):.1);
  const position=new THREE.Vector3(0,y,z);
  // Preserve the viewing angle when backing up to fit a narrow screen.
  if(aspect<1.15)position.sub(look).multiplyScalar(1.15/aspect).add(look);
  const p=viewerPoint(position,this.viewTeam),l=viewerPoint(look,this.viewTeam);return {position:new THREE.Vector3(p.x,position.y,p.z),look:new THREE.Vector3(l.x,look.y,l.z)};
 }
 private updateCamera(){
  // The scene is hidden in the lobby; wait for its resize before calculating aspect-based framing.
  if(!this.host.clientWidth||!this.host.clientHeight)return;
  const {position,look}=this.cameraPose();this.camera.zoom=1.15;this.camera.position.copy(position);this.controls.target.copy(look);this.camera.lookAt(look);this.camera.updateProjectionMatrix();this.controls.update();
 }
 render(state:GameState,time:number,shot:RallyShot,serveCall:string|null=null){
  const renderDt=this.previousRenderTime?Math.max(0,time-this.previousRenderTime):0;this.previousRenderTime=time;
  if(state.simulationTime===0&&state.shotHistory.length===0)this.lastOpponentShot=null;
  const actualShotByOpponent=state.players.find(player=>player.id===shot.actor)?.team!==this.viewTeam;
  if(state.phase==='flight'&&actualShotByOpponent)this.lastOpponentShot=shot;
  const retainedOpponentShot=this.retainedTrajectory??(state.phase==='decision'&&state.possession===this.viewTeam&&!this.previewShot?this.lastOpponentShot:null);
  const displayShot=this.previewShot??retainedOpponentShot??shot;
  const serving=serveCall!==null&&state.phase==='decision'&&shot.intent.type==='serve';
  this.serveBubble.hidden=!serving;
  if(serving){
   const server=state.players.find(p=>p.id===shot.actor)!;
   const point=new THREE.Vector3(server.position.x,1.45,server.position.z).project(this.camera);
   const text=serveCall.replaceAll('–','-');
   if(this.serveBubble.textContent!==text)this.serveBubble.textContent=text;
   const playerX=(point.x*.5+.5)*this.host.clientWidth,side=playerX>this.host.clientWidth/2?-1:1;
   this.serveBubble.style.left=`${Math.max(45,Math.min(this.host.clientWidth-45,playerX+side*48))}px`;
   this.serveBubble.style.top=`${Math.max(48,Math.min(this.host.clientHeight-20,(-point.y*.5+.5)*this.host.clientHeight))}px`;
  }
  for(const p of state.players){
   const mesh=this.players.get(p.id)!;mesh.position.set(p.position.x,p.position.y,p.position.z);mesh.rotation.y=p.facing;setAthleteHandedness(mesh,p.handedness);
   const previous=this.motion.get(p.id),step=previous?Math.hypot(p.position.x-previous.x,p.position.z-previous.z):0;
   const advanced=!!previous&&state.simulationTime>previous.time;
   const distance=previous&&state.simulationTime>=previous.time?previous.distance+(advanced&&step<1?step:0):0;
   // Retain the last movement flag during a pause for a frozen, reproducible pose.
   const moving=advanced?step>.0001&&step<1:previous?.time===state.simulationTime&&!!mesh.userData.moving;
   mesh.userData.moving=state.simulationTime===0?false:moving;
   const pose=athletePose(p,state,shot,distance,mesh.userData.moving);animateAthlete(mesh,pose);
   if(p.id==='you'){const pulse=this.reducedMotion.matches?1:1+Math.sin(time*2.6)*.035;mesh.getObjectByName('ground-ring')?.scale.setScalar(pulse);const halo=mesh.getObjectByName('selection-halo') as THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>;halo.material.opacity=this.reducedMotion.matches?.13:.13+Math.sin(time*2.6)*.035;}
   this.motion.set(p.id,{x:p.position.x,z:p.position.z,distance,time:state.simulationTime});
   this.labels.get(p.id)!.dataset.reaction=pose.reaction??'';
   const projected=new THREE.Vector3(p.position.x,1.8,p.position.z).project(this.camera);const label=this.labels.get(p.id)!;const thinking=this.nextHitter?this.nextHitter===p.id:state.phase==='decision'&&state.currentHitter===p.id;if(thinking&&!label.classList.contains('is-thinking')){label.classList.add('is-thinking');label.setAttribute('aria-label',`View ${label.dataset.name} skills · currently thinking`);label.innerHTML='<i></i><i></i><i></i>'}else if(!thinking&&label.classList.contains('is-thinking')){label.classList.remove('is-thinking');label.setAttribute('aria-label',`View ${label.dataset.name} skills`);label.textContent=label.dataset.name!}label.style.left=`${(projected.x*.5+.5)*this.host.clientWidth}px`;label.style.top=`${(-projected.y*.5+.5)*this.host.clientHeight}px`;
  }
  const next=state.players.find(p=>p.id===this.nextHitter);this.turnArrow.hidden=!next;
  if(next){const point=new THREE.Vector3(next.position.x,1.8,next.position.z).project(this.camera);this.turnArrow.hidden=point.z < -1||point.z > 1;this.turnArrow.style.left=`${(point.x*.5+.5)*this.host.clientWidth}px`;this.turnArrow.style.top=`${(-point.y*.5+.5)*this.host.clientHeight-25}px`;this.turnArrow.setAttribute('aria-label',`${this.labels.get(next.id)?.dataset.name??next.id} hits next`);}
  const spin=displayShot.intent.spin,strength={light:1,medium:1.8,strong:3}[spin?.strength??'medium'];
  const verticalRate=spin?.vertical==='topspin'?7*strength:spin?.vertical==='slice'?-5*strength:3.2,sideRate=spin?.side==='left'?-6*strength:spin?.side==='right'?6*strength:2.1;
  this.ball.position.set(state.ball.position.x,state.ball.position.y,state.ball.position.z);this.ballHalo.position.copy(this.ball.position);this.ballHalo.scale.setScalar(1);this.ball.rotation.x=state.simulationTime*verticalRate;this.ball.rotation.z=state.simulationTime*sideRate;this.shadow.position.set(state.ball.position.x,.056,state.ball.position.z);const shadowScale=1+state.ball.position.y*.22;this.shadow.scale.setScalar(shadowScale);(this.shadow.material as THREE.MeshBasicMaterial).opacity=Math.max(.12,.45-state.ball.position.y*.065);
  if(this.lastShot!==displayShot){this.lastShot=displayShot;const points=displayShot.legs.flatMap(leg=>Array.from({length:41},(_,i)=>{const p=sampleLeg(leg,i/40);return new THREE.Vector3(p.x,p.y,p.z)}));const geometry=new THREE.BufferGeometry().setFromPoints(points);this.trail.geometry.dispose();this.trail.geometry=geometry;this.trailDots.geometry=geometry;this.trail.computeLineDistances();
   const end=points.at(-1),previous=end?points.slice(0,-1).reverse().find(point=>point.distanceToSquared(end)>1e-8):undefined;
   this.trajectoryArrow.userData.hasDirection=!!previous;
   if(end&&previous){this.trajectoryArrow.position.copy(end);this.trajectoryArrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.clone().sub(previous).normalize())}
  }
  const opponentShot=state.players.find(player=>player.id===displayShot.actor)?.team!==this.viewTeam;
  (this.trail.material as THREE.LineDashedMaterial).color.set(opponentShot?'#FF4F63':'#DFFF32');const dots=this.trailDots.material as THREE.PointsMaterial;dots.color.set(opponentShot?'#FF4F63':'#DFFF32');dots.size=opponentShot?3.6:2.4;
  const opponentThinking=!this.retainedTrajectory&&state.phase==='decision'&&state.possession!==this.viewTeam;
  const showingDecisionPath=!!this.previewShot||!!retainedOpponentShot;
  this.trail.visible=this.guides&&!opponentThinking&&(state.phase==='flight'||showingDecisionPath);this.trailDots.visible=this.trail.visible;const destination=this.selectedTarget?{...this.selectedTarget,y:.08}:displayShot.aimPoint;this.target.rotation.x=destination.y>.1?0:-Math.PI/2;this.target.position.set(destination.x,Math.max(.058,destination.y),destination.z);this.target.visible=!!this.selectedTarget||(this.guides&&state.phase==='decision'&&!!this.previewShot);
  if(!this.customizedView){const base=this.cameraPose().look,tracking=state.phase==='flight'?new THREE.Vector3(THREE.MathUtils.clamp(state.ball.position.x*.045,-.24,.24),0,THREE.MathUtils.clamp(state.ball.position.z*.025,-.3,.3)):new THREE.Vector3();const desired=base.add(tracking),delta=desired.clone().sub(this.controls.target).multiplyScalar(cameraBlend(state.paused?0:renderDt,this.reducedMotion.matches));this.controls.target.add(delta);this.camera.position.add(delta)}
  this.controls.update();
  this.updateOverlayFraming();
  this.trajectoryArrow.visible=this.trail.visible&&!!this.trajectoryArrow.userData.hasDirection;
  this.trajectoryArrow.material.color.copy((this.trail.material as THREE.LineDashedMaterial).color);
  const arrowSize=THREE.MathUtils.clamp(16*2*Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2))*this.camera.position.distanceTo(this.trajectoryArrow.position)/(Math.max(1,this.host.clientHeight)*this.camera.zoom),.3,1.1);
  this.trajectoryArrow.scale.setScalar(arrowSize);
  const ballScale=1.8*ballDisplayScale(this.camera.position.distanceTo(this.ball.position),this.host.clientHeight,this.camera.fov,this.camera.zoom);
  this.ball.scale.setScalar(ballScale);this.ball.position.y=Math.max(this.ball.position.y,.058+.092*ballScale);this.ballHalo.position.copy(this.ball.position);this.ballHalo.scale.setScalar(ballScale);
  const ballScreen=this.ballScreenPosition.copy(this.ball.position).project(this.camera);
  this.pausedBallMarker.hidden=!(state.paused||state.phase==='decision')||ballScreen.z < -1||ballScreen.z > 1;
  if(!this.pausedBallMarker.hidden){
   this.pausedBallMarker.style.left=`${(ballScreen.x+1)*this.host.clientWidth/2}px`;
   this.pausedBallMarker.style.top=`${(1-ballScreen.y)*this.host.clientHeight/2}px`;
  }
  const height=this.heightGuide.geometry.attributes.position as THREE.BufferAttribute;
  height.setXYZ(0,this.ball.position.x,.062,this.ball.position.z);height.setXYZ(1,this.ball.position.x,this.ball.position.y,this.ball.position.z);height.needsUpdate=true;this.heightGuide.geometry.computeBoundingSphere();
  this.heightGuide.visible=this.guides&&state.phase==='flight'&&state.ball.position.y>.3;
  const streak=this.speedStreak.geometry.attributes.position as THREE.BufferAttribute;
  const velocity=state.ball.velocity;const speed=Math.hypot(velocity.x,velocity.y,velocity.z),duration=Math.min(.035,.5/Math.max(1,speed));
  streak.setXYZ(0,this.ball.position.x,this.ball.position.y,this.ball.position.z);streak.setXYZ(1,this.ball.position.x-velocity.x*duration,Math.max(.06,this.ball.position.y-velocity.y*duration),this.ball.position.z-velocity.z*duration);streak.needsUpdate=true;this.speedStreak.geometry.computeBoundingSphere();
  this.speedStreak.visible=this.guides&&state.phase==='flight'&&speed>7;
  const bounce=[...state.rallyHistory].reverse().find(event=>event.type==='bounce');
  const pulse=bounce?bouncePulse(state.simulationTime-bounce.time):null;
  this.bounceRing.visible=!!pulse;
  if(pulse&&bounce?.type==='bounce'){this.bounceRing.position.set(bounce.position.x,.065,bounce.position.z);this.bounceRing.scale.setScalar(pulse.radius);this.bounceRing.material.opacity=pulse.opacity}
  if(this.location==='forest')this.trees.update(this.camera,this.ball.position,[...this.players.values()].map(player=>player.position.clone().add(new THREE.Vector3(0,1,0))));
  else (this.location==='arizona'?this.arizona:this.venice)?.update(this.camera,[this.ball.position,...[...this.players.values()].map(player=>player.position.clone().add(new THREE.Vector3(0,1,0))),...[-1,1].flatMap(x=>[-1,1].map(z=>new THREE.Vector3(x*COURT.width/2,0,z*COURT.length/2)))]);this.renderer.render(this.scene,this.camera);
 }
}
