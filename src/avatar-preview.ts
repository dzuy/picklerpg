import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createAthlete,disposeAthlete,setAthleteHandedness,poseAthleteForPortrait,poseAthleteForRoster,animateRosterAthlete} from './athlete';
import {type Appearance,type DesignedPlayer} from './player-design';
function light(scene:THREE.Scene){scene.add(new THREE.HemisphereLight('#fff6e4','#788c79',2.5));const sun=new THREE.DirectionalLight('#fff0d9',3);sun.position.set(-3,5,-4);scene.add(sun)}
export class AvatarPreview {
 private scene=new THREE.Scene();private camera=new THREE.PerspectiveCamera(30,1,.1,20);private renderer:THREE.WebGLRenderer;private controls:OrbitControls;private avatar:THREE.Group|null=null;
 private observer:ResizeObserver;
 private motion=matchMedia('(prefers-reduced-motion: reduce)');
 private started=performance.now();
 private syncMotion=()=>{this.renderer.setAnimationLoop(this.animated&&!this.motion.matches?()=>{if(document.hidden||!this.host.getClientRects().length)return;if(this.avatar)animateRosterAthlete(this.avatar,(performance.now()-this.started)/1000);this.draw()}:null);if(this.avatar&&this.animated)poseAthleteForRoster(this.avatar);this.draw()};
 constructor(private host:HTMLElement,private animated=false,zoom=1,options:{allowZoom?:boolean;verticalOffset?:number}={}){
  this.camera.zoom=zoom;
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  this.renderer.domElement.setAttribute('aria-label','Your player in 3D. Drag to rotate.');this.renderer.domElement.setAttribute('role','img');host.append(this.renderer.domElement);
  this.camera.position.set(-.6,1.05,-3.2);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,.78,0);this.controls.enablePan=false;this.controls.enableZoom=false;this.controls.minPolarAngle=.65;this.controls.maxPolarAngle=1.6;this.controls.update();this.controls.addEventListener('change',()=>this.draw());light(this.scene);
  const ground=new THREE.Mesh(new THREE.CircleGeometry(.57,64),new THREE.MeshBasicMaterial({color:'#8e9c8b',transparent:true,opacity:.14,depthWrite:false}));ground.rotation.x=-Math.PI/2;ground.scale.set(1.15,.6,1);ground.position.y=.002;this.scene.add(ground);
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);
  if(animated){this.camera.position.set(-.55,.95,-3.9);this.controls.target.set(0,.75,0);this.controls.update();this.renderer.domElement.setAttribute('aria-label','Animated player in 3D. Drag to rotate.');this.motion.addEventListener('change',this.syncMotion);this.syncMotion();}
  if(options.verticalOffset){this.camera.position.y+=options.verticalOffset;this.controls.target.y+=options.verticalOffset;this.controls.update();}
  if(options.allowZoom){this.controls.enableZoom=true;this.controls.minDistance=2.4;this.controls.maxDistance=6;this.controls.zoomSpeed=.7;this.renderer.domElement.setAttribute('aria-label','Player in 3D. Drag to rotate. Pinch to zoom.');}
 }
 setPlayer(player:DesignedPlayer){if(this.avatar){this.scene.remove(this.avatar);disposeAthlete(this.avatar)}this.avatar=createAthlete('you',player.appearance.jersey,player.appearance);setAthleteHandedness(this.avatar,player.handedness);(this.animated?poseAthleteForRoster:poseAthleteForPortrait)(this.avatar);this.scene.add(this.avatar);this.resize()}
 dispose(){this.renderer.setAnimationLoop(null);this.motion.removeEventListener('change',this.syncMotion);this.observer.disconnect();this.controls.dispose();if(this.avatar){this.scene.remove(this.avatar);disposeAthlete(this.avatar)}this.scene.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();for(const material of Array.isArray(object.material)?object.material:[object.material])material.dispose()}});this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
 rotate(degrees:number){const angle=(degrees-11)*Math.PI/180;this.camera.position.set(Math.sin(angle)*3.2,1.05,-Math.cos(angle)*3.2);this.controls.update();this.draw()}
 resize(){const {clientWidth:w,clientHeight:h}=this.host;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.fov=w/h<.65?36:30;this.camera.updateProjectionMatrix();this.draw()}
 private draw(){this.renderer.render(this.scene,this.camera)}
}
/** One off-screen context renders real model thumbnails, shared by all option tiles. */
export class AvatarThumbnails {
 private renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});private scene=new THREE.Scene();private camera=new THREE.PerspectiveCamera(32,1,.01,10);private cache=new Map<string,string>();
 constructor(size=128){this.renderer.setSize(size,size);this.renderer.setPixelRatio(1);this.renderer.toneMapping=THREE.ACESFilmicToneMapping;light(this.scene)}
 get(appearance:Appearance,category:string,hand:'left'|'right'='right'){
  const key=JSON.stringify(appearance)+category+hand;if(this.cache.has(key))return this.cache.get(key)!;
  const avatar=createAthlete('you',appearance.jersey,appearance);(category==='roster'?poseAthleteForRoster:poseAthleteForPortrait)(avatar);setAthleteHandedness(avatar,hand);if(category.startsWith('hand-'))setAthleteHandedness(avatar,category==='hand-left'?'left':'right');this.scene.add(avatar);
  let y=1.145,z=-1.25,x=-.23,targetX=0;
  if(category==='roster'){y=.95;z=-3.2;x=-.25}
  if(category==='profile'){y=1.08;z=-2.15;x=-.38}
  if(category==='hairStyle'||category==='hat'){y=1.23;z=-1.8;x=-.3}
  if(category==='full'||category==='presentation'||category.startsWith('hand-')){y=.78;z=-3.2;x=-.4}
  if(category==='facialHair'){y=1.03;z=-1.25;x=-.12}
  if(category==='top'){y=.64;z=-1.15}
  if(category==='bottom'){y=.40;z=-1.0}
  if(category==='shoes'||category==='shoeStyle'){y=.12;z=.045;x=-.9}
  if(category==='paddle'||category==='paddleShape'){y=.29;z=-1.25;x=.36;targetX=.36}
  if(category==='accessory'){y=.46;z=-.9;x=.28;targetX=.28}
  this.camera.position.set(x,y+.035,z);this.camera.lookAt(targetX,y,category==='shoes'||category==='shoeStyle'?.045:0);
  const watch=category==='accessory'&&appearance.accessory==='watch'?avatar.getObjectByName('option-watch'):null;
  if(watch){avatar.updateMatrixWorld(true);const center=new THREE.Box3().setFromObject(watch).getCenter(new THREE.Vector3());this.camera.position.set(center.x-.08,center.y+.04,center.z-.52);this.camera.lookAt(center)}
  this.renderer.render(this.scene,this.camera);
  const url=this.renderer.domElement.toDataURL('image/png');this.scene.remove(avatar);disposeAthlete(avatar);this.cache.set(key,url);return url;
 }
}
export {LOOKS} from './player-looks';
