import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {dressAthlete} from '../src/athlete-options';
import {LOOKS,applyPresentation} from '../src/player-looks';
import {APPEARANCE_OPTIONS,newPlayer,validatePlayer,parseLibrary} from '../src/player-design';
const bytes=readFileSync(new URL('../public/models/riley/riley.glb',import.meta.url));
const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
test('every wardrobe option fits the production skeleton with finite geometry and independent source meshes',()=>{
 const cases=[...LOOKS.map(l=>l.appearance),...Object.entries(APPEARANCE_OPTIONS).flatMap(([key,values])=>values.map(value=>({...LOOKS[0].appearance,[key]:value})))];
 for(const appearance of cases){
  const model=clone(asset.scene);model.rotation.y=Math.PI;dressAthlete(model,appearance);model.updateMatrixWorld(true);
  model.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.computeBoundingBox();const bounds=o.geometry.boundingBox!;assert.ok([...bounds.min,...bounds.max].every(Number.isFinite),`${JSON.stringify(appearance)} ${o.name}`)}if(o.userData.option)assert.ok(o.parent instanceof THREE.Bone,`${o.name} follows a bone`)});
  if(appearance.top!=='tank')assert.ok(model.getObjectByName(`option-top-${appearance.top}`));
  if(appearance.hat!=='none')assert.ok(model.getObjectByName(`option-hat-${appearance.hat}`));
  if(appearance.glasses!=='none')assert.ok(model.getObjectByName(`option-glasses-${appearance.glasses}`));
  for(const name of ['top','bottom','hair'])if((name==='top'&&appearance.top!=='tank')||(name==='bottom'&&appearance.bottom!=='skirt')||(name==='hair'&&appearance.hairStyle!=='ponytail'))model.traverse(o=>{if(o.userData.module_slot===name)assert.equal(o.visible,false)});
 }
 asset.scene.traverse(o=>{assert.equal(o.visible,true);assert.equal(o.userData.ownedGeometry,undefined)});
});
test('all eight looks round-trip and legacy players receive independent bottom colors',()=>{
 const players=LOOKS.map((look,i)=>validatePlayer({...newPlayer(String(i)),name:look.name,appearance:look.appearance}));
 assert.deepEqual(parseLibrary(JSON.stringify({version:1,activeId:null,players})).players,players);
 const legacy=JSON.parse(JSON.stringify(players[0]));delete legacy.appearance.presentation;delete legacy.appearance.bottomColor;
 const loaded=validatePlayer(legacy);assert.equal(loaded.appearance.bottomColor,legacy.appearance.accent);assert.equal(loaded.appearance.presentation,'boy');
 assert.throws(()=>validatePlayer({...players[0],appearance:{...players[0].appearance,bottomColor:'bad'}}));
 assert.equal(new Set(LOOKS.map(l=>JSON.stringify(l.appearance))).size,8);
});
test('boy and girl starting styles preserve colors and allow all accessories',()=>{
 for(const style of APPEARANCE_OPTIONS.presentation){const a=applyPresentation({...LOOKS[2].appearance,hat:'bucket'},style);assert.equal(a.presentation,style);assert.equal(a.glasses,'square');assert.equal(a.hat,'bucket');assert.equal(a.skin,LOOKS[2].appearance.skin);assert.equal(a.bottomColor,LOOKS[2].appearance.bottomColor)}
});

test('both shorts lengths enclose the covered thigh vertices through leg poses',()=>{
 for(const bottom of ['shorts','long-shorts'] as const)for(const angle of [0,-.055,.35,-.35]){
  const model=clone(asset.scene);dressAthlete(model,{...LOOKS[1].appearance,bottom});
  for(const side of ['L','R'])model.getObjectByName(`thigh${side}`)!.rotateZ(side==='L'?angle:-angle);
  model.updateMatrixWorld(true);
  const body=model.getObjectByName('body_base') as THREE.SkinnedMesh;body.skeleton.update();
  const {position,skinIndex,skinWeight}=body.geometry.attributes;
  for(const side of ['L','R']){
   const shorts=model.getObjectByName(`option-short-leg-${side}`)!.children[0] as THREE.Mesh;
   shorts.geometry.computeBoundingBox();const bounds=shorts.geometry.boundingBox!;let checked=0;
   for(let i=0;i<position.count;i++){
    if(![0,1,2,3].some(j=>body.skeleton.bones[skinIndex.getComponent(i,j)].name===`thigh${side}`&&skinWeight.getComponent(i,j)>.5))continue;
    const v=new THREE.Vector3().fromBufferAttribute(position,i);body.applyBoneTransform(i,v);shorts.worldToLocal(body.localToWorld(v));
    if(v.y<bounds.min.y+.015||v.y>bounds.max.y-.015)continue;
    checked++;assert.ok(v.x>bounds.min.x+.010&&v.x<bounds.max.x-.010,`${bottom} ${side} thigh clears side corners`);
    assert.ok(v.z>bounds.min.z+.010&&v.z<bounds.max.z-.010,`${bottom} ${side} thigh clears front and back`);
   }
   assert.ok(checked>0,'checks actual covered thigh vertices');
  }
 }
});

