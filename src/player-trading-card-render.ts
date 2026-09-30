import * as THREE from 'three';
import {preloadAthletes,createAthlete,disposeAthlete,setAthleteHandedness,animateRosterAthlete,animateAthlete} from './athlete';
import type {DesignedPlayer} from './player-design';
import {PLAYER_CARD_SIZE,playerCardDetails} from './player-trading-card';

export type CardFinish='pink'|'cyan';
export type CardPose='drive'|'ready';
function loadImage(src:string):Promise<HTMLImageElement>{return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Card artwork could not load. Please try again.'));img.src=src;});}

/** Uses the actual equipped model; never substitutes a generic player portrait. */
function renderAction(player:DesignedPlayer,pose:CardPose){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
 let athlete:THREE.Group|undefined;
 try{
  renderer.setSize(900,760);renderer.setPixelRatio(1);renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#fff6e4','#788c79',2.5));
  const key=new THREE.DirectionalLight('#fff0d9',3);key.position.set(-3,5,-4);scene.add(key);
  athlete=createAthlete('you',player.appearance.jersey,player.appearance);setAthleteHandedness(athlete,player.handedness);animateRosterAthlete(athlete,0);
  if(pose==='drive')animateAthlete(athlete,{style:'forehand',reaction:null,armX:-1.1,armY:.25,armZ:-.65,elbow:-.3,wrist:.25,offArm:-.65,offArmZ:-.45,offElbow:-.35,torso:.4,lean:-.16,crouch:.08,stride:.65,celebrate:false},0);
  scene.add(athlete);
  athlete.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(athlete),center=bounds.getCenter(new THREE.Vector3());
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,30);
  camera.position.copy(center).add(new THREE.Vector3(player.handedness==='left'?.65:-.65,.12,-4));camera.lookAt(center);camera.updateMatrixWorld(true);
  // Fit every equipped accessory in camera space, including wide hats and wings.
  const projected=new THREE.Box3();
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])projected.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
  const size=projected.getSize(new THREE.Vector3()),aspect=900/760,half=Math.max(size.y,size.x/aspect)*.55;
  camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();
  renderer.render(scene,camera);
  const copy=document.createElement('canvas');copy.width=900;copy.height=760;copy.getContext('2d')!.drawImage(renderer.domElement,0,0);return copy;
 }finally{if(athlete)disposeAthlete(athlete);renderer.dispose();renderer.forceContextLoss();}
}

