import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createAthlete,disposeAthlete,setAthleteHandedness,poseAthleteForPortrait} from './athlete';
import {DEFAULT_APPEARANCE,type Appearance,type DesignedPlayer} from './player-design';
function light(scene:THREE.Scene){scene.add(new THREE.HemisphereLight('#fff6e4','#788c79',2.5));const sun=new THREE.DirectionalLight('#fff0d9',3);sun.position.set(-3,5,-4);scene.add(sun)}
export class AvatarPreview {
 private scene=new THREE.Scene();private camera=new THREE.PerspectiveCamera(30,1,.1,20);private renderer:THREE.WebGLRenderer;private controls:OrbitControls;private avatar:THREE.Group|null=null;
 constructor(private host:HTMLElement){
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  this.renderer.domElement.setAttribute('aria-label','Your player in 3D. Drag to rotate or use the rotation slider.');this.renderer.domElement.setAttribute('role','img');host.append(this.renderer.domElement);
  this.camera.position.set(-.7,1.25,-3.7);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,.98,0);this.controls.enablePan=false;this.controls.enableZoom=false;this.controls.minPolarAngle=.65;this.controls.maxPolarAngle=1.6;this.controls.update();this.controls.addEventListener('change',()=>this.draw());light(this.scene);
  const ground=new THREE.Mesh(new THREE.CircleGeometry(.57,64),new THREE.MeshBasicMaterial({color:'#8e9c8b',transparent:true,opacity:.14,depthWrite:false}));ground.rotation.x=-Math.PI/2;ground.scale.set(1.15,.6,1);ground.position.y=.002;this.scene.add(ground);
  new ResizeObserver(()=>this.resize()).observe(host);
 }
 setPlayer(player:DesignedPlayer){if(this.avatar){this.scene.remove(this.avatar);disposeAthlete(this.avatar)}this.avatar=createAthlete('you',player.appearance.jersey,player.appearance);setAthleteHandedness(this.avatar,player.handedness);poseAthleteForPortrait(this.avatar);this.scene.add(this.avatar);this.resize()}
 rotate(degrees:number){const angle=(degrees-11)*Math.PI/180;this.camera.position.set(Math.sin(angle)*3.7,1.25,-Math.cos(angle)*3.7);this.controls.update();this.draw()}
 resize(){const {clientWidth:w,clientHeight:h}=this.host;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.fov=w/h<.65?36:30;this.camera.updateProjectionMatrix();this.draw()}
 private draw(){this.renderer.render(this.scene,this.camera)}
}
/** One off-screen context renders real model thumbnails, shared by all option tiles. */
export class AvatarThumbnails {
 private renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});private scene=new THREE.Scene();private camera=new THREE.PerspectiveCamera(32,1,.01,10);private cache=new Map<string,string>();
 constructor(){this.renderer.setSize(128,128);this.renderer.setPixelRatio(1);this.renderer.toneMapping=THREE.ACESFilmicToneMapping;light(this.scene)}
 get(appearance:Appearance,category:string){
  const key=JSON.stringify(appearance)+category;if(this.cache.has(key))return this.cache.get(key)!;
  const avatar=createAthlete('you',appearance.jersey,appearance);poseAthleteForPortrait(avatar);this.scene.add(avatar);
  let y=1.59,z=-1.25,x=-.23,targetX=0;
  if(category==='full'){y=1;z=-3.8;x=-.45}
  if(category==='top'){y=1.1;z=-1.35}
  if(category==='bottom'){y=.68;z=-1.15}
  if(category==='shoes'){y=.13;z=-.8;x=-.12}
  if(category==='paddle'){y=.48;z=-1.25;x=.43;targetX=.43}
  if(category==='accessory'){y=.76;z=-.9;x=.28;targetX=.28}
  this.camera.position.set(x,y+.035,z);this.camera.lookAt(targetX,y,0);this.renderer.render(this.scene,this.camera);
  const url=this.renderer.domElement.toDataURL('image/png');this.scene.remove(avatar);disposeAthlete(avatar);this.cache.set(key,url);return url;
 }
}
export const LOOKS:{name:string;appearance:Appearance}[]=[
 {name:'Alex',appearance:{...DEFAULT_APPEARANCE,jersey:'#ece4ce',accent:'#315d58',shoes:'#315d58',paddle:'#315d58',hat:'backwards'}},
 {name:'Riley',appearance:{...DEFAULT_APPEARANCE,skin:'#e7af8c',hair:'#6d4436',hairStyle:'ponytail',hat:'none',jersey:'#b76564',accent:'#985251',shoes:'#985251',paddle:'#b76564',top:'tank',bottom:'skirt'}},
 {name:'Jordan',appearance:{...DEFAULT_APPEARANCE,skin:'#ad7553',hair:'#312a27',hairStyle:'curls',hat:'none',glasses:'sport',jersey:'#303d3e',accent:'#243c37',shoes:'#303d3e',top:'tank',bottom:'shorts'}}
];