test('shorter neck lowers the head without scaling the face or its accessories',()=>{
 const model=clone(asset.scene),head=model.getObjectByName('head')!,neck=model.getObjectByName('neck')!;
 model.updateMatrixWorld(true);
 const before=head.getWorldPosition(new THREE.Vector3()),neckPosition=neck.getWorldPosition(new THREE.Vector3()),scale=head.getWorldScale(new THREE.Vector3());
 dressAthlete(model,{...LOOKS[2].appearance,hat:'none',glasses:'hexagon'});model.updateMatrixWorld(true);
 const after=head.getWorldPosition(new THREE.Vector3());
 assert.ok(Math.abs(after.distanceTo(neckPosition)/before.distanceTo(neckPosition)-.7)<1e-6);
 assert.ok(head.getWorldScale(new THREE.Vector3()).distanceTo(scale)<1e-6);
 assert.ok(after.y<before.y);
 const glasses=model.getObjectByName('option-glasses-hexagon')!;
 assert.ok(glasses.getWorldScale(new THREE.Vector3()).distanceTo(new THREE.Vector3(1,1,1))<1e-6);
});

test('shoe styles and frame colors survive saving, with defaults for existing players',()=>{
 for(const shoeStyle of APPEARANCE_OPTIONS.shoeStyle){
  const player=newPlayer('wardrobe');player.appearance={...player.appearance,shoeStyle,glasses:'cat-eye',glassesColor:'#ed8d3c',lensColor:'#ac7bd8',hairStyle:'mohawk'};
  assert.deepEqual(validatePlayer(JSON.parse(JSON.stringify(player))),player);
 }
 const legacy=JSON.parse(JSON.stringify(newPlayer('legacy')));delete legacy.appearance.shoeStyle;delete legacy.appearance.glassesColor;delete legacy.appearance.lensColor;
 assert.equal(validatePlayer(legacy).appearance.lensColor,'#b7dce5');
 assert.equal(validatePlayer(legacy).appearance.shoeStyle,'court');assert.equal(validatePlayer(legacy).appearance.glassesColor,'#25272d');
 assert.throws(()=>validatePlayer({...legacy,appearance:{...legacy.appearance,glassesColor:'orange'}}));
});


test('expressions replace original eyes and mouth, and paddles retain their grip',()=>{
 for(const expression of APPEARANCE_OPTIONS.expression){
  const model=clone(asset.scene);dressAthlete(model,{...LOOKS[0].appearance,expression});
  assert.ok(model.getObjectByName(`option-expression-${expression}`));
  model.getObjectByName('head_base')!.traverse(o=>{if(o instanceof THREE.Mesh&&['MAT_grip','MAT_mouth','MAT_tongue'].includes((o.material as THREE.Material).name))assert.equal(o.visible,false)});
 }
 for(const paddleShape of APPEARANCE_OPTIONS.paddleShape){
  const model=clone(asset.scene);dressAthlete(model,{...LOOKS[0].appearance,paddleShape});
  assert.ok(model.getObjectByName(`option-paddle-${paddleShape}`));
  model.getObjectByName('paddle_01')!.traverse(o=>{if(o instanceof THREE.Mesh)assert.equal(o.visible,(o.material as THREE.Material).name==='MAT_grip')});
  const player=newPlayer('shapes');player.appearance={...player.appearance,paddleShape,expression:'confident'};assert.deepEqual(validatePlayer(JSON.parse(JSON.stringify(player))),player);
 }
 const legacy=JSON.parse(JSON.stringify(newPlayer('legacy')));delete legacy.appearance.expression;delete legacy.appearance.paddleShape;
 assert.equal(validatePlayer(legacy).appearance.expression,'happy');assert.equal(validatePlayer(legacy).appearance.paddleShape,'rectangular');
});

test('new facial hair is optional for legacy saves and colors survive round trips',()=>{
 const legacy=JSON.parse(JSON.stringify(newPlayer('legacy')));delete legacy.appearance.facialHair;delete legacy.appearance.facialHairColor;
 assert.equal(validatePlayer(legacy).appearance.facialHair,'none');assert.equal(validatePlayer(legacy).appearance.facialHairColor,legacy.appearance.hair);
 for(const facialHair of APPEARANCE_OPTIONS.facialHair){const player=newPlayer('wardrobe');Object.assign(player.appearance,{facialHair,facialHairColor:'#aa6633',hat:'crown',top:'long-sleeve',bottom:'pants'});assert.deepEqual(validatePlayer(player).appearance,player.appearance);}
 assert.throws(()=>validatePlayer({...legacy,appearance:{...legacy.appearance,facialHairColor:'bad'}}));
});

test('patterned paddles use trim color on both faces and attach to the paddle socket',()=>{
 for(const paddleShape of APPEARANCE_OPTIONS.paddleShape.filter(s=>s.includes('-'))){
  const model=clone(asset.scene);dressAthlete(model,{...LOOKS[0].appearance,paddleShape,paddle:'#ff3388'});
  const group=model.getObjectByName(`option-paddle-${paddleShape}`)!;assert.ok(group.parent instanceof THREE.Bone);
  for(const side of [-1,1]){const face=group.getObjectByName(`paddle-pattern-${paddleShape.split('-')[1]}-${side}`)!;assert.ok(face);assert.equal(face.children.length>0,true);face.traverse(o=>{if(o instanceof THREE.Mesh)assert.equal((o.material as THREE.MeshStandardMaterial).color.getHexString(),'ff3388')});}
 }
});