/** Find the visible art so transparent logo/model margins do not shrink the hero. */
function visibleBounds(source:HTMLImageElement|HTMLCanvasElement){
 const scratch=document.createElement('canvas');scratch.width=source.width;scratch.height=source.height;
 const ctx=scratch.getContext('2d')!;ctx.drawImage(source,0,0);
 const pixels=ctx.getImageData(0,0,scratch.width,scratch.height).data;
 let left=scratch.width,top=scratch.height,right=0,bottom=0;
 for(let y=0;y<scratch.height;y++)for(let x=0;x<scratch.width;x++)if(pixels[(y*scratch.width+x)*4+3]>20){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 return {x:left,y:top,w:right-left+1,h:bottom-top+1};
}

export async function renderPlayerTradingCard(player:DesignedPlayer,finish:CardFinish='pink',pose:CardPose='drive'):Promise<Blob>{
 await Promise.all([document.fonts.ready,preloadAthletes()]);
 const [logo,backdrop,ball]=await Promise.all([loadImage('/assets/picklebash-select/brand/picklebash-logo.png'),loadImage('/assets/player-cards/tropical-court-v2.png'),loadImage('/assets/player-cards/pickleball.png')]);
 const action=renderAction(player,pose),details=playerCardDetails(player);
 const canvas=document.createElement('canvas');canvas.width=PLAYER_CARD_SIZE.width;canvas.height=PLAYER_CARD_SIZE.height;
 const c=canvas.getContext('2d');if(!c)throw new Error('Card images are unavailable in this browser.');
 const styles=getComputedStyle(document.documentElement),color=(token:string)=>styles.getPropertyValue(token).trim();
 const ink=color('--pb-collectible-ink'),navy=color('--pb-collectible-navy'),white=color('--pb-collectible-white'),pink=color('--pb-collectible-pink'),cyan=color('--pb-collectible-cyan'),lime=color('--pb-collectible-lime');
 const accent=finish==='pink'?pink:cyan;
 const gradient=(x:number,y:number,x2:number,y2:number,stops:string[])=>{const g=c.createLinearGradient(x,y,x2,y2);stops.forEach((v,i)=>g.addColorStop(i/(stops.length-1),v));return g;};
 const round=(x:number,y:number,w:number,h:number,r:number,fill:string|CanvasGradient,stroke?:string,line=3)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}};
 const panel=(x:number,y:number,w:number,h:number,cut:number,fill:string|CanvasGradient,stroke?:string,line=3)=>{c.beginPath();c.moveTo(x+cut,y);c.lineTo(x+w-cut,y);c.lineTo(x+w,y+cut);c.lineTo(x+w,y+h-cut);c.lineTo(x+w-cut,y+h);c.lineTo(x+cut,y+h);c.lineTo(x,y+h-cut);c.lineTo(x,y+cut);c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}};
 const text=(value:string,x:number,y:number,size:number,fill=white,maxWidth?:number,italic=false,align:CanvasTextAlign='left')=>{c.save();c.textAlign=align;const font=()=>`${italic?'italic ':''}900 ${size}px "Manrope", "Arial", sans-serif`;c.font=font();if(maxWidth)while(c.measureText(value).width>maxWidth&&size>12){size--;c.font=font();}c.fillStyle=fill;c.fillText(value,x,y);c.restore();};
 const glow=(tint:string,blur:number,draw:()=>void)=>{c.save();c.shadowColor=tint;c.shadowBlur=blur;draw();c.restore();};
 const star=(x:number,y:number,r:number,tint=white)=>{c.save();c.translate(x,y);c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,rad=i%2?r*.2:r;c.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);}c.closePath();c.fillStyle=tint;c.fill();c.restore();};
 const crown=(x:number,y:number,size:number)=>{c.save();c.translate(x,y);c.rotate(-.22);c.scale(size/60,size/60);c.strokeStyle=lime;c.lineWidth=6;c.lineJoin='round';c.beginPath();c.moveTo(3,12);c.lineTo(20,29);c.lineTo(30,0);c.lineTo(41,28);c.lineTo(58,12);c.lineTo(50,48);c.lineTo(11,48);c.closePath();c.stroke();c.beginPath();c.moveTo(12,56);c.lineTo(51,56);c.stroke();c.restore();};
 const contained=(source:HTMLImageElement|HTMLCanvasElement,x:number,y:number,w:number,h:number,outline=false)=>{const b=visibleBounds(source),scale=Math.min(w/b.w,h/b.h),dw=b.w*scale,dh=b.h*scale,dx=x+(w-dw)/2,dy=y+h-dh;if(outline){c.save();c.shadowColor=white;c.shadowBlur=12;for(let i=0;i<3;i++)c.drawImage(source,b.x,b.y,b.w,b.h,dx,dy,dw,dh);c.restore();}c.drawImage(source,b.x,b.y,b.w,b.h,dx,dy,dw,dh);};
 // Foil frame: hot-pink enamel, bright silver bevel, then a deep navy inner keyline.
 c.fillStyle=ink;c.fillRect(0,0,1080,1350);
 for(let y=0;y<1350;y+=19)for(let x=0;x<1080;x+=19){c.globalAlpha=.45;c.fillStyle=cyan;c.beginPath();c.arc(x,y,3.5,0,Math.PI*2);c.fill();}c.globalAlpha=1;
 glow(accent,24,()=>round(18,18,1044,1314,56,gradient(0,0,1080,1350,[white,accent,accent,white,accent]),white,3));
 round(34,34,1012,1282,44,navy,ink,5);
 round(46,46,988,1258,34,gradient(0,0,1080,1350,[white,cyan,white,white]),white,3);
 round(57,57,966,1236,27,ink,navy,3);
 // This illustration is fixed artwork. Player identity and every displayed number are live.
 c.save();c.beginPath();c.roundRect(57,57,966,1055,27);c.clip();c.drawImage(backdrop,57,57,966,1030);
 c.fillStyle=gradient(0,700,0,1090,['#00182b00',ink]);c.fillRect(57,700,966,390);
 // A tapered comet ribbon ends at the ball; translucent tails fade into the court.
 c.save();c.lineCap='round';
 const ribbon=(tailX:number,tailY:number,tipX:number,tipY:number,width:number,tint:string,opacity:number)=>{
  const fade=c.createLinearGradient(tailX,tailY,tipX,tipY);fade.addColorStop(0,tint+'00');fade.addColorStop(.3,tint+'30');fade.addColorStop(1,tint);
  c.globalAlpha=opacity;c.fillStyle=fade;c.beginPath();c.moveTo(tailX,tailY);
  c.bezierCurveTo(tailX+140,tailY-12,tipX-95,tipY-width,tipX,tipY-width*.3);
  c.quadraticCurveTo(tipX+13,tipY,tipX,tipY+width*.3);
  c.bezierCurveTo(tipX-90,tipY+width,tailX+150,tailY+12,tailX,tailY);c.fill();
 };
 glow(pink,22,()=>ribbon(467,700,866,458,41,pink,.7));
 glow(cyan,15,()=>ribbon(524,689,872,468,24,cyan,.75));
 glow(white,9,()=>ribbon(537,665,870,455,13,white,.95));
 c.globalAlpha=1;
 // Broken speed flecks add energy without reading as parallel solid stripes.
 for(const [x,y,length,opacity] of [[663,583,31,.5],[737,507,24,.75],[785,548,18,.7],[587,639,15,.4]]){
  c.globalAlpha=opacity;c.strokeStyle=white;c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(x+length,y-length*.65);c.stroke();
 }
 c.restore();
 for(const [x,y,r] of [[149,456,26],[909,326,25],[816,666,17],[950,780,22],[230,829,16]])glow(cyan,12,()=>star(x,y,r));
 // Use the supplied transparent ball artwork, fitted to the same motion-trail endpoint.
 glow(lime,14,()=>contained(ball,829,381,122,122));
 // Large cutout fills the hero area; all hats, wings and equipment stay within its bounds.
 contained(action,134,223,780,680,true);
 c.restore();
 // Original logo; the rating badge is temporarily omitted from exported cards.
 contained(logo,70,68,400,224);
 // Lift the name and skills together to reserve a readable website footer.
 c.save();c.translate(0,-40);
 // Embossed lower nameplate, with readable contrast even over the busy court artwork.
 glow(pink,18,()=>panel(65,943,950,158,42,accent,white,4));
 panel(72,936,936,158,40,ink,cyan,8);panel(84,948,912,134,32,gradient(0,948,0,1082,[navy,ink]),white,2);
 c.save();c.beginPath();c.rect(87,952,906,126);c.clip();for(let x=92;x<995;x+=13)for(let y=956;y<1080;y+=13){if(x>204&&x<890)continue;c.globalAlpha=.25;c.fillStyle=cyan;c.save();c.translate(x,y);c.rotate(Math.PI/4);c.fillRect(-2.5,-2.5,5,5);c.restore();}c.restore();
 crown(109,980,52);glow(cyan,5,()=>text(details.name,576,1033,74,white,762,true,'center'));
 text('///  P L A Y E R   C O L L E C T I O N  /  0 1  ///',565,1066,16,cyan,760,false,'center');
 panel(63,1110,954,159,25,gradient(0,1110,0,1279,[navy,ink]),color('--pb-collectible-edge'),2);
 const colors=[pink,cyan,lime,color('--pb-collectible-purple'),color('--pb-collectible-mint')];
 // Vector icons avoid platform-specific emoji in the exported image.
 const icon=(index:number,x:number,y:number,tint:string)=>{c.save();c.translate(x,y);c.strokeStyle=tint;c.fillStyle=tint;c.lineWidth=3.5;c.lineJoin='round';c.lineCap='round';
  if(index===0){c.beginPath();c.moveTo(0,-19);c.bezierCurveTo(-2,-6,-19,-3,-16,11);c.bezierCurveTo(-13,28,14,28,17,11);c.bezierCurveTo(21,1,9,-4,11,-14);c.lineTo(3,0);c.closePath();c.fill();}
  if(index===1){for(const r of [16,9]){c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();}c.beginPath();c.moveTo(-23,0);c.lineTo(23,0);c.moveTo(0,-23);c.lineTo(0,23);c.stroke();}
  if(index===2){c.beginPath();c.moveTo(12,-25);c.lineTo(-16,4);c.lineTo(-2,4);c.lineTo(-9,26);c.lineTo(18,-7);c.lineTo(3,-7);c.closePath();c.fill();}
  if(index===3){c.beginPath();c.moveTo(-13,17);c.lineTo(-23,-1);c.quadraticCurveTo(-21,-7,-16,-1);c.lineTo(-10,6);c.lineTo(-12,-19);c.quadraticCurveTo(-8,-24,-5,-18);c.lineTo(-3,-3);c.lineTo(-3,-25);c.quadraticCurveTo(2,-29,4,-23);c.lineTo(5,-3);c.lineTo(7,-22);c.quadraticCurveTo(13,-24,13,-18);c.lineTo(12,0);c.lineTo(16,-14);c.quadraticCurveTo(22,-15,22,-9);c.lineTo(18,16);c.quadraticCurveTo(2,30,-13,17);c.closePath();c.stroke();}
  if(index===4){c.beginPath();c.moveTo(0,-23);c.lineTo(20,-13);c.lineTo(16,8);c.quadraticCurveTo(10,21,0,27);c.quadraticCurveTo(-10,21,-16,8);c.lineTo(-20,-13);c.closePath();c.stroke();c.beginPath();c.moveTo(0,-16);c.lineTo(0,17);c.lineTo(11,5);c.lineTo(15,-9);c.closePath();c.fill();}c.restore();};
 Object.entries(details.meters).forEach(([name,value],i)=>{
  const x=77+i*187,tint=colors[i];if(i){c.strokeStyle=cyan;c.globalAlpha=.5;c.lineWidth=1;c.beginPath();c.moveTo(x-8,1130);c.lineTo(x-8,1261);c.stroke();c.globalAlpha=1;}
  glow(tint,7,()=>icon(i,x+23,1144,tint));text(name.toUpperCase(),x+50,1151,19,white,126);
  round(x,1175,172,43,21,ink,color('--pb-collectible-edge'),2);
  for(let segment=0;segment<10;segment++){
   const amount=Math.max(0,Math.min(1,value/10-segment)),sx=x+8+segment*15.7;
   c.save();c.translate(sx,1182);c.transform(1,0,-.12,1,0,0);round(0,0,12,29,5,color('--pb-collectible-dim'));
   if(amount>0){c.save();c.beginPath();c.rect(0,0,12*amount,29);c.clip();glow(tint,12,()=>round(0,0,12,29,5,gradient(0,0,12,29,[white,tint,tint]),tint,1));c.restore();}c.restore();
  }
  text((value/10).toFixed(1),x+75,1253,29,white,80,false,'center');text('/ 10',x+113,1251,17,color('--pb-collectible-muted'));
 });
 c.restore();
 text('picklebash.app',540,1273,30,white,600,false,'center');
 for(const [x,y,r] of [[60,63,18],[1015,58,17],[1034,1283,20],[440,27,12]])glow(cyan,15,()=>star(x,y,r));
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not export your card. Please try again.')),'image/png'));
}
