import * as THREE from 'three';
import {COURT,type ShotIntent,type PointResult,type PlayerState,type Team} from './engine/model';
export function atpWinner(intent:ShotIntent,result:PointResult|null|undefined,players:PlayerState[]):Team|null{
 const team=players.find(p=>p.id===intent.actor)?.team;
 return intent.technique==='atp'&&result&&team===result.winner&&['winner','unreturned-attack','double-bounce','missed-swing','failed-return'].includes(result.reason)?team!:null;
}
/** Presentation only: never changes point resolution or athlete simulation positions. */
export class AtpCelebration {
 private started=-Infinity;
 team:Team|null=null;
 private group=new THREE.Group();
 private sparks:THREE.Points;
 private rings:THREE.Mesh[]=[];
 private light=new THREE.PointLight(0xffcf45,0,25);
 private title:HTMLDivElement;
 private reduced=matchMedia('(prefers-reduced-motion: reduce)');
 constructor(scene:THREE.Scene,host:HTMLElement,className=''){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(180*3),3));
  const colors=new Float32Array(180*3),palette=[0xffdf52,0x5fefff,0xff61b7,0xadff58];
  for(let i=0;i<180;i++){const c=new THREE.Color(palette[Math.floor(i/45)]);colors.set([c.r,c.g,c.b],i*3)}
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  this.sparks=new THREE.Points(geometry,new THREE.PointsMaterial({size:.14,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));this.group.add(this.sparks);
  for(let i=0;i<2;i++){
   const ring=new THREE.Mesh(new THREE.PlaneGeometry(COURT.width+.5,COURT.length/2),new THREE.MeshBasicMaterial({color:palette[i],transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));
   ring.rotation.x=-Math.PI/2;ring.position.set(0,.018,(i?1:-1)*COURT.length/4);this.group.add(ring);this.rings.push(ring);
  }
  this.light.position.set(0,4,0);this.group.add(this.light);this.group.visible=false;scene.add(this.group);
  this.title=document.createElement('div');this.title.className=`atp-celebration ${className}`;this.title.hidden=true;this.title.setAttribute('role','status');this.title.innerHTML='<span>AROUND THE POST</span><strong>ATP WINNER!</strong><small>That’s highlight-reel material.</small>';host.append(this.title);
 }
 stop(){this.team=null;this.started=-Infinity;this.title.hidden=true;this.group.visible=false;}
 start(team:Team,time:number,copy={eyebrow:'AROUND THE POST',title:'ATP WINNER!',detail:'That’s highlight-reel material.'}){this.team=team;this.started=time;this.title.querySelector('span')!.textContent=copy.eyebrow;this.title.querySelector('strong')!.textContent=copy.title;this.title.querySelector('small')!.textContent=copy.detail;this.title.hidden=false;}
 update(time:number){
  const age=time-this.started,active=age>=0&&age<2.8;
  this.title.hidden=!active;this.group.visible=active&&!this.reduced.matches;
  if(!active){this.team=null;return 0;}
  if(this.reduced.matches)return 0;
  const fade=Math.min(1,(2.8-age)/.5),pulse=(1+Math.sin(age*Math.PI*3))/2;
  this.rings.forEach((ring,i)=>{(ring.material as THREE.MeshBasicMaterial).opacity=(.05+.18*(i?1-pulse:pulse))*fade});
  this.light.intensity=(3+5*pulse)*fade;
  const positions=this.sparks.geometry.attributes.position as THREE.BufferAttribute;
  for(let i=0;i<180;i++){
   const burst=Math.floor(i/45),t=age-burst*.32,theta=i*2.39996,vertical=((i*17)%45)/22-1,speed=1.8+(i%7)*.22;
   const r=Math.sqrt(1-vertical*vertical)*speed;
   positions.setXYZ(i,(burst%2?1:-1)*3+Math.cos(theta)*r*Math.max(0,t),t<0?-10:2.7+vertical*speed*t-1.1*t*t,(burst<2?-1:1)*3+Math.sin(theta)*r*Math.max(0,t));
  }
  positions.needsUpdate=true;(this.sparks.material as THREE.PointsMaterial).opacity=fade;
  return Math.abs(Math.sin(age*Math.PI*3))*.48*fade;
 }
}
