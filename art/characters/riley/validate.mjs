import fs from 'node:fs';
import assert from 'node:assert/strict';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';
const root = new URL('../../../', import.meta.url);
const reports=[];
for (const file of ['riley','glasses','hat_visor']) {
  const bytes=fs.readFileSync(new URL(`public/models/riley/${file}.glb`,root));
  assert.equal(bytes.toString('ascii',0,4),'glTF');
  const json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
  assert.equal(json.asset.version,'2.0');
  assert.ok(!json.images?.length,'No texture dependencies');
  assert.ok(json.buffers.every(b=>!b.uri),'Self-contained binary');
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  gltf.scene.updateMatrixWorld(true);
  let triangles=0,vertices=0,skinnedMeshes=0; const slots=new Set(); const materials=new Set();
  const bones=new Set();
  gltf.scene.traverse(o=>{
    if(o.isBone) bones.add(o.name);
    if(o.userData.module_slot) slots.add(o.userData.module_slot);
    if(!o.isMesh)return;
    assert.ok(o.isSkinnedMesh,`${o.name} must be skinned`);skinnedMeshes++;
    const g=o.geometry;triangles+=(g.index?.count??g.attributes.position.count)/3;
    const w=g.attributes.skinWeight, j=g.attributes.skinIndex;
    assert.ok(w&&j,'Joint attributes');vertices+=w.count;
    for(let i=0;i<w.count;i++) {
      const a=[w.getX(i),w.getY(i),w.getZ(i),w.getW(i)];
      assert.ok(Math.abs(a.reduce((x,y)=>x+y,0)-1)<1e-5,`${o.name} normalized weights`);
      for(const index of [j.getX(i),j.getY(i),j.getZ(i),j.getW(i)])assert.ok(index<o.skeleton.bones.length);
    }
    for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m.name);
    // Bind-pose skinning must reproduce the original vertex positions.
    o.skeleton.update();
    for(let i=0;i<g.attributes.position.count;i+=19){
      const p=new Vector3().fromBufferAttribute(g.attributes.position,i);
      assert.ok(o.applyBoneTransform(i,p.clone()).distanceTo(p)<1e-4,`${o.name} bind pose drift`);
    }
  });
  const size=new Box3().setFromObject(gltf.scene).getSize(new Vector3());
  if(file==='riley') {
    assert.ok(triangles>=8000&&triangles<=15000,'Character triangle budget');
    assert.ok(size.y>1.8&&size.y<2.1,'Metre-scale upright character');
    for(const slot of ['body','head_face','hair','eyebrows','top','bottom','socks','shoes','wrist_accessory','paddle'])assert.ok(slots.has(slot),slot);
    for(const bone of ['root','pelvis','spine','chest','neck','head','paddle_socket'])assert.ok(bones.has(bone),bone);
  }
  reports.push({file,triangles,vertices,skinnedMeshes,bones:bones.size,slots:[...slots],materials:[...materials],boundsMetres:size.toArray(),bindPose:'PASS',weights:'PASS'});
}
fs.writeFileSync(new URL('art/characters/riley/export-validation.json',root),JSON.stringify(reports,null,2));
console.log(JSON.stringify(reports,null,2));
