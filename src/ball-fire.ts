import * as THREE from 'three';
import {sampleLeg} from './engine/rally-engine';
import type {GameState,RallyShot} from './engine/model';

export const FIREBALL_POWER=.9;
export function isFireballShot(state:Pick<GameState,'phase'>,shot:Pick<RallyShot,'intent'>){
 const power=shot.intent.power;
 return state.phase==='flight'&&typeof power==='number'&&Number.isFinite(power)&&power>=FIREBALL_POWER;
}
/** Sample the executed shot, including bounces. No accumulated particle state means
 * pauses, scrubbing, and network replay produce the same smoke trail. */
export function fireballTrailPoint(shot:RallyShot,time:number){
 if(time<0||!shot.legs.length)return null;
 for(const leg of shot.legs){if(time<=leg.duration)return sampleLeg(leg,time/leg.duration);time-=leg.duration;}
 return {...shot.legs.at(-1)!.to};
}
function softParticle(){
 const size=32,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const radius=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2));
  const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(255*Math.pow(Math.max(0,1-radius*radius),2));
 }
 const texture=new THREE.DataTexture(data,size,size);texture.needsUpdate=true;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;return texture;
}
export class BallFire {
 readonly group=new THREE.Group();
 private texture=softParticle();
 private core:THREE.Mesh<THREE.SphereGeometry,THREE.MeshBasicMaterial>;
 private flames:THREE.Sprite[]=[];
 private smoke:THREE.Sprite[]=[];
 constructor(){
  this.group.name='power-fireball';this.group.visible=false;
  this.core=new THREE.Mesh(new THREE.SphereGeometry(.095,16,12),new THREE.MeshBasicMaterial({color:'#fff3a1',toneMapped:false}));this.group.add(this.core);
  for(let i=0;i<12;i++)this.flames.push(this.particle(i<2?'#ffe978':i<5?'#ffac19':'#fa4b0b'));
  for(let i=0;i<28;i++)this.smoke.push(this.particle('#79716b'));
 }
 private particle(color:string){
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:this.texture,color,transparent:true,depthWrite:false,toneMapped:false,blending:THREE.NormalBlending}));
  this.group.add(sprite);return sprite;
 }
 update(state:GameState,shot:RallyShot,position:THREE.Vector3,scale:number,reducedMotion=false){
  const active=isFireballShot(state,shot);this.group.visible=active;if(!active)return false;
  const elapsed=shot.legs.slice(0,state.legIndex).reduce((sum,leg)=>sum+leg.duration,0)+state.elapsed;
  this.core.position.copy(position);this.core.scale.setScalar(scale);
  // Simulation time drives the flame shape, so paused play is completely still.
  const clock=reducedMotion?0:elapsed;
  for(let i=0;i<this.flames.length;i++){
   const flame=this.flames[i],age=i*.012,point=fireballTrailPoint(shot,elapsed-age);
   flame.visible=!!point;if(!point)continue;
   const swirl=clock*24+i*2.4,offset=(i/12)*.065*scale;
   flame.position.set(point.x+Math.sin(swirl)*offset,Math.max(position.y-(state.ball.position.y-point.y),.08)+Math.cos(swirl*.8)*offset,point.z);
   if(i===0)flame.position.copy(position);
   const size=(.48-i*.021)*scale*(1+(reducedMotion?0:Math.sin(swirl)*.08));
   flame.scale.set(size,size*(1+i*.055),1);flame.material.rotation=swirl*.1;
   flame.material.opacity=(1-i/18)*.95;
  }
  for(let i=0;i<this.smoke.length;i++){
   const puff=this.smoke[i],age=.09+i*.019,point=fireballTrailPoint(shot,elapsed-age);
   puff.visible=!reducedMotion&&!!point;if(!puff.visible||!point)continue;
   // Puffs expand, rise, and fade behind the flame without obscuring the landing.
   const life=age/.65,seed=(elapsed-age)*17;
   puff.position.set(point.x+Math.sin(seed)*life*.12,Math.max(.12,point.y)+life*.5,point.z+Math.cos(seed*.7)*life*.10);
   const size=(.15+life*.55)*scale;puff.scale.set(size,size,1);puff.material.rotation=seed*.12;
   puff.material.opacity=.48*(1-life);puff.material.color.setRGB(.34+life*.13,.30+life*.13,.28+life*.13);
  }
  return true;
 }
 dispose(){this.core.geometry.dispose();this.core.material.dispose();for(const sprite of [...this.flames,...this.smoke])sprite.material.dispose();this.texture.dispose();}
}
