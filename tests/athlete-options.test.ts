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
