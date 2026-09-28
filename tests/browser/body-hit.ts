import {ActionBurst} from '../../src/action-burst';
import '../../src/action-burst.css';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {preloadAthletes,createAthlete,animateAthlete} from '../../src/athlete';
import {BodyHitAngel} from '../../src/body-hit-angel';
import {bodyHitPose,BODY_HIT_REACTION_SECONDS} from '../../src/body-hit-reaction';
import type {AthletePose} from '../../src/athlete-motion';
import {DEFAULT_APPEARANCE} from '../../src/player-design';
await preloadAthletes();
const host=document.querySelector('#court')!,scene=new THREE.Scene();scene.background=new THREE.Color('#edf4f5');scene.fog=new THREE.Fog('#edf4f5',15,35);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;host.append(renderer.domElement);
const camera=new THREE.PerspectiveCamera(38,1,.1,60);camera.position.set(-5,3.7,-7);const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.9,.4);controls.maxPolarAngle=Math.PI*.49;controls.minDistance=3;controls.maxDistance=18;controls.update();
scene.add(new THREE.HemisphereLight('#f7fcff','#669b9e',3));const sun=new THREE.DirectionalLight('#fff2d8',3);sun.position.set(-4,9,-3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({color:'#81a49c',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.015;floor.receiveShadow=true;scene.add(floor);
const court=new THREE.Mesh(new THREE.PlaneGeometry(6.1,13.4),new THREE.MeshStandardMaterial({color:'#2c8b92',roughness:1}));court.rotation.x=-Math.PI/2;court.receiveShadow=true;scene.add(court);
for(const x of [-3.02,0,3.02]){const line=new THREE.Mesh(new THREE.PlaneGeometry(.035,13.3),new THREE.MeshBasicMaterial({color:'#eaf9ee'}));line.rotation.x=-Math.PI/2;line.position.set(x,.005,0);scene.add(line)}
for(const z of [-6.65,0,6.65]){const line=new THREE.Mesh(new THREE.PlaneGeometry(6.08,.035),new THREE.MeshBasicMaterial({color:'#eaf9ee'}));line.rotation.x=-Math.PI/2;line.position.set(0,.006,z);scene.add(line)}
const player=createAthlete('you','#ee8793',{...DEFAULT_APPEARANCE,jersey:'#ee8793',hat:'none',hairStyle:'high-fade'});scene.add(player);
const ball=new THREE.Mesh(new THREE.SphereGeometry(.075,20,12),new THREE.MeshStandardMaterial({color:'#dfff40',roughness:.7}));ball.castShadow=true;scene.add(ball);
const burst=new ActionBurst(host as HTMLElement);
const effect=new BodyHitAngel();let age=0,playing=true,last=performance.now(),hold=0;
const timeline=document.querySelector<HTMLInputElement>('#timeline')!,pause=document.querySelector<HTMLButtonElement>('#pause')!,speed=document.querySelector<HTMLSelectElement>('#speed')!,loop=document.querySelector<HTMLInputElement>('#loop')!,reduced=document.querySelector<HTMLInputElement>('#reduced')!;
function play(value:boolean){playing=value;pause.textContent=value?'Pause':'Play'}
document.querySelector<HTMLButtonElement>('#replay')!.onclick=()=>{age=0;hold=0;effect.clear();play(true)};pause.onclick=()=>play(!playing);timeline.oninput=()=>{age=Number(timeline.value);hold=0;play(false)};
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();
function frame(now:number){const dt=Math.min(.05,(now-last)/1000);last=now;if(playing){age=Math.min(BODY_HIT_REACTION_SECONDS,age+dt*Number(speed.value));if(age>=BODY_HIT_REACTION_SECONDS){hold+=dt;if(loop.checked&&hold>.9){age=0;hold=0;effect.clear()}else if(!loop.checked)play(false)}}
const pose:AthletePose={style:'ready',reaction:null,armX:0,armY:0,armZ:0,offArm:0,elbow:0,wrist:0,torso:0,lean:0,crouch:0,stride:0,celebrate:false};bodyHitPose(pose,Math.min(age,4.799),false,reduced.checked);animateAthlete(player,pose,0);effect.apply(player,age,reduced.checked);
ball.visible=age<1;ball.position.set(.06,.8+Math.sin(Math.min(age,1)*Math.PI)*.3,-.28-age*2.4);
const impact=new THREE.Vector3(0,1.8,0).project(camera);burst.render({text:'BAGGED!',age,x:(impact.x*.5+.5)*innerWidth,y:(-.5*impact.y+.5)*innerHeight,reduced:reduced.checked,visible:impact.z>=-1&&impact.z<=1});
timeline.value=String(age);document.querySelector('#time')!.textContent=`${age.toFixed(2)} / 4.80 s`;document.querySelector('#phase')!.textContent=age<.65?'01 · Dramatic flop':age<1.5?'02 · Soul separation':age<3.8?'03 · Angel ascending':'04 · Gone to heaven';renderer.render(scene,camera);requestAnimationFrame(frame)}requestAnimationFrame(frame);
